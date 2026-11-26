"""V47 inactive-school class and subject staging, preserving V46 names/credit.
Use only after verified school staging; never writes source or Auth.
Primary achievement maxima remain unset rather than inventing fixed marks.
"""
import getpass, hashlib, importlib.util, json, math, os, subprocess, sys, warnings
from collections import Counter
from pathlib import Path
import requests
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.scrypt import Scrypt

def load_stage():
    spec=importlib.util.spec_from_file_location("stage",Path.home()/"smss-stage.py")
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    return module
m=load_stage()
SID=m.SID
BASE=m.root(m.TARGET)+"/schools/"+SID
def subject_key(s):
    s=" ".join(s.strip().lower().split())
    return "हाम्रो धुनिबेँशी" if s in ("स्थानीय","स्थानीय विषय","local","local subject","हाम्रो धुनिबेँशी","hamro dhunibeshi","hamro dhunibesi") else s
def catalog(groups):
    out={};pairs={};inactive=0;primary=0
    for d in groups["classes"]:
        f=dict(d["fields"]);m.validate_scope(f)
        id=m.safeid(d["name"].rsplit("/",1)[1]);cls=m.canonical_class(m.scalar(f,"className"))
        name=m.scalar(f,"subject")
        if not isinstance(name,str) or not 2<=len(name.strip())<=160:raise ValueError("Invalid class subject")
        credit=m.scalar(f,"creditHour")
        if isinstance(credit,bool):raise ValueError("Invalid credit")
        try:credit=float(credit)
        except (ValueError,TypeError):raise ValueError("Invalid credit")
        if not math.isfinite(credit) or not 0<credit<=20:raise ValueError("Invalid credit")
        active=m.scalar(f,"active")
        if active is not None and not isinstance(active,bool):raise ValueError("Invalid active field")
        f["schoolId"]=m.string(SID)
        out[BASE+"/classes/"+id]=f
        if active is False:inactive+=1;continue
        key=(cls,subject_key(name))
        if key in pairs:
            if pairs[key][0]!=name or pairs[key][1]!=credit:raise ValueError("Conflicting names or credits across sections")
            pairs[key][2].append(id);continue
        pairs[key]=[name,credit,[id]]
    for (cls,key),(name,credit,ids) in sorted(pairs.items()):
        # Stable, collision-resistant operational ID; original class document IDs
        # and master subject documents remain available unchanged.
        id="v46_"+hashlib.sha256((cls+"\0"+key).encode()).hexdigest()[:32]
        p={"schoolId":m.string(SID),"class":m.string(cls),"name":m.string(name),"creditHour":{"doubleValue":credit},"active":m.boolean(True),
           "sourceClassRecordIds":{"arrayValue":{"values":[m.string(i) for i in sorted(ids)]}}}
        if cls in ("1","2","3","4","5"):
            p["assessmentType"]=m.string("learning-achievement");primary+=1
        elif cls in ("6","7","8","9","10"):
            # Verified V46 selectedEntrySetting / IEMIS annual scheme.
            computer="computer" in name.lower() or "कम्प्युटर" in name
            internal=50 if int(cls)<=8 or computer else 25
            p["assessmentType"]=m.string("marks")
            p["theoryFullMarks"]={"integerValue":str(100-internal)}
            p["practicalFullMarks"]={"integerValue":str(internal)}
            p["internalIncludesTerm"]=m.boolean(True)
        else:raise ValueError("Unverified assessment schema for class")
        out[BASE+"/subjects/"+id]=p
    print("SOURCE CLASS ROWS:",len(groups["classes"]),"INACTIVE CLASS ROWS:",inactive)
    print("UNIQUE ACTIVE SUBJECTS:",len(pairs),"PRIMARY ACHIEVEMENT SUBJECTS:",primary)
    print("SUBJECTS PER CLASS:",json.dumps(dict(Counter(cls for cls,key in pairs)),sort_keys=True))
    print("NEPALI CLASS SUBJECT NAMES:",sum(any("\u0900"<=c<="\u097f" for c in x[0]) for x in pairs.values()))
    return out,pairs
def self_test():
    def row(id,cls,name,credit,active=True):
        return {"name":m.root(m.SOURCE)+"/classes/"+id,"fields":{"className":m.string(cls),"subject":m.string(name),"creditHour":{"integerValue":str(credit)},"active":m.boolean(active)}}
    a=row("a","कक्षा ९","कम्प्युटर",4);b=row("b","कक्षा १","नेपाली",5)
    o,p=catalog({"classes":[a,b,row("c","Class 9","कम्प्युटर",4),row("d","Class 9","पुरानो",2,False)]})
    subs=[v for k,v in o.items() if "/subjects/" in k]
    assert len(subs)==2
    assert any(x["name"]==m.string("कम्प्युटर") and x["theoryFullMarks"]=={"integerValue":"50"} for x in subs)
    assert any(x["name"]==m.string("नेपाली") and "theoryFullMarks" not in x for x in subs)
    try:catalog({"classes":[a,row("z","9","कम्प्युटर",5)]})
    except ValueError:pass
    else:raise AssertionError("Conflicting credit accepted")
    print("PASS exact Nepali names, section deduplication, credit preservation and primary/secondary separation")
def main(path):
    if os.environ.get("CI") or os.environ.get("GITHUB_ACTIONS"):raise RuntimeError("Live migration forbidden in CI")
    warnings.simplefilter("error",getpass.GetPassWarning)
    raw=path.read_bytes();magic=b"SMSS-MIGRATION-V1";n=len(magic)
    if len(raw)>97*1024*1024 or not raw.startswith(magic):raise ValueError("Invalid backup")
    key=Scrypt(salt=raw[n:n+16],length=32,n=2**17,r=8,p=1).derive(getpass.getpass("Backup passphrase: ").encode())
    backup=json.loads(AESGCM(key).decrypt(raw[n+16:n+28],raw[n+28:],raw[:n+28]))
    staged,archive,total,groups=m.plan(backup)
    out,pairs=catalog(groups)
    # Next migration diagnostics, no personal data or source document IDs printed.
    for c in ("exams","marks","mark_settings","attendance","user_roles"):
        docs=groups.get(c,[])
        print("NEXT",c,"COUNT",len(docs),"FIELD NAMES",",".join(sorted({k for d in docs for k in d.get("fields",{})})))
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
    if m.canon(a[BASE])!=m.canon(staged[BASE]):raise RuntimeError("Target inactive school mismatch")
    for coll in ("classes","subjects"):
        r=call(api+"/schools/"+SID+"/"+coll+"?pageSize=300")
        if r.get("nextPageToken") or any(d["name"] not in out for d in r.get("documents",[])):raise RuntimeError("Unrelated target class/subject records")
    def check(batch):
        vals=read(batch)
        for n,v in vals.items():
            if v is not None and m.canon(v)!=m.canon(out[n]):raise RuntimeError("Existing record differs; no overwrite")
        return [n for n in batch if vals[n] is None]
    names=sorted(out);batches=[names[i:i+50] for i in range(0,len(names),50)]
    missing=[]
    for batch in batches:missing.extend(check(batch))
    print("CREATE ONLY:",len(missing),"ALREADY IDENTICAL:",len(names)-len(missing))
    if input("Type STAGE-V47-SUBJECTS to proceed: ").strip()!="STAGE-V47-SUBJECTS":raise RuntimeError("Not confirmed")
    for i in range(0,len(missing),50):
        batch=missing[i:i+50]
        if any(not n.startswith(BASE+"/classes/") and not n.startswith(BASE+"/subjects/") for n in batch):raise RuntimeError("Wrong destination")
        r=call(api+":commit",{"writes":[{"update":{"name":n,"fields":out[n]},"currentDocument":{"exists":False}} for n in batch]})
        if len(r.get("writeResults",[]))!=len(batch):raise RuntimeError("Incomplete commit")
        print("STAGED:",min(i+50,len(missing)),"/",len(missing),flush=True)
    for batch in batches:
        if check(batch):raise RuntimeError("Verification incomplete")
    print("CLASS SUBJECT STAGED VERIFIED:",len(names))
    print("V46 WRITES: ZERO; AUTH CHANGES: ZERO; SCHOOL ACTIVE: FALSE")
    print("Primary achievement and secondary annual metadata separated. Marks/settings/attendance/roles not yet migrated.")
if __name__=="__main__":
    try:
        if sys.argv[1:]==["--self-test"]:self_test()
        elif len(sys.argv)==2:main(Path(sys.argv[1]).expanduser())
        else:raise ValueError("Specify encrypted backup")
    except (Exception,KeyboardInterrupt) as e:
        print("SUBJECT STAGE STOPPED:",type(e).__name__,str(e) if isinstance(e,(RuntimeError,ValueError)) else "",file=sys.stderr)
        sys.exit(1)
