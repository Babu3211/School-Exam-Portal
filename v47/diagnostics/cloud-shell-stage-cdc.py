"""Preserve V46 CDC and historical roles, and audit Auth identities without
importing accounts or creating memberships. Only the inactive target school
is written, create-only; no V46 writes or target account changes.
"""
import base64,getpass,hashlib,importlib.util,json,os,re,subprocess,sys,warnings
from collections import Counter
from pathlib import Path
import requests
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.scrypt import Scrypt
spec=importlib.util.spec_from_file_location("academic",Path.home()/"smss-academic.py")
a=importlib.util.module_from_spec(spec);spec.loader.exec_module(a)
sub=a.sub;m=a.m;BASE=a.BASE
COLLS=("cdc_observations","cdc_serofero_indicators","user_roles")
def decode_array(f,k):
    values=f.get(k,{}).get("arrayValue",{}).get("values",[])
    if not isinstance(values,list):raise ValueError("Invalid array")
    return values
def auth_audit(source,target,groups,subjectdocs,admin_uid,superuids):
    roles={};c=Counter();assignment_counts=Counter()
    src={u["localId"]:u for u in source["users"]}
    if len(src)!=len(source["users"]):raise ValueError("Duplicate source Auth")
    t_uid={u["localId"]:u for u in target}
    t_email={u["email"].casefold():u for u in target if isinstance(u.get("email"),str) and u["email"]}
    if admin_uid not in src:raise ValueError("V46 administrator not found in source backup")
    catalog={(m.scalar(f,"class"),sub.subject_key(m.scalar(f,"name"))):k.rsplit("/",1)[1] for k,f in subjectdocs.items() if "/subjects/" in k}
    for d in groups.get("user_roles",[]):
        f=d["fields"];uid=m.scalar(f,"uid")
        if uid not in src or uid in roles:raise ValueError("Role/Auth mapping mismatch")
        if d["name"].rsplit("/",1)[1]!=uid:raise ValueError("Role document UID mismatch")
        values=decode_array(f,"roles")
        names={x.get("stringValue") for x in values}
        if not names or not names<= {"class_teacher","subject_teacher","viewer","exam_officer","accountant"}:raise ValueError("Unknown role")
        roles[uid]=names
        if m.scalar(f,"active") is not True:c["inactive_or_unverified_role"]+=1
        if "viewer" in names and names & {"class_teacher","subject_teacher"}:c["mixed_viewer_teacher_needs_review"]+=1
        for item in decode_array(f,"subjectAssignments"):
            af=item.get("mapValue",{}).get("fields",{})
            assignment_counts["subject_assignment_rows"]+=1
            try:
                cls=m.canonical_class(m.scalar(af,"className"));name=m.scalar(af,"subject")
                if not isinstance(name,str) or (cls,sub.subject_key(name)) not in catalog:raise ValueError("Unknown assignment subject")
                if str(m.scalar(af,"section") or "").strip():assignment_counts["section_specific"]+=1
                assignment_counts["subject_assignment_catalog_match"]+=1
            except ValueError:assignment_counts["subject_assignment_review"]+=1
        assignment_counts["class_teacher_assignment_rows"]+=len(decode_array(f,"classTeacherClasses"))
    for uid,u in src.items():
        email=u.get("email","")
        t=t_email.get(email.casefold()) if isinstance(email,str) and email else None
        other=t_uid.get(uid)
        if t or other:
            c["existing_target_identity"]+=1
            if t and t["localId"]!=uid:c["different_uid_same_email"]+=1
            if t and t["localId"] in superuids:c["collision_with_super_admin"]+=1
            if uid==admin_uid:c["source_admin_collision"]+=1
        else:
            c["new_auth_candidates"]+=1
            if uid==admin_uid:c["source_admin_new_account"]+=1
        if uid!=admin_uid and uid not in roles:c["unassigned_non_admin"]+=1
        if u.get("disabled"):c["disabled_source_accounts"]+=1
        try:
            h=base64.b64decode(u.get("passwordHash",""),validate=True)
            salt=base64.b64decode(u.get("salt",""),validate=True)
            if len(h)>=16 and salt and u.get("passwordHash")!="REDACTED":c["valid_encoded_hash_and_salt"]+=1
        except (ValueError,TypeError):pass
    hc=source.get("hashConfig",{})
    config_ok=False
    try:
        config_ok=(hc.get("algorithm")=="SCRYPT" and bool(base64.b64decode(hc["signerKey"],validate=True)) and isinstance(hc.get("rounds"),int) and isinstance(hc.get("memoryCost"),int))
    except (KeyError,ValueError,TypeError):pass
    print("SOURCE AUTH:",len(src),"LIVE TARGET AUTH:",len(target))
    print("AUTH REVIEW:",json.dumps(dict(c),sort_keys=True))
    print("SOURCE FIREBASE SCRYPT CONFIG VALID:",config_ok)
    print("ASSIGNMENT REVIEW:",json.dumps(dict(assignment_counts),sort_keys=True))
    print("NO PASSWORD HASHES, EMAILS OR UID VALUES DISPLAYED")
def project(groups):
    out={}
    for coll in COLLS:
        for d in groups.get(coll,[]):
            f=a.scoped(d)
            n=d["name"];prefix=m.root(m.SOURCE)+"/"+coll+"/"
            if not n.startswith(prefix) or "/" in n[len(prefix):]:raise ValueError("Unexpected nested CDC/role path")
            id=n[len(prefix):]
            if not id or len(id.encode())>1500 or id in (".",".."):raise ValueError("Invalid document ID")
            dest=BASE+"/"+coll+"/"+id
            if dest in out:raise ValueError("Duplicate legacy destination")
            # Do not turn any archived role into actual V47 membership.
            out[dest]=f
        print("PLANNED",coll,len(groups.get(coll,[])))
    return out
def self_test():
    f={"theme":m.string("हाम्रो सेरोफेरो"),"scores":{"arrayValue":{"values":[{"integerValue":"3"}]}}}
    d={"name":m.root(m.SOURCE)+"/cdc_observations/sample","fields":f}
    p=project({"cdc_observations":[d]})
    assert p[BASE+"/cdc_observations/sample"]==dict(f,schoolId=m.string(m.SID))
    assert all("/members/" not in k for k in p)
    print("PASS CDC source preservation, tenant scope and no membership creation")
def main(path):
    if os.environ.get("CI") or os.environ.get("GITHUB_ACTIONS"):raise RuntimeError("Live migration forbidden in CI")
    warnings.simplefilter("error",getpass.GetPassWarning)
    raw=path.read_bytes();magic=b"SMSS-MIGRATION-V1";n=len(magic)
    if len(raw)>97*1024*1024 or not raw.startswith(magic):raise ValueError("Invalid backup")
    key=Scrypt(salt=raw[n:n+16],length=32,n=2**17,r=8,p=1).derive(getpass.getpass("Backup passphrase: ").encode())
    backup=json.loads(AESGCM(key).decrypt(raw[n+16:n+28],raw[n+28:],raw[:n+28]))
    staged,archive,total,groups=m.plan(backup)
    subjectdocs,_=sub.catalog(groups)
    academic=a.plan(groups,staged,subjectdocs)
    out=project(groups)
    # Pinned latest inspected V46 main, used only to verify original hardcoded
    # admin identity locally; no account data is sent to GitHub.
    url="https://raw.githubusercontent.com/Babu3211/School-Exam-Portal/82b01c45354e6a750ed1ab545deb6b15881eafaf/index.html"
    src=requests.get(url,timeout=(10,60));src.raise_for_status()
    match=re.search(r"""const ADMIN_UID\s*=\s*["']([^"']+)["']""",src.text)
    if not match:raise RuntimeError("V46 admin source unavailable")
    token=subprocess.check_output(["gcloud","auth","print-access-token"],text=True).strip()
    session=requests.Session();headers={"Authorization":"Bearer "+token,"x-goog-user-project":m.TARGET}
    def call(url,body=None):
        r=session.request("GET" if body is None else "POST",url,headers=headers,json=body,timeout=(10,90),allow_redirects=False)
        if r.status_code!=200:raise RuntimeError("Target API HTTP "+str(r.status_code))
        return r.json()
    rb="https://firebaserules.googleapis.com/v1/"
    release=call(rb+"projects/"+m.TARGET+"/releases/cloud.firestore");name=release.get("rulesetName","")
    if not name.startswith("projects/"+m.TARGET+"/rulesets/"):raise RuntimeError("Unexpected ruleset")
    fs=call(rb+name).get("source",{}).get("files",[])
    if len(fs)!=1:raise RuntimeError("Unexpected rules sources")
    b=fs[0]["content"].encode()
    if hashlib.sha1(("blob "+str(len(b))+"\0").encode()+b).hexdigest()!=m.RULES_BLOB:raise RuntimeError("Live rules differ")
    api="https://firestore.googleapis.com/v1/"+m.root(m.TARGET)
    def read(names):
        values={}
        for item in call(api+":batchGet",{"documents":names}):
            d=item.get("found");name=d["name"] if d else item.get("missing")
            if name not in names or name in values:raise RuntimeError("Unexpected identity")
            values[name]=d.get("fields",{}) if d else None
        if set(values)!=set(names):raise RuntimeError("Incomplete read")
        return values
    manifest=read([archive])[archive]
    if not manifest or manifest.get("state")!=m.string("ARCHIVE_VERIFIED_NOT_OPERATIONAL") or manifest.get("documentCount")!={"integerValue":str(total)}:raise RuntimeError("Archive manifest not verified")
    prereq={**staged,**subjectdocs,**academic};keys=sorted(prereq)
    for i in range(0,len(keys),50):
        for name,fields in read(keys[i:i+50]).items():
            if not sub.same_field(fields,prereq[name]):raise RuntimeError("Staged prerequisite differs")
    target=call("https://identitytoolkit.googleapis.com/v1/projects/"+m.TARGET+"/accounts:batchGet?maxResults=1000")
    if target.get("nextPageToken"):raise RuntimeError("Target account inventory exceeds review bound")
    supers=call(api+"/v47_super_admins?pageSize=100")
    if supers.get("nextPageToken"):raise RuntimeError("Super Admin inventory exceeds review bound")
    superuids={d["name"].rsplit("/",1)[1] for d in supers.get("documents",[])}
    auth_audit(backup[m.SOURCE],target.get("users",[]),groups,subjectdocs,match.group(1),superuids)
    print("STORAGE REFERENCE DOCUMENTS:",sum(any(x in json.dumps(d.get("fields",{})) for x in ("firebasestorage.googleapis.com","gs://","storage.googleapis.com")) for d in backup[m.SOURCE]["documents"]))
    for coll in COLLS:
        r=call(api+"/schools/"+m.SID+"/"+coll+"?pageSize=300")
        if r.get("nextPageToken") or any(d["name"] not in out for d in r.get("documents",[])):raise RuntimeError("Unrelated target CDC/role records")
    def check(batch):
        vals=read(batch)
        for n,v in vals.items():
            if v is not None and not sub.same_field(v,out[n]):raise RuntimeError("Existing legacy record differs; no overwrite")
        return [n for n in batch if vals[n] is None]
    names=sorted(out);batches=[names[i:i+40] for i in range(0,len(names),40)]
    missing=[]
    for batch in batches:missing.extend(check(batch))
    print("CREATE ONLY:",len(missing),"ALREADY IDENTICAL:",len(names)-len(missing))
    if missing and input("Type STAGE-V47-CDC to proceed: ").strip()!="STAGE-V47-CDC":raise RuntimeError("Not confirmed")
    for i in range(0,len(missing),40):
        chunk=missing[i:i+40]
        if any(not any(n.startswith(BASE+"/"+c+"/") for c in COLLS) for n in chunk):raise RuntimeError("Wrong destination")
        r=call(api+":commit",{"writes":[{"update":{"name":n,"fields":out[n]},"currentDocument":{"exists":False}} for n in chunk]})
        if len(r.get("writeResults",[]))!=len(chunk):raise RuntimeError("Incomplete commit")
        print("STAGED:",min(i+40,len(missing)),"/",len(missing),flush=True)
    for batch in batches:
        if check(batch):raise RuntimeError("Verification incomplete")
    print("CDC AND LEGACY ROLE STAGED VERIFIED:",len(names))
    print("V46 WRITES: ZERO; AUTH CHANGES: ZERO; MEMBERSHIP CHANGES: ZERO; SCHOOL ACTIVE: FALSE")
if __name__=="__main__":
    try:
        if sys.argv[1:]==["--self-test"]:self_test()
        elif len(sys.argv)==2:main(Path(sys.argv[1]).expanduser())
        else:raise ValueError("Specify encrypted backup")
    except (Exception,KeyboardInterrupt) as e:
        print("CDC STAGE STOPPED:",type(e).__name__,str(e) if isinstance(e,(ValueError,RuntimeError)) else "",file=sys.stderr)
        sys.exit(1)
