"""V46 -> V47 additive marks/legacy role catch-up. Default is read-only.
Requires the previously reviewed Cloud Shell helpers and encrypted baseline.
Never changes source, Auth, membership, school status, or existing documents.
"""
import getpass, hashlib, json, os, subprocess, sys, warnings
from datetime import datetime, timezone, timedelta
from pathlib import Path
from importlib.machinery import SourceFileLoader

COLLS=("students","staff","classes","subjects","exams","marks","mark_settings","attendance","cdc_observations","cdc_serofero_indicators","school_settings","user_roles","certificates","school_public_branding","school_gallery","public_result_exams","public_result_lookup","public_results")
ALLOWED={"marks","user_roles"}

def delta_counts(old,current,equal):
    return {"old":len(old),"current":len(current),"new":len(current.keys()-old.keys()),"removed":len(old.keys()-current.keys()),"changed":sum(not equal(old[k],current[k]) for k in old.keys() & current.keys())}

def additions(old, current, equal, allowed):
    counts=delta_counts(old,current,equal)
    if counts["removed"] or counts["changed"]:
        raise RuntimeError("Source changed or removed existing records; manual reconciliation required")
    new=set(current)-set(old)
    if new and not allowed:raise RuntimeError("New records in unreviewed collection")
    return new

def changed_fields(old,new,equal):
    return {k for k in old.keys() | new.keys() if k not in old or k not in new or not equal(old[k],new[k])}

def self_test():
    assert additions({"a":1},{"a":1,"b":2},lambda x,y:x==y,True)=={"b"}
    for old,new,allowed in [({"a":1},{"a":2},True),({"a":1},{},True),({},{"a":1},False)]:
        try:additions(old,new,lambda x,y:x==y,allowed)
        except RuntimeError:pass
        else:raise AssertionError("Unexpected delta accepted")
    assert delta_counts({"a":1,"b":2},{"a":3,"c":4},lambda x,y:x==y)=={"old":2,"current":2,"new":1,"removed":1,"changed":1}
    assert changed_fields({"a":1,"b":2},{"a":3,"c":4},lambda x,y:x==y)=={"a","b","c"}
    assert changed_fields({"a":1},{"a":1},lambda x,y:x==y)==set()
    print("PASS additive-only delta policy and aggregate difference diagnostics")

def main(path,apply=False,reconcile=False):
    import requests
    if os.environ.get("CI") or os.environ.get("GITHUB_ACTIONS"):raise RuntimeError("Live migration forbidden in CI")
    warnings.simplefilter("error",getpass.GetPassWarning)
    home=Path.home()
    migration=SourceFileLoader("migration",str(home/"smss-migration-check.py")).load_module()
    cdc=SourceFileLoader("cdc_delta",str(home/"smss-cdc.py")).load_module()
    m=cdc.m;sub=cdc.sub;a=cdc.a;BASE=cdc.BASE
    if (m.SOURCE,m.TARGET,m.SID)!=("exam-portal-smss-95016","smss-exam-portal-v47","300160003"):raise RuntimeError("Unexpected migration project scope")
    backup=migration.open_backup(path,getpass.getpass("Backup passphrase: "))
    staged,archive,total,groups=m.plan(backup)
    subjectdocs,_=sub.catalog(groups)
    original={**staged,**subjectdocs,**a.plan(groups,staged,subjectdocs),**cdc.project(groups)}
    token=subprocess.check_output(["gcloud","auth","print-access-token"],text=True).strip()
    session=requests.Session()
    api="https://firestore.googleapis.com/v1/"+m.root(m.TARGET)
    source_api="https://firestore.googleapis.com/v1/"+m.root(m.SOURCE)
    def call(project,url,body=None,params=None):
        if project not in (m.SOURCE,m.TARGET) or (body is not None and project!=m.TARGET):raise RuntimeError("Wrong project")
        if body is not None and url not in (api+":batchGet",api+":beginTransaction",api+":commit",api+":rollback"):raise RuntimeError("Unexpected POST")
        if url in (api+":beginTransaction",api+":commit",api+":rollback") and not apply:raise RuntimeError("Read-only mode")
        r=session.request("GET" if body is None else "POST",url,headers={"Authorization":"Bearer "+token,"x-goog-user-project":project},json=body,params=params,timeout=(10,90),allow_redirects=False)
        if r.status_code!=200:raise RuntimeError("API HTTP "+str(r.status_code))
        return r.json()
    def check_rules():
        rb="https://firebaserules.googleapis.com/v1/"
        name=call(m.TARGET,rb+"projects/"+m.TARGET+"/releases/cloud.firestore").get("rulesetName","")
        if not name.startswith("projects/"+m.TARGET+"/rulesets/"):raise RuntimeError("Unexpected ruleset")
        fs=call(m.TARGET,rb+name).get("source",{}).get("files",[])
        if len(fs)!=1:raise RuntimeError("Unexpected rules source")
        b=fs[0]["content"].encode()
        if hashlib.sha1(("blob "+str(len(b))+"\0").encode()+b).hexdigest()!=m.RULES_BLOB:raise RuntimeError("Live rules differ")
    def listing(project,url,prefix,rt=None):
        result={};page=None;seen=set()
        while True:
            params={"pageSize":300}
            if rt:params["readTime"]=rt
            if page:params["pageToken"]=page
            data=call(project,url,params=params)
            for d in data.get("documents",[]):
                n=d["name"]
                if not n.startswith(prefix) or "/" in n[len(prefix):] or n in result:raise RuntimeError("Invalid collection identity")
                result[n]=d["fields"]
            page=data.get("nextPageToken")
            if len(result)>5000 or page in seen:raise RuntimeError("Inventory cap")
            if not page:return result
            seen.add(page)
    def snapshot():
        rt=(datetime.now(timezone.utc)-timedelta(seconds=10)).isoformat(timespec="microseconds").replace("+00:00","Z")
        updated=dict(groups);new_by_coll={};blocked=[];staff_changes={};class_additions=[]
        for c in COLLS:
            old={d["name"]:d["fields"] for d in groups.get(c,[])}
            if len(old)!=len(groups.get(c,[])):raise RuntimeError("Duplicate baseline identity")
            now=listing(m.SOURCE,source_api+"/"+c,m.root(m.SOURCE)+"/"+c+"/",rt)
            counts=delta_counts(old,now,sub.same_field)
            print("DELTA INVENTORY",c,json.dumps(counts,sort_keys=True),flush=True)
            if counts["removed"] or (counts["changed"] and not (reconcile and c=="staff")) or (counts["new"] and c not in ALLOWED and not (reconcile and c=="classes")):
                blocked.append(c)
            if reconcile and c=="staff":
                for k in old.keys() & now.keys():
                    if not sub.same_field(old[k],now[k]):
                        staff_changes[k]=changed_fields(old[k],now[k],sub.same_field)
            if reconcile and c=="classes":
                class_additions=[{"name":k,"fields":now[k]} for k in now.keys()-old.keys()]
            updated[c]=[{"name":n,"fields":f} for n,f in now.items()]
            new_by_coll[c]=counts["new"]
        if blocked:
            print("COLLECTIONS REQUIRING REVIEW:",", ".join(blocked))
            print("READ ONLY: ZERO FIRESTORE OR AUTH WRITES DURING THIS INVENTORY")
            raise RuntimeError("Source changes or unreviewed additions; no staging performed")
        if reconcile:
            from collections import Counter
            # Preview only. Keep old source data in the verified original archive.
            # Map the new source using the same reviewed V46 schema helpers.
            newstaged=dict(staged)
            field_counts=Counter()
            # Never print field values or identifiers; unknown field names may
            # also be sensitive, so print only a fixed vocabulary.
            known={"name","nameEnglish","nameEn","nameNepali","email","emailId","emailID","emailAddress","phone","mobile","designation","post","qualification","address","active","updatedAt","updatedBy","createdAt","authUid","firebaseUid","userUid","uid","teacherId"}
            for k,fields in staff_changes.items():
                field_counts.update(x if x in known else "(other field)" for x in fields)
            print("STAFF CHANGED FIELD COUNTS:",json.dumps(dict(field_counts),sort_keys=True))
            for d in updated.get("staff",[]):
                dest=BASE+"/staff/"+m.safeid(d["name"].rsplit("/",1)[1])
                if d["name"] in staff_changes:
                    newstaged[dest]=m.project_staff(d)
            newsubjects,_=sub.catalog(updated)
            for d in class_additions:
                f=d["fields"]
                cls=m.canonical_class(m.scalar(f,"className"))
                # Class level and active state only; omit subject/teacher names.
                print("NEW CLASS ROW LEVEL:",cls,"ACTIVE:",m.scalar(f,"active") is not False)
            desired={**newstaged,**newsubjects,**a.plan(updated,newstaged,newsubjects),**cdc.project(updated)}
            if set(original)-set(desired):raise RuntimeError("Mapped records would be removed")
            replacements={k:v for k,v in desired.items() if k in original and not sub.same_field(original[k],v)}
            extra={k:v for k,v in desired.items() if k not in original}
            for k,v in replacements.items():
                if k.startswith(BASE+"/staff/"):continue
                if k.startswith(BASE+"/subjects/") and changed_fields(original[k],v,sub.same_field)=={"sourceClassRecordIds"}:continue
                raise RuntimeError("Unreviewed mapped replacement; no writes")
            allowed_new={"marks","user_roles","classes","subjects"}
            if any(not any(k.startswith(BASE+"/"+c+"/") for c in allowed_new) for k in extra):raise RuntimeError("Unreviewed mapped creation")
            if len(extra)+len(replacements)>100:raise RuntimeError("Reconciliation review limit")
            print("MAPPED NEW COUNTS:",json.dumps(dict(Counter(k[len(BASE)+1:].split("/")[0] for k in extra)),sort_keys=True))
            print("MAPPED UPDATE COUNTS:",json.dumps(dict(Counter(k[len(BASE)+1:].split("/")[0] for k in replacements)),sort_keys=True))
            return desired,extra,replacements
        expected={**staged,**subjectdocs,**a.plan(updated,staged,subjectdocs),**cdc.project(updated)}
        delta={k:v for k,v in expected.items() if k not in original}
        if any(k not in expected or not sub.same_field(v,expected[k]) for k,v in original.items()):raise RuntimeError("Mapped baseline changed")
        if len(delta)!=sum(new_by_coll.values()) or len(delta)>40 or any(not any(k.startswith(BASE+"/"+c+"/") for c in ALLOWED) for k in delta):raise RuntimeError("Unexpected delta scope")
        # Legacy roles are source evidence only, never memberships or privileges.
        print("SOURCE DELTA MARKS:",new_by_coll["marks"],"LEGACY USER ROLES:",new_by_coll["user_roles"])
        return expected,delta
    def read(names,tx=None):
        out={}
        for i in range(0,len(names),40):
            batch=names[i:i+40];body={"documents":batch}
            if tx:body["transaction"]=tx
            for item in call(m.TARGET,api+":batchGet",body):
                d=item.get("found");n=d["name"] if d else item.get("missing")
                if n not in batch or n in out:raise RuntimeError("Unexpected target identity")
                out[n]=d["fields"] if d else None
        if set(out)!=set(names):raise RuntimeError("Incomplete target read")
        return out
    def verify(expected,delta,tx=None):
        vals=read(sorted(set(expected)|{archive,BASE}),tx)
        if not sub.same_field(vals[BASE],staged[BASE]):raise RuntimeError("Inactive target school differs")
        if not vals[archive] or vals[archive].get("state")!=m.string("ARCHIVE_VERIFIED_NOT_OPERATIONAL") or vals[archive].get("documentCount")!={"integerValue":str(total)}:raise RuntimeError("Baseline archive not verified")
        missing=[]
        for k,v in expected.items():
            if vals[k] is None and k in delta:missing.append(k)
            elif not sub.same_field(vals[k],v):raise RuntimeError("Existing target record differs or baseline absent; no overwrite")
        return missing
    check_rules()
    if reconcile:
        if apply:raise RuntimeError("Reconciliation preview cannot write")
        desired,extra,replacements=snapshot()
        for c in ("staff","classes","subjects","marks","user_roles"):
            actual=listing(m.TARGET,api+"/schools/"+m.SID+"/"+c,BASE+"/"+c+"/")
            if any(k not in desired for k in actual):raise RuntimeError("Unrelated target records in "+c)
        vals=read(sorted(set(desired)|{archive,BASE}))
        if not sub.same_field(vals[BASE],staged[BASE]):raise RuntimeError("Inactive target school differs")
        if not vals[archive] or vals[archive].get("state")!=m.string("ARCHIVE_VERIFIED_NOT_OPERATIONAL") or vals[archive].get("documentCount")!={"integerValue":str(total)}:raise RuntimeError("Baseline archive not verified")
        from collections import Counter
        creates=Counter();updates=Counter();identical=Counter();conflicts=Counter()
        for k,v in desired.items():
            coll=k[len(BASE)+1:].split("/")[0] if k!=BASE else "school"
            if sub.same_field(vals[k],v):identical[coll]+=1
            elif k in extra and vals[k] is None:creates[coll]+=1
            elif k in replacements and sub.same_field(vals[k],original[k]):updates[coll]+=1
            else:conflicts[coll]+=1
        print("TARGET CREATE COUNTS:",json.dumps(dict(creates),sort_keys=True))
        print("TARGET UPDATE COUNTS:",json.dumps(dict(updates),sort_keys=True))
        print("TARGET CONFLICT COUNTS:",json.dumps(dict(conflicts),sort_keys=True))
        print("READ ONLY: ZERO FIRESTORE OR AUTH WRITES; SCHOOL ACTIVE: FALSE")
        if conflicts:raise RuntimeError("Target diverges from approved baseline; no writes")
        print("RECONCILIATION PREVIEW COMPLETE; NO APPLY IMPLEMENTED FOR STAFF OR CLASS CHANGES")
        return
    expected,delta=snapshot()
    for c in ALLOWED:
        actual=listing(m.TARGET,api+"/schools/"+m.SID+"/"+c,BASE+"/"+c+"/")
        if any(k not in expected for k in actual):raise RuntimeError("Unrelated target records")
    missing=verify(expected,delta)
    print("DELTA ALREADY IDENTICAL:",len(delta)-len(missing),"CREATE ONLY:",len(missing))
    if not apply or not missing:
        print("READ ONLY: ZERO FIRESTORE OR AUTH WRITES; SCHOOL ACTIVE: FALSE")
        return
    if input("Type STAGE-V47-DELTA to create missing records only: ").strip()!="STAGE-V47-DELTA":raise RuntimeError("Not confirmed")
    check_rules()
    latest,newdelta=snapshot()
    if not sub.same_field(expected,latest) or not sub.same_field(delta,newdelta):raise RuntimeError("Source changed after preview; retry")
    tx=call(m.TARGET,api+":beginTransaction",{"options":{"readWrite":{}}})["transaction"]
    committed=False
    try:
        checked=verify(expected,delta,tx)
        if set(checked)!=set(missing):raise RuntimeError("Target changed after preview; retry")
        writes=[{"update":{"name":k,"fields":delta[k]},"currentDocument":{"exists":False}} for k in checked]
        r=call(m.TARGET,api+":commit",{"transaction":tx,"writes":writes})
        committed=True
        if len(r.get("writeResults",[]))!=len(writes):raise RuntimeError("Commit response incomplete; run read-only audit")
    finally:
        if not committed:
            try:call(m.TARGET,api+":rollback",{"transaction":tx})
            except Exception:pass
    if verify(expected,delta):raise RuntimeError("Post-commit verification incomplete")
    print("DELTA VERIFIED:",len(delta),"CREATED:",len(missing))
    print("V46 WRITES: ZERO; AUTH CHANGES: ZERO; MEMBERSHIP CHANGES: ZERO; SCHOOL ACTIVE: FALSE")

if __name__=="__main__":
    try:
        if sys.argv[1:]==["--self-test"]:self_test()
        elif len(sys.argv)==3 and sys.argv[1] in ("--audit-only","--apply","--audit-reconcile"):main(Path(sys.argv[2]).expanduser(),sys.argv[1]=="--apply",sys.argv[1]=="--audit-reconcile")
        else:raise RuntimeError("Specify --audit-only, --audit-reconcile or --apply and encrypted backup")
    except (Exception,KeyboardInterrupt) as e:
        print("DELTA STOPPED:",type(e).__name__,str(e) if isinstance(e,RuntimeError) else "",file=sys.stderr)
        sys.exit(1)
