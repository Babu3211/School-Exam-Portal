"""Create-only V46 password-account import into V47. No source writes.
Uses Google Identity Toolkit batchCreate with duplicate checks and overwrite false.
No plaintext passwords, no privileges, no membership/Firestore writes.
"""
import base64,getpass,json,subprocess,sys,os,warnings
from pathlib import Path
from importlib.machinery import SourceFileLoader
import requests
SOURCE="exam-portal-smss-95016"
TARGET="smss-exam-portal-v47"
SID="300160003"
def b64(v,empty=False):
    if not isinstance(v,str) or v.upper()=="REDACTED":raise ValueError("Missing or redacted credential encoding")
    raw=base64.b64decode(v+"="*((-len(v))%4),altchars=b"-_",validate=True)
    if not raw and not empty:raise ValueError("Empty credential encoding")
    return base64.b64encode(raw).decode("ascii")
def index(users):
    ids={};emails={}
    for u in users:
        uid=u.get("localId");email=u.get("email")
        if not isinstance(uid,str) or not uid or not isinstance(email,str) or not email.strip():raise ValueError("Unsupported account identity")
        if uid in ids or email.casefold() in emails:raise ValueError("Duplicate account identity")
        ids[uid]=u;emails[email.casefold()]=u
    return ids,emails
def claims(u):
    v=u.get("customAttributes") or "{}"
    return json.loads(v)
def stable(u):
    return (u["localId"],u["email"],bool(u.get("disabled")),bool(u.get("emailVerified")),claims(u),u.get("phoneNumber") or "",u.get("mfaInfo") or [],sorted(x.get("providerId","") for x in u.get("providerUserInfo",[])))
def payload(u):
    if u.get("mfaInfo") or u.get("phoneNumber") or u.get("tenantId") or claims(u) or u.get("customAuth") or u.get("emailLinkSignin"):raise ValueError("Account needs separate provider/privilege review")
    providers=u.get("providerUserInfo") or []
    if any(x.get("providerId")!="password" for x in providers):raise ValueError("Non-password provider needs separate review")
    h=b64(u.get("passwordHash"));s=b64(u.get("salt"))
    if len(base64.b64decode(h))<16:raise ValueError("Unexpected password hash length")
    out={"localId":u["localId"],"email":u["email"],"passwordHash":h,"salt":s,"disabled":bool(u.get("disabled")),"emailVerified":bool(u.get("emailVerified"))}
    for k in ("displayName","photoUrl","createdAt","lastLoginAt"):
        if u.get(k):out[k]=u[k]
    return out
def plan(source,target):
    si,se=index(source);ti,te=index(target)
    new=[];collisions=[]
    for uid,u in si.items():
        if uid in ti or u["email"].casefold() in te:
            collisions.append(uid);continue
        new.append(payload(u))
    return new,collisions
def config(c):
    if c.get("algorithm")!="SCRYPT" or type(c.get("rounds")) is not int or type(c.get("memoryCost")) is not int:raise ValueError("Unsupported SCRYPT config")
    return {"hashAlgorithm":"SCRYPT","signerKey":b64(c.get("signerKey")),"saltSeparator":b64(c.get("saltSeparator",""),True),"rounds":c["rounds"],"memoryCost":c["memoryCost"]}
def self_test():
    u={"localId":"a","email":"a@example.test","passwordHash":"_"+("A"*43),"salt":"-w","providerUserInfo":[{"providerId":"password"}]}
    n,c=plan([u],[{"localId":"b","email":"A@example.test"}]);assert not n and c==["a"]
    n,c=plan([u],[]);assert len(n)==1 and not c
    assert b64("-w") == "+w=="
    assert n[0]["salt"]=="+w=="
    print("PASS URL-safe decoding and collision exclusion")
def main(path):
    if os.environ.get("CI") or os.environ.get("GITHUB_ACTIONS"):raise RuntimeError("Forbidden in CI")
    warnings.simplefilter("error",getpass.GetPassWarning)
    m=SourceFileLoader("migration",str(Path.home()/"smss-migration-check.py")).load_module()
    backup=m.open_backup(path,getpass.getpass("Backup passphrase: "))
    source=backup[SOURCE]["users"];original=backup[TARGET]["users"];hc=config(backup[SOURCE]["hashConfig"])
    if len(source)!=18 or len(original)!=2:raise ValueError("Unexpected snapshot counts")
    token=subprocess.check_output(["gcloud","auth","print-access-token"],text=True).strip()
    session=requests.Session()
    def call(project,url,body=None):
        if project not in (SOURCE,TARGET) or body is not None and project!=TARGET:raise RuntimeError("Wrong project/write")
        r=session.request("GET" if body is None else "POST",url,headers={"Authorization":"Bearer "+token,"x-goog-user-project":project},json=body,timeout=(10,90),allow_redirects=False)
        if r.status_code!=200:raise RuntimeError("API HTTP "+str(r.status_code)+"; inspect account inventory before retrying")
        return r.json()
    def users(project):
        j=call(project,"https://identitytoolkit.googleapis.com/v1/projects/"+project+"/accounts:batchGet?maxResults=1000")
        if j.get("nextPageToken"):raise RuntimeError("Unexpected account inventory size")
        return j.get("users",[])
    srcnow=users(SOURCE);si,_=index(source);li,_=index(srcnow)
    if set(si)!=set(li):raise RuntimeError("V46 Auth changed since backup; refresh required")
    for uid,u in si.items():
        v=li[uid]
        if stable(u)!=stable(v) or b64(u.get("passwordHash"))!=b64(v.get("passwordHash")) or b64(u.get("salt"))!=b64(v.get("salt")):raise RuntimeError("V46 credential or identity changed; refresh required")
    srcconf=call(SOURCE,"https://identitytoolkit.googleapis.com/admin/v2/projects/"+SOURCE+"/config").get("signIn",{})
    if config(srcconf.get("hashConfig") or srcconf.get("email",{}).get("hashConfig") or {})!=hc:raise RuntimeError("Source hash config changed")
    tc=call(TARGET,"https://identitytoolkit.googleapis.com/admin/v2/projects/"+TARGET+"/config").get("signIn",{})
    if tc.get("email",{}).get("enabled") is not True:raise RuntimeError("V47 Email/Password provider not enabled")
    api="https://firestore.googleapis.com/v1/projects/"+TARGET+"/databases/(default)/documents"
    school=call(TARGET,api+"/schools/"+SID).get("fields",{})
    if school.get("id")!={"stringValue":SID} or school.get("active")!={"booleanValue":False}:raise RuntimeError("Target school not verified inactive")
    mem=call(TARGET,api+"/schools/"+SID+"/members?pageSize=100")
    if mem.get("documents") or mem.get("nextPageToken"):raise RuntimeError("Unexpected existing school memberships")
    supers=call(TARGET,api+"/v47_super_admins?pageSize=100")
    if supers.get("nextPageToken"):raise RuntimeError("Unexpected Super Admin inventory")
    su={d["name"].rsplit("/",1)[1] for d in supers.get("documents",[])}
    target=users(TARGET);ti,te=index(target);oi,_=index(original)
    if set(ti)!=set(oi) or set(oi)!=su or any(stable(ti[k])!=stable(oi[k]) for k in oi):raise RuntimeError("Existing target Auth differs from original snapshot; no writes")
    new,collisions=plan(source,target)
    if len(new)!=16 or len(collisions)!=2:raise RuntimeError("Unexpected collision count")
    print("SOURCE AUTH VERIFIED UNCHANGED:",len(si))
    print("CREATE ONLY AUTH:",len(new),"SKIP EXISTING SUPER ADMINS:",len(collisions))
    print("NO MEMBERSHIPS OR PRIVILEGES WILL BE CREATED")
    if input("Type IMPORT-V47-AUTH to proceed: ").strip()!="IMPORT-V47-AUTH":raise RuntimeError("Not confirmed")
    fresh=users(TARGET);fi,_=index(fresh)
    if set(fi)!=set(ti) or any(stable(fi[k])!=stable(ti[k]) for k in ti):raise RuntimeError("Target accounts changed before import")
    body=dict(hc,users=new,sanityCheck=True,allowOverwrite=False)
    result=call(TARGET,"https://identitytoolkit.googleapis.com/v1/projects/"+TARGET+"/accounts:batchCreate",body)
    errors=result.get("error",[]) or result.get("errors",[])
    after=users(TARGET);ai,_=index(after)
    good=0
    for u in new:
        v=ai.get(u["localId"])
        if v and v.get("email")==u["email"] and bool(v.get("disabled"))==u["disabled"] and bool(v.get("emailVerified"))==u["emailVerified"] and not claims(v):good+=1
    preserved=sum(k in ai and stable(ai[k])==stable(ti[k]) for k in ti)
    print("NEW AUTH IDENTITIES VERIFIED:",good,"/",len(new))
    print("EXISTING SUPER ADMIN IDENTITIES PRESERVED:",preserved,"/",len(ti))
    print("IMPORT ERRORS:",len(errors))
    if errors or good!=len(new) or preserved!=len(ti) or set(ai)!=(set(ti)|{u["localId"] for u in new}):raise RuntimeError("Import verification incomplete; do not rerun blindly")
    print("AUTH IMPORT VERIFIED: 16")
    print("V46 WRITES: ZERO; EXISTING AUTH OVERWRITES: ZERO; MEMBERSHIP CHANGES: ZERO; SCHOOL ACTIVE: FALSE")
    print("Password sign-in requires separate real-user test; two existing email collisions remain unresolved.")
if __name__=="__main__":
    try:
        if sys.argv[1:]==["--self-test"]:self_test()
        elif len(sys.argv)==2:main(Path(sys.argv[1]).expanduser())
        else:raise ValueError("Specify encrypted backup")
    except (Exception,KeyboardInterrupt) as e:
        # Never print HTTP responses, account identities, or credential bytes.
        print("AUTH IMPORT STOPPED:",type(e).__name__,str(e) if isinstance(e,RuntimeError) else "",file=sys.stderr)
        sys.exit(1)
