"""Cloud Shell operator: only V47 existing school admin membership.
Use gcloud user access token directly; no Firebase Admin SDK or Auth writes.
"""
import json, os, subprocess, sys, urllib.request, urllib.error

PROJECT="smss-exam-portal-v47"
SID="300160003"
ROOT="projects/"+PROJECT+"/databases/(default)/documents"
FS="https://firestore.googleapis.com/v1/"
AUTH="https://identitytoolkit.googleapis.com/v1/projects/"+PROJECT+"/accounts:batchGet?maxResults=1000"
def run(call,root_email,admin_email,apply):
    emails=[v.strip().casefold() for v in (root_email,admin_email)]
    if not all(emails) or emails[0]==emails[1]:raise ValueError("Two distinct existing emails required")
    accounts=call(AUTH)
    if accounts.get("nextPageToken"):raise ValueError("Account inventory exceeds safety limit")
    users=accounts.get("users",[])
    matches=[[u for u in users if str(u.get("email","")).casefold()==e] for e in emails]
    if any(len(x)!=1 for x in matches):raise ValueError("Existing Auth email not uniquely verified")
    root,admin=[x[0] for x in matches]
    if any(u.get("disabled",False) or not u.get("localId") or "/" in u["localId"] for u in (root,admin)) or root["localId"]==admin["localId"]:raise ValueError("Distinct enabled Auth accounts required")
    uid=admin["localId"]
    names=[ROOT+"/schools/"+SID,ROOT+"/v47_super_admins/"+root["localId"],ROOT+"/v47_super_admins/"+uid,ROOT+"/schools/"+SID+"/members/"+uid]
    base=FS+ROOT
    tx=call(base+":beginTransaction",{"options":{"readWrite":{}}})["transaction"]
    committing=False
    try:
        result=call(base+":batchGet",{"documents":names,"transaction":tx})
        if not isinstance(result,list):raise ValueError("Unexpected batch response")
        docs={}
        for row in result:
            found=row.get("found")
            name=found["name"] if found else row.get("missing")
            if name not in names or name in docs:raise ValueError("Unexpected document identity")
            docs[name]=found
        if set(docs)!=set(names):raise ValueError("Incomplete transaction read")
        string=lambda s:{"stringValue":s}
        boolean=lambda b:{"booleanValue":b}
        school,r,a,m=[docs[n] for n in names]
        if not school or school["fields"].get("id")!=string(SID) or school["fields"].get("active")!=boolean(True):raise ValueError("Canonical active school not verified")
        if any(not x or x["fields"].get("active")!=boolean(True) for x in (r,a)):raise ValueError("Both existing Super Admin roles must be active")
        expected={"uid":string(uid),"schoolId":string(SID),"role":string("school_admin"),"active":boolean(True)}
        if m:
            f=m["fields"]
            if any(f.get(k)!=expected[k] for k in ("uid","schoolId","role")) or f.get("active") not in (boolean(False),boolean(True)):raise ValueError("Conflicting membership: no overwrite")
            if f["active"]==boolean(True):return "ALREADY_ACTIVE"
            write={"update":{"name":names[3],"fields":{"active":boolean(True)}},"updateMask":{"fieldPaths":["active"]},"currentDocument":{"updateTime":m["updateTime"]}}
            status="ACTIVATED"
        else:
            write={"update":{"name":names[3],"fields":expected},"currentDocument":{"exists":False}}
            status="CREATED"
        if not apply:return "WOULD_"+("ACTIVATE" if m else "CREATE")
        committing=True
        result=call(base+":commit",{"writes":[write],"transaction":tx})
        if len(result.get("writeResults",[]))!=1:raise ValueError("Commit response uncertain; review before retry")
        return status
    finally:
        if not committing:call(base+":rollback",{"transaction":tx})
def self_test():
    root,admin="root123","admin123"
    s=lambda v:{"stringValue":v}
    b=lambda v:{"booleanValue":v}
    paths=[ROOT+"/schools/"+SID,ROOT+"/v47_super_admins/"+root,ROOT+"/v47_super_admins/"+admin,ROOT+"/schools/"+SID+"/members/"+admin]
    data={paths[0]:{"id":s(SID),"active":b(True)},paths[1]:{"active":b(True)},paths[2]:{"active":b(True)}}
    writes=[]
    def fake(url,body=None):
        if url==AUTH:return {"users":[{"localId":root,"email":"r@example.test"},{"localId":admin,"email":"a@example.test"}]}
        if url.endswith(":beginTransaction"):return {"transaction":"test"}
        if url.endswith(":batchGet"):return [{"found":{"name":n,"fields":data[n],"updateTime":"2026-11-28T00:00:00Z"}} if n in data else {"missing":n} for n in body["documents"]]
        if url.endswith(":rollback"):return {}
        if url.endswith(":commit"):
            w=body["writes"][0];assert w["update"]["name"]==paths[3]
            writes.append(w);data.setdefault(paths[3],{}).update(w["update"]["fields"])
            return {"writeResults":[{}]}
        raise AssertionError("Unexpected API")
    args=(fake,"r@example.test","a@example.test")
    assert run(*args,False)=="WOULD_CREATE" and not writes
    assert run(*args,True)=="CREATED" and len(writes)==1
    assert run(*args,True)=="ALREADY_ACTIVE" and len(writes)==1
    data[paths[3]]["active"]=b(False)
    data[paths[3]]["extra"]=s("preserve")
    assert run(*args,True)=="ACTIVATED" and data[paths[3]]["extra"]==s("preserve")
    data[paths[3]]["role"]=s("teacher")
    try:run(*args,True)
    except ValueError:pass
    else:raise AssertionError("Conflicting role accepted")
    assert len(writes)==2
    print("PASS: membership-only create/activate, conflict rejection and repeat safety")
def main():
    if sys.argv[1:]==["--self-test"]:return self_test()
    if sys.argv[1:] not in (["--review"],["--apply"]):raise ValueError("Explicit review or apply required")
    if os.getenv("CI") or os.getenv("GITHUB_ACTIONS") or os.getenv("FIRESTORE_EMULATOR_HOST") or os.getenv("FIREBASE_AUTH_EMULATOR_HOST"):raise ValueError("Cloud Shell operator only")
    if os.getenv("V47_CONFIRM_PROJECT")!=PROJECT:raise ValueError("Confirm exact V47 project")
    token=subprocess.check_output(["gcloud","auth","print-access-token"],text=True).strip()
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self,*args,**kwargs):return None
    opener=urllib.request.build_opener(NoRedirect())
    def call(url,body=None):
        if url!=AUTH and url not in [FS+ROOT+x for x in (":beginTransaction",":batchGet",":commit",":rollback")]:raise ValueError("Unexpected API endpoint")
        req=urllib.request.Request(url,data=None if body is None else json.dumps(body).encode(),headers={"Authorization":"Bearer "+token,"x-goog-user-project":PROJECT,"Content-Type":"application/json"})
        try:
            with opener.open(req,timeout=60) as res:return json.load(res)
        except urllib.error.HTTPError as e:
            raise RuntimeError("API "+("Auth inventory" if url==AUTH else url.rsplit(":",1)[-1])+" HTTP "+str(e.code)) from None
    args=(call,os.getenv("V47_ROOT_EMAIL",""),os.getenv("V47_SCHOOL_ADMIN_EMAIL",""))
    result=run(*args,sys.argv[1]=="--apply")
    print("SCHOOL ADMIN MEMBERSHIP:",result)
    if sys.argv[1]=="--apply" and run(*args,False)!="ALREADY_ACTIVE":raise ValueError("Post-write verification failed; review before retry")
    print("V46 WRITES: ZERO; AUTH CHANGES: ZERO; SUPER ADMIN CHANGES: ZERO; ACADEMIC DATA CHANGES: ZERO")
if __name__=="__main__":
    try:main()
    except Exception as e:
        print("STOPPED:",str(e) if isinstance(e,(ValueError,RuntimeError)) else type(e).__name__,file=sys.stderr)
        sys.exit(1)
