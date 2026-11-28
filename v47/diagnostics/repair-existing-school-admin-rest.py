"""Cloud Shell operator: only V47 existing school admin membership.
Use gcloud user access token directly; no Firebase Admin SDK or Auth writes.
"""
import json, os, subprocess, sys, urllib.request, urllib.error

PROJECT="smss-exam-portal-v47"
SID="300160003"
ROOT="projects/"+PROJECT+"/databases/(default)/documents"
FS="https://firestore.googleapis.com/v1/"
AUTH="https://identitytoolkit.googleapis.com/v1/projects/"+PROJECT+"/accounts:batchGet?maxResults=1000"
def run(call,root_email,admin_email,apply,remove_extra_root=False):
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
        if not r or r["fields"].get("active")!=boolean(True):raise ValueError("Retained Super Admin must be active")
        if not a or a["fields"].get("active") not in (boolean(True),boolean(False)):raise ValueError("Existing extra Super Admin status not verified")
        if not remove_extra_root and a["fields"].get("active")!=boolean(True):raise ValueError("Both current Super Admin roles must be active for membership repair")
        expected={"uid":string(uid),"schoolId":string(SID),"role":string("school_admin"),"active":boolean(True)}
        if remove_extra_root:
            if not m or any(m["fields"].get(k)!=v for k,v in expected.items()):raise ValueError("Active exact School Admin membership required before root deactivation")
            if a["fields"]["active"]==boolean(False):return "ROOT_ALREADY_INACTIVE"
            write={"update":{"name":names[2],"fields":{"active":boolean(False)}},"updateMask":{"fieldPaths":["active"]},"currentDocument":{"updateTime":a["updateTime"]}}
            status="EXTRA_ROOT_DEACTIVATED"
        elif m:
            f=m["fields"]
            if any(f.get(k)!=expected[k] for k in ("uid","schoolId","role")) or f.get("active") not in (boolean(False),boolean(True)):raise ValueError("Conflicting membership: no overwrite")
            if f["active"]==boolean(True):return "ALREADY_ACTIVE"
            write={"update":{"name":names[3],"fields":{"active":boolean(True)}},"updateMask":{"fieldPaths":["active"]},"currentDocument":{"updateTime":m["updateTime"]}}
            status="ACTIVATED"
        else:
            write={"update":{"name":names[3],"fields":expected},"currentDocument":{"exists":False}}
            status="CREATED"
        if not apply:return "WOULD_DEACTIVATE_EXTRA_ROOT" if remove_extra_root else "WOULD_"+("ACTIVATE" if m else "CREATE")
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
            w=body["writes"][0];p=w["update"]["name"];assert p in (paths[2],paths[3])
            writes.append(w);data.setdefault(p,{}).update(w["update"]["fields"])
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
    try:run(*args,True,True)
    except ValueError:pass
    else:raise AssertionError("Wrong membership allowed root removal")
    data[paths[3]]["role"]=s("school_admin")
    assert run(*args,False,True)=="WOULD_DEACTIVATE_EXTRA_ROOT" and len(writes)==2
    assert run(*args,True,True)=="EXTRA_ROOT_DEACTIVATED" and len(writes)==3
    assert run(*args,True,True)=="ROOT_ALREADY_INACTIVE" and len(writes)==3
    assert data[paths[1]]["active"]==b(True) and data[paths[3]]["active"]==b(True)
    print("PASS: membership-only repair, protected retained root, exact extra root deactivation and repeat safety")
def main():
    if sys.argv[1:]==["--self-test"]:return self_test()
    if sys.argv[1:] not in (["--review"],["--apply"],["--review-extra-root"],["--deactivate-extra-root"]):raise ValueError("Explicit operation required")
    remove_extra_root=sys.argv[1] in ("--review-extra-root","--deactivate-extra-root")
    apply=sys.argv[1] in ("--apply","--deactivate-extra-root")
    if sys.argv[1]=="--deactivate-extra-root" and os.getenv("V47_CONFIRM_SCHOOL_ADMIN_LOGIN")!="YES":raise ValueError("Confirm successful School Admin browser login first")
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
    result=run(*args,apply,remove_extra_root)
    print("ROLE SEPARATION:" if remove_extra_root else "SCHOOL ADMIN MEMBERSHIP:",result)
    if apply and run(*args,False,remove_extra_root)!=("ROOT_ALREADY_INACTIVE" if remove_extra_root else "ALREADY_ACTIVE"):raise ValueError("Post-write verification failed; review before retry")
    print("V46 WRITES: ZERO; AUTH CHANGES: ZERO; ACADEMIC DATA CHANGES: ZERO")
    print("RETAINED SUPER ADMIN AND SCHOOL ADMIN MEMBERSHIP VERIFIED" if remove_extra_root else "SUPER ADMIN CHANGES: ZERO")
if __name__=="__main__":
    try:main()
    except Exception as e:
        print("STOPPED:",str(e) if isinstance(e,(ValueError,RuntimeError)) else type(e).__name__,file=sys.stderr)
        sys.exit(1)
