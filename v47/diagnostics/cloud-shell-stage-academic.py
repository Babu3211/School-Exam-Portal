"""Create-only legacy academic staging for the verified inactive V47 school.
Keep V46 exam IDs, component arrays, totals, assessment types, attendance batches,
and settings intact. No term-only collapse, no Auth changes, no source writes.
The existing V47 term-only report/entry UI still requires parity work.
"""
import getpass, hashlib, importlib.util, json, os, re, subprocess, sys, warnings
from collections import Counter
from pathlib import Path
import requests
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.scrypt import Scrypt

spec=importlib.util.spec_from_file_location("subjects",Path.home()/"smss-subjects.py")
sub=importlib.util.module_from_spec(spec);spec.loader.exec_module(sub)
m=sub.m
BASE=sub.BASE
TERMS={"first":"1st","second":"2nd","third":"3rd","annual":"final"}
COLLS=("exams","marks","mark_settings","attendance")
def docid(d):
    id=d["name"].rsplit("/",1)[1]
    if not re.fullmatch(r"[A-Za-z0-9_:-]{1,256}",id):raise ValueError("Unsupported academic document ID")
    return id
def scoped(d):
    f=dict(d["fields"]);m.validate_scope(f);f["schoolId"]=m.string(m.SID);return f
def add(f,key,value):
    v=m.string(value)
    if key in f and f[key]!=v:raise ValueError("Existing field conflicts with mapped identity")
    f[key]=v
def plan(groups,staged,subjectdocs):
    out={};errors=Counter();review=Counter()
    exams={}
    studentclass={k.rsplit("/",1)[1]:m.scalar(f,"class") for k,f in staged.items() if k.startswith(BASE+"/students/")}
    subjects={}
    for k,f in subjectdocs.items():
        if k.startswith(BASE+"/subjects/"):
            subjects[(m.scalar(f,"class"),sub.subject_key(m.scalar(f,"name")))]=k.rsplit("/",1)[1]
    for c in COLLS:
        for d in groups.get(c,[]):
            try:
                id=docid(d);f=scoped(d)
                if c=="exams":
                    cls=m.canonical_class(m.scalar(f,"className"))
                    term=m.scalar(f,"termKey");year=m.scalar(f,"academicYear")
                    if not isinstance(year,(str,int)) or not str(year).strip():raise ValueError("Missing exam year")
                    if id in ("weekly","monthly","1st","2nd","3rd","final"):raise ValueError("Reserved term ID collision")
                    exams[id]=(cls,term,str(year))
                    add(f,"class",cls)
                    if term in TERMS:add(f,"term",TERMS[term])
                    else:review["exam nonstandard term"]+=1
                elif c=="marks":
                    cls=m.canonical_class(m.scalar(f,"className"))
                    eid=m.scalar(f,"examId");sid=m.scalar(f,"studentId")
                    year=m.scalar(f,"academicYear");term=m.scalar(f,"termKey")
                    if eid not in exams:raise ValueError("Missing source exam")
                    ec,et,ey=exams[eid]
                    if (cls,term,str(year))!=(ec,et,ey):raise ValueError("Exam/class/term/year mismatch")
                    if sid not in studentclass:raise ValueError("Missing source student")
                    if studentclass[sid]!=cls:review["historical student class differs"]+=1
                    name=m.scalar(f,"subject")
                    if not isinstance(name,str) or not name.strip():raise ValueError("Missing mark subject")
                    typ=m.scalar(f,"assessmentType")
                    if typ not in ("learning-achievement","marks"):raise ValueError("Unknown assessment type")
                    scores=f.get("scores",{}).get("arrayValue",{}).get("values",[])
                    if not scores or any("mapValue" not in x for x in scores):raise ValueError("Invalid score array")
                    add(f,"class",cls)
                    if term in TERMS:add(f,"term",TERMS[term])
                    else:review["mark nonstandard term"]+=1
                    subjectid=subjects.get((cls,sub.subject_key(name)))
                    if subjectid:add(f,"subjectId",subjectid)
                    else:review["historical subject not in active catalog"]+=1
                    review["mark type "+typ]+=1
                elif c=="mark_settings":
                    group=m.scalar(f,"classGroup")
                    if group not in ("1-3","4-5","6-8","9-10"):raise ValueError("Unknown setting class group")
                    name=m.scalar(f,"subject")
                    if not isinstance(name,str) or not name.strip():raise ValueError("Missing setting subject")
                    # Deliberately retain original class-group and components, including zero
                    # maxima in primary forms. Do not turn these into ordinary marks.
                    review["settings group "+group]+=1
                elif c=="attendance":
                    cls=m.canonical_class(m.scalar(f,"className"))
                    # Preserve the V46 batch shape and leave status, no lossy boolean
                    # conversion and no synthetic daily attendance documents.
                    items=f.get("students",{}).get("arrayValue",{}).get("values",[])
                    if not items:raise ValueError("Missing attendance student array")
                    counts=Counter()
                    ids=set()
                    for item in items:
                        x=item.get("mapValue",{}).get("fields",{})
                        sid=m.scalar(x,"studentId");status=m.scalar(x,"status")
                        if not isinstance(sid,str) or not sid or sid in ids:raise ValueError("Invalid attendance student identity")
                        ids.add(sid)
                        if status not in ("present","absent","leave"):raise ValueError("Unknown attendance status")
                        counts[status]+=1
                        if sid not in studentclass:review["historical attendance student missing"]+=1
                    for field,num in (("totalStudents",len(items)),("presentCount",counts["present"]),("absentCount",counts["absent"]),("leaveCount",counts["leave"])):
                        if str(m.scalar(f,field))!=str(num):raise ValueError("Attendance count mismatch")
                    review["attendance student observations"]+=len(items)
                    review["attendance leave observations"]+=counts["leave"]
                target=BASE+"/"+c+"/"+id
                if target in out:raise ValueError("Duplicate target identity")
                out[target]=f
            except ValueError as e:errors[c+": "+str(e)]+=1
        print("PLANNED",c,sum(k.startswith(BASE+"/"+c+"/") for k in out),"SOURCE",len(groups.get(c,[])))
    print("ACADEMIC REVIEW COUNTS:",json.dumps(dict(review),sort_keys=True))
    if errors:
        print("MAPPING ERRORS:",json.dumps(dict(errors),sort_keys=True))
        raise ValueError("Academic mapping requires review; zero writes")
    # A historical mark with no current subject identity is intentionally preserved,
    # but remains a parity blocker; never invent or reassign a subject.
    return out
def self_test():
    def row(c,id,f):return {"name":m.root(m.SOURCE)+"/"+c+"/"+id,"fields":f}
    s=m.string
    a=row("exams","examA",{"className":s("कक्षा १"),"termKey":s("first"),"academicYear":s("2083")})
    b=row("marks","markA",{"className":s("Class 1"),"termKey":s("first"),"academicYear":s("2083"),"examId":s("examA"),"studentId":s("studentA"),"subject":s("नेपाली"),"assessmentType":s("learning-achievement"),"scores":{"arrayValue":{"values":[{"mapValue":{"fields":{"name":s("Full Marks"),"fullMarks":{"integerValue":"40"}}}}]}}})
    p=plan({"exams":[a],"marks":[b]}, {BASE+"/students/studentA":{"class":s("1")}}, {BASE+"/subjects/subA":{"class":s("1"),"name":s("नेपाली")}})
    assert p[BASE+"/marks/markA"]["examId"]==s("examA")
    assert p[BASE+"/marks/markA"]["scores"]==b["fields"]["scores"]
    assert p[BASE+"/marks/markA"]["subjectId"]==s("subA")
    assert p[BASE+"/marks/markA"]["term"]==s("1st")
    print("PASS original exam ID, score components, Nepali name, primary achievement and tenant scope")
def main(path,verify_only=False):
    if os.environ.get("CI") or os.environ.get("GITHUB_ACTIONS"):raise RuntimeError("Live migration forbidden in CI")
    warnings.simplefilter("error",getpass.GetPassWarning)
    raw=path.read_bytes();magic=b"SMSS-MIGRATION-V1";n=len(magic)
    if len(raw)>97*1024*1024 or not raw.startswith(magic):raise ValueError("Invalid backup")
    key=Scrypt(salt=raw[n:n+16],length=32,n=2**17,r=8,p=1).derive(getpass.getpass("Backup passphrase: ").encode())
    backup=json.loads(AESGCM(key).decrypt(raw[n+16:n+28],raw[n+28:],raw[:n+28]))
    staged,archive,total,groups=m.plan(backup)
    subjectdocs,_=sub.catalog(groups)
    out=plan(groups,staged,subjectdocs)
    token=subprocess.check_output(["gcloud","auth","print-access-token"],text=True).strip()
    session=requests.Session();headers={"Authorization":"Bearer "+token,"x-goog-user-project":m.TARGET}
    def call(url,body=None):
        r=session.request("GET" if body is None else "POST",url,headers=headers,json=body,timeout=(10,90),allow_redirects=False)
        if r.status_code!=200:raise RuntimeError("Target API HTTP "+str(r.status_code))
        return r.json()
    rb="https://firebaserules.googleapis.com/v1/"
    release=call(rb+"projects/"+m.TARGET+"/releases/cloud.firestore")
    name=release.get("rulesetName","")
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
    a=read([archive,BASE])
    if not a[archive] or a[archive].get("state")!=m.string("ARCHIVE_VERIFIED_NOT_OPERATIONAL") or a[archive].get("documentCount")!={"integerValue":str(total)}:raise RuntimeError("Archive manifest not verified")
    if not sub.same_field(a[BASE],staged[BASE]):raise RuntimeError("Target inactive school mismatch")
    prerequisite={**staged,**subjectdocs}
    keys=sorted(prerequisite)
    for i in range(0,len(keys),50):
        for name,fields in read(keys[i:i+50]).items():
            if not sub.same_field(fields,prerequisite[name]):raise RuntimeError("Staged prerequisite differs")
    for coll in COLLS:
        r=call(api+"/schools/"+m.SID+"/"+coll+"?pageSize=300")
        if r.get("nextPageToken") or any(d["name"] not in out for d in r.get("documents",[])):raise RuntimeError("Unrelated target academic records")
    def check(batch):
        vals=read(batch);differences=Counter()
        for n,v in vals.items():
            if v is not None and not sub.same_field(v,out[n]):
                for k in set(v)|set(out[n]):
                    if k not in v or k not in out[n] or not sub.same_field(v[k],out[n][k]):differences[k if k in out[n] else "(unexpected field)"]+=1
        if differences:
            print("MISMATCH FIELD COUNTS:",json.dumps(dict(differences),sort_keys=True))
            raise RuntimeError("Existing academic record differs; no overwrite")
        return [n for n in batch if vals[n] is None]
    names=sorted(out);batches=[names[i:i+40] for i in range(0,len(names),40)]
    missing=[]
    for batch in batches:missing.extend(check(batch))
    print("CREATE ONLY:",len(missing),"ALREADY IDENTICAL:",len(names)-len(missing))
    if verify_only and missing:raise RuntimeError("Missing academic records; no writes")
    if missing and input("Type STAGE-V47-EXAMS to proceed: ").strip()!="STAGE-V47-EXAMS":raise RuntimeError("Not confirmed")
    for i in range(0,len(missing),40):
        chunk=missing[i:i+40]
        if any(not any(n.startswith(BASE+"/"+c+"/") for c in COLLS) for n in chunk):raise RuntimeError("Wrong destination")
        r=call(api+":commit",{"writes":[{"update":{"name":n,"fields":out[n]},"currentDocument":{"exists":False}} for n in chunk]})
        if len(r.get("writeResults",[]))!=len(chunk):raise RuntimeError("Incomplete commit")
        print("STAGED:",min(i+40,len(missing)),"/",len(missing),flush=True)
    for batch in batches:
        if check(batch):raise RuntimeError("Academic verification incomplete")
    print("ACADEMIC STAGED VERIFIED:",len(names))
    print("V46 WRITES: ZERO; AUTH CHANGES: ZERO; SCHOOL ACTIVE: FALSE")
    print("Original exam IDs, score arrays, settings and attendance batches preserved. V47 entry/report parity, CDC observations, memberships and Auth still pending.")
if __name__=="__main__":
    try:
        if sys.argv[1:]==["--self-test"]:self_test()
        elif len(sys.argv)==3 and sys.argv[1]=="--verify-only":main(Path(sys.argv[2]).expanduser(),True)
        elif len(sys.argv)==2:main(Path(sys.argv[1]).expanduser())
        else:raise ValueError("Specify encrypted backup")
    except (Exception,KeyboardInterrupt) as e:
        print("ACADEMIC STAGE STOPPED:",type(e).__name__,str(e) if isinstance(e,(RuntimeError,ValueError)) else "",file=sys.stderr)
        sys.exit(1)
