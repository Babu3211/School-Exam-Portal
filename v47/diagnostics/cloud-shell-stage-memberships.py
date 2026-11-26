"""Stage inactive V47 memberships/assignments from current V46 roles.
No source writes, account changes, privilege activation or overwrites.
Ambiguous roles, sections, collisions and unmatched subjects are withheld.
"""
import getpass,hashlib,importlib.util,json,os,re,subprocess,sys,warnings
from pathlib import Path
from collections import Counter
import requests
spec=importlib.util.spec_from_file_location("cdc",Path.home()/"smss-cdc.py")
cdc=importlib.util.module_from_spec(spec);spec.loader.exec_module(cdc)
m=cdc.m;sub=cdc.sub;BASE=cdc.BASE
def plan(source,target,roles,catalog,superuids,admin):
    s=m.string;b=m.boolean
    uid_re=re.compile(r"^[A-Za-z0-9_-]{6,128}$")
    out={};review=Counter()
    src={u["localId"]:u for u in source};dst={u["localId"]:u for u in target}
    rolemap={}
    for d in roles:
        f=d["fields"];uid=m.scalar(f,"uid")
        if d["name"].rsplit("/",1)[1]!=uid or uid in rolemap:raise ValueError("Invalid role identity")
        rolemap[uid]=f
    for uid in rolemap.keys()-src.keys():review["role without live account"]+=1
    for uid,u in src.items():
        if not uid_re.fullmatch(uid):review["invalid UID"]+=1;continue
        v=dst.get(uid)
        if not v or v.get("email")!=u.get("email") or uid in superuids:
            review["collision or missing target identity"]+=1;continue
        if u.get("disabled") or v.get("disabled"):
            review["disabled account held"]+=1;continue
        if uid==admin:
            review["admin held for explicit authorization"]+=1;continue
        f=rolemap.get(uid)
        if not f or m.scalar(f,"active") is not True:
            review["missing or inactive role"]+=1;continue
        roleset={x.get("stringValue") for x in cdc.decode_array(f,"roles")}
        if roleset=={"viewer"}:role="viewer"
        elif roleset and roleset<={"class_teacher","subject_teacher"}:role="teacher"
        else:
            review["mixed or unsupported roles held"]+=1;continue
        out[BASE+"/members/"+uid]={"uid":s(uid),"schoolId":s(m.SID),"role":s(role),"active":b(False)}
        review["inactive "+role+" memberships"]+=1
        if role!="teacher":continue
        def assign(cls,subjectid):
            key=m.SID+":"+uid+":"+cls+":"+subjectid
            out[BASE+"/teacher_assignments/"+key]={"schoolId":s(m.SID),"uid":s(uid),"classId":s(cls),"subjectId":s(subjectid),"active":b(False)}
        if "class_teacher" in roleset:
            for item in cdc.decode_array(f,"classTeacherClasses"):
                af=item.get("mapValue",{}).get("fields",{})
                try:
                    cls=m.canonical_class(m.scalar(af,"className"))
                    if str(m.scalar(af,"section") or "").strip():raise ValueError("section")
                    assign(cls,"attendance")
                except ValueError:review["class assignments held"]+=1
        if "subject_teacher" in roleset:
            for item in cdc.decode_array(f,"subjectAssignments"):
                af=item.get("mapValue",{}).get("fields",{})
                try:
                    cls=m.canonical_class(m.scalar(af,"className"));name=m.scalar(af,"subject")
                    if str(m.scalar(af,"section") or "").strip():raise ValueError("section")
                    if not isinstance(name,str):raise ValueError("subject")
                    subjectid=catalog.get((cls,sub.subject_key(name)))
                    if not subjectid:raise ValueError("subject")
                    assign(cls,subjectid)
                except ValueError:review["subject assignments held"]+=1
    return out,review
def self_test():
    s=m.string;b=m.boolean
    u={"localId":"teacher1","email":"t@example.test"}
    def doc(names):
        return {"name":"user_roles/teacher1","fields":{"uid":s("teacher1"),"active":b(True),"roles":{"arrayValue":{"values":[s(x) for x in names]}}}}
    o,r=plan([u],[u],[doc(["subject_teacher"])],{},set(),"otheradmin")
    assert len(o)==1 and list(o.values())[0]["active"]==b(False)
    o,r=plan([u],[u],[doc(["viewer","subject_teacher"])],{},set(),"otheradmin")
    assert not o
    o,r=plan([u],[u],[doc(["subject_teacher"])],{},{"teacher1"},"otheradmin")
    assert not o
    print("PASS inactive-only membership, mixed-role and Super Admin exclusion")
def main(path,audit_only=False):
    if os.environ.get("CI") or os.environ.get("GITHUB_ACTIONS"):raise RuntimeError("Forbidden in CI")
    from importlib.machinery import SourceFileLoader
    migration=SourceFileLoader("migration",str(Path.home()/"smss-migration-check.py")).load_module()
    warnings.simplefilter("error",getpass.GetPassWarning)
    backup=migration.open_backup(path,getpass.getpass("Backup passphrase: "))
    staged,archive,total,groups=m.plan(backup)
    subjectdocs,_=sub.catalog(groups)
    catalog={(m.scalar(f,"class"),sub.subject_key(m.scalar(f,"name"))):k.rsplit("/",1)[1] for k,f in subjectdocs.items() if "/subjects/" in k}
    r=requests.get("https://raw.githubusercontent.com/Babu3211/School-Exam-Portal/82b01c45354e6a750ed1ab545deb6b15881eafaf/index.html",timeout=(10,60));r.raise_for_status()
    match=re.search(r"""const ADMIN_UID\s*=\s*["']([^"']+)["']""",r.text)
    if not match:raise RuntimeError("V46 admin source unavailable")
    token=subprocess.check_output(["gcloud","auth","print-access-token"],text=True).strip()
    session=requests.Session()
    def call(project,url,body=None,readonly=False):
        if project not in (m.SOURCE,m.TARGET) or body is not None and project!=m.TARGET and not readonly:raise RuntimeError("Wrong destination")
        r=session.request("GET" if body is None else "POST",url,headers={"Authorization":"Bearer "+token,"x-goog-user-project":project},json=body,timeout=(10,90),allow_redirects=False)
        if r.status_code!=200:raise RuntimeError("API HTTP "+str(r.status_code))
        return r.json()
    def users(p):
        r=call(p,"https://identitytoolkit.googleapis.com/v1/projects/"+p+"/accounts:batchGet?maxResults=1000")
        if r.get("nextPageToken"):raise RuntimeError("Auth inventory cap")
        return r.get("users",[])
    def listdocs(p,relative):
        r=call(p,"https://firestore.googleapis.com/v1/"+m.root(p)+"/"+relative+"?pageSize=300")
        if r.get("nextPageToken"):raise RuntimeError("Collection inventory cap")
        return r.get("documents",[])
    api="https://firestore.googleapis.com/v1/"+m.root(m.TARGET)
    rb="https://firebaserules.googleapis.com/v1/"
    release=call(m.TARGET,rb+"projects/"+m.TARGET+"/releases/cloud.firestore")
    name=release.get("rulesetName","")
    if not name.startswith("projects/"+m.TARGET+"/rulesets/"):raise RuntimeError("Unexpected ruleset")
    fs=call(m.TARGET,rb+name).get("source",{}).get("files",[])
    if len(fs)!=1:raise RuntimeError("Unexpected rules sources")
    raw=fs[0]["content"].encode()
    if hashlib.sha1(("blob "+str(len(raw))+"\0").encode()+raw).hexdigest()!=m.RULES_BLOB:raise RuntimeError("Live rules differ")
    def read(names):
        out={}
        for item in call(m.TARGET,api+":batchGet",{"documents":names},True):
            d=item.get("found");n=d["name"] if d else item.get("missing")
            if n not in names or n in out:raise RuntimeError("Unexpected identity")
            out[n]=d.get("fields",{}) if d else None
        if set(out)!=set(names):raise RuntimeError("Incomplete read")
        return out
    v=read([BASE,archive])
    if not sub.same_field(v[BASE],staged[BASE]) or not v[archive] or v[archive].get("state")!=m.string("ARCHIVE_VERIFIED_NOT_OPERATIONAL"):raise RuntimeError("Inactive school or archive not verified")
    keys=sorted(subjectdocs)
    for i in range(0,len(keys),40):
        for n,f in read(keys[i:i+40]).items():
            if not sub.same_field(f,subjectdocs[n]):raise RuntimeError("Subject catalog differs")
    def snapshot():
        source=users(m.SOURCE);target=users(m.TARGET);roles=listdocs(m.SOURCE,"user_roles")
        su={d["name"].rsplit("/",1)[1] for d in listdocs(m.TARGET,"v47_super_admins")}
        if match.group(1) not in {u["localId"] for u in source}:raise RuntimeError("V46 admin identity not found")
        out,review=plan(source,target,roles,catalog,su,match.group(1))
        return out,review,len(source),len(target),len(roles)
    out,review,ns,nt,nr=snapshot()
    print("LIVE SOURCE AUTH:",ns,"LIVE TARGET AUTH:",nt,"LIVE SOURCE ROLES:",nr)
    print("ROLE AND ASSIGNMENT REVIEW:",json.dumps(dict(review),sort_keys=True))
    for c in ("members","teacher_assignments"):
        docs=listdocs(m.TARGET,"schools/"+m.SID+"/"+c)
        if any(d["name"] not in out for d in docs):raise RuntimeError("Existing target record outside inactive plan")
        print("PLANNED INACTIVE "+c.upper()+":",sum(k.startswith(BASE+"/"+c+"/") for k in out))
    def check(batch):
        vals=read(batch)
        for n,v in vals.items():
            if v is not None and not sub.same_field(v,out[n]):raise RuntimeError("Existing membership/assignment differs; no overwrite")
        return [n for n in batch if vals[n] is None]
    names=sorted(out);batches=[names[i:i+40] for i in range(0,len(names),40)]
    missing=[]
    for batch in batches:missing.extend(check(batch))
    print("CREATE ONLY:",len(missing),"ALREADY IDENTICAL:",len(names)-len(missing))
    if audit_only:
        # Compare current root academic collections against the encrypted
        # snapshot, not against transformed destination fields. Read only.
        from datetime import datetime,timezone,timedelta
        rt=(datetime.now(timezone.utc)-timedelta(seconds=30)).isoformat(timespec="microseconds").replace("+00:00","Z")
        def current(coll):
            docs=[];seen=set();page=None
            while True:
                params={"pageSize":300,"readTime":rt}
                if page:params["pageToken"]=page
                rr=session.get("https://firestore.googleapis.com/v1/"+m.root(m.SOURCE)+"/"+coll,headers={"Authorization":"Bearer "+token,"x-goog-user-project":m.SOURCE},params=params,timeout=(10,90),allow_redirects=False)
                if rr.status_code!=200:raise RuntimeError("Source read HTTP "+str(rr.status_code))
                data=rr.json();docs.extend(data.get("documents",[]))
                page=data.get("nextPageToken")
                if len(docs)>5000 or page in seen:raise RuntimeError("Inventory cap")
                if not page:break
                seen.add(page)
            return docs
        def index(docs):
            result={d["name"]:d.get("fields",{}) for d in docs}
            if len(result)!=len(docs):raise RuntimeError("Duplicate snapshot identity")
            return result
        print("ACADEMIC DELTA: collection / old / current / new / changed / removed")
        collections=("students","staff","classes","subjects","exams","marks","mark_settings","attendance","cdc_observations","cdc_serofero_indicators","school_settings","user_roles","certificates","school_public_branding","school_gallery","public_result_exams","public_result_lookup","public_results")
        totals=Counter()
        for c in collections:
            old=index(groups.get(c,[]));now=index(current(c))
            added=len(now.keys()-old.keys());removed=len(old.keys()-now.keys())
            changed=sum(not sub.same_field(old[k],now[k]) for k in old.keys()&now.keys())
            totals.update({"new":added,"changed":changed,"removed":removed})
            print(c,len(old),len(now),added,changed,removed,flush=True)
        print("ACADEMIC DELTA TOTAL:",json.dumps(dict(totals),sort_keys=True))
        print("ROLE PLAN MATCHING RECORDS:",len(names)-len(missing),"/",len(names))
        print("READ ONLY: ZERO FIRESTORE OR AUTH WRITES; SCHOOL ACTIVE: FALSE")
        return
    if missing:
        if input("Type STAGE-V47-ROLES to proceed: ").strip()!="STAGE-V47-ROLES":raise RuntimeError("Not confirmed")
        latest,review2,*_=snapshot()
        if not sub.same_field(out,latest) or review!=review2:raise RuntimeError("Role plan changed; retry")
        if not sub.same_field(read([BASE])[BASE],staged[BASE]):raise RuntimeError("School state changed")
        for i in range(0,len(missing),40):
            chunk=missing[i:i+40]
            if any(not any(n.startswith(BASE+"/"+c+"/") for c in ("members","teacher_assignments")) or out[n].get("active")!=m.boolean(False) for n in chunk):raise RuntimeError("Non-inactive or wrong destination")
            r=call(m.TARGET,api+":commit",{"writes":[{"update":{"name":n,"fields":out[n]},"currentDocument":{"exists":False}} for n in chunk]})
            if len(r.get("writeResults",[]))!=len(chunk):raise RuntimeError("Incomplete commit")
            print("STAGED:",min(i+40,len(missing)),"/",len(missing),flush=True)
    for batch in batches:
        if check(batch):raise RuntimeError("Verification incomplete")
    print("INACTIVE ROLE AND ASSIGNMENT VERIFIED:",len(names))
    print("V46 WRITES: ZERO; AUTH CHANGES: ZERO; ACTIVE MEMBERSHIP CHANGES: ZERO; SCHOOL ACTIVE: FALSE")
if __name__=="__main__":
    try:
        if sys.argv[1:]==["--self-test"]:self_test()
        elif len(sys.argv)==3 and sys.argv[1]=="--audit-only":main(Path(sys.argv[2]).expanduser(),True)
        elif len(sys.argv)==2:main(Path(sys.argv[1]).expanduser())
        else:raise ValueError("Specify backup")
    except (Exception,KeyboardInterrupt) as e:
        print("ROLE STAGE STOPPED:",type(e).__name__,str(e) if isinstance(e,RuntimeError) else "",file=sys.stderr)
        sys.exit(1)
