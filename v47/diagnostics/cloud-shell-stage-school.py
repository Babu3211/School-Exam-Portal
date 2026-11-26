"""Prepare a canonical inactive V47 school from the verified V46 snapshot.
Only create school/student/staff/profile documents. No activation, Auth or V46 writes.
Original fields remain in the verified private archive; operational student fields
follow the existing V47 validator. No guess of class or role.
"""
import getpass, hashlib, importlib.util, json, os, re, subprocess, sys, warnings
from pathlib import Path
from collections import Counter
import requests
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.scrypt import Scrypt

SOURCE="exam-portal-smss-95016"
TARGET="smss-exam-portal-v47"
SID="300160003"
RULES_BLOB="6866b33e01f195fc87424905761bea71d0d575e5"
CLASSES=set("ECD LKG UKG 1 2 3 4 5 6 7 8 9 10 11 12".split())
OPTIONAL={"rollNo":30,"studentIemisId":128,"admissionNo":128,"studentNameNepali":500,
"gender":500,"fatherName":500,"motherName":500,"section":500,"permanentAddress":500,
"temporaryAddress":500,"dob":500,"dobAD":500,"motherTongue":500,"disabilityType":500,
"guardianName":500,"phone":500,"symbolNo":500,"birthRegistrationNo":500,"nebRegNo":500,"sourceYear":500}
def root(p):return f"projects/{p}/databases/(default)/documents"
def canon(v):return json.dumps(v,sort_keys=True,ensure_ascii=False,separators=(",",":"),allow_nan=False).encode()
def string(v):return {"stringValue":v}
def boolean(v):return {"booleanValue":v}
def scalar(fields,key):
    v=fields.get(key,{})
    for k in ("stringValue","integerValue","doubleValue","booleanValue"):
        if k in v:return v[k]
    if not v or "nullValue" in v:return None
    raise ValueError("Unsupported scalar field")
def txt(fields,key,limit,required=False):
    v=scalar(fields,key)
    if v is None or v=="":v=""
    if isinstance(v,bool) or not isinstance(v,(str,int,float)):raise ValueError("Invalid text field")
    v=str(v).strip()
    if len(v)>limit or required and len(v)<2:raise ValueError("Text field length")
    return v
def safeid(id):
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,128}",id):raise ValueError("Unsupported operational document ID")
    return id
def validate_scope(f):
    if "schoolId" in f and scalar(f,"schoolId")!=SID:raise ValueError("Foreign school scope")
def canonical_class(value):
    if isinstance(value,bool) or value is None:raise ValueError("Unrecognized class")
    text=str(value).strip().translate(str.maketrans("०१२३४५६७८९","0123456789"))
    upper=text.upper()
    if upper in ("ECD","LKG","UKG"):return upper
    if upper=="EARLY CHILDHOOD DEVELOPMENT":return "ECD"
    match=re.fullmatch(r"(?:(?:class|कक्षा)\s*)?([1-9]|1[012])",text,re.IGNORECASE)
    if match:return match.group(1)
    raise ValueError("Unrecognized class")
def class_recognized(value):
    try:canonical_class(value);return True
    except ValueError:return False
def transfer_status(value):
    # V46's real studentTransferred input is free text, and its Excel
    # import preserves text values. Never interpret Python string truthiness.
    if value is None:return False
    if isinstance(value,bool):return value
    if isinstance(value,(str,int,float)):
        label=str(value).strip().casefold().translate(str.maketrans("०१२३४५६७८९","0123456789"))
        if label in ("","false","no","n","0","0.0","होइन","छैन","होईन","नाइँ","नाई","not transferred"):return False
        if label in ("true","yes","y","1","1.0","हो","छ","transferred"):return True
    raise ValueError("Unrecognized transfer status")
def transfer_bucket(fields):
    try:
        value=scalar(fields,"isTransferred")
        if value is None or isinstance(value,str) and not value.strip():return "blank_or_missing"
        return "transferred" if transfer_status(value) else "not_transferred"
    except ValueError:return "unrecognized"
def project_student(d):
    f=d["fields"];validate_scope(f)
    name=txt(f,"studentName",160,True)
    cls=canonical_class(scalar(f,"class"))
    transfer=transfer_status(scalar(f,"isTransferred"))
    active=scalar(f,"active")
    if active is not None and not isinstance(active,bool):raise ValueError("Unrecognized active status")
    out={"name":string(name),"class":string(cls),"schoolId":string(SID),"active":boolean(active is not False and transfer is not True)}
    for key,limit in OPTIONAL.items():
        src="studentIemisNo" if key=="studentIemisId" else key
        v=txt(f,src,limit)
        if v:out[key]=string(v)
    return out
def project_staff(d):
    f=dict(d["fields"]);validate_scope(f)
    # Legacy staff records can have missing/short names. Retain their exact
    # source fields, including empty values, rather than inventing an identity.
    # Use an existing bilingual name only when the original name is blank.
    name=scalar(f,"name")
    if name is not None and not isinstance(name,str):raise ValueError("Invalid staff name type")
    if not name or not name.strip():
        for alias in ("nameEnglish","nameEn","nameNepali"):
            alt=scalar(f,alias)
            if isinstance(alt,str) and alt.strip():
                f["name"]=string(alt)
                break
    # Retain all original staff fields. Do not create new Auth links, privilege,
    # or guess correspondence between the two existing target accounts.
    # Known source has no linked UID fields; halt if an unexpected link exists.
    if any(scalar(f,k) not in (None,"") for k in ("authUid","firebaseUid","userUid","uid")):
        raise ValueError("Staff Auth link needs explicit identity mapping")
    f["schoolId"]=string(SID)
    return f
def project_profile(f):
    validate_scope(f)
    if txt(f,"iemisCode",20)!=SID:raise ValueError("School IEMIS code mismatch")
    name=txt(f,"schoolName",160,True)
    if len(name)<3:raise ValueError("School name invalid")
    # Preserve source spelling and all other profile properties (logo/map etc).
    p=dict(f)
    for k,v in {"schoolId":SID,"nameEnglish":name,"nameNepali":txt(f,"schoolNameNe",160),
                "addressEnglish":txt(f,"address",300),"addressNepali":txt(f,"addressNe",300)}.items():
        p[k]=string(v)
    return name,p
def plan(backup):
    if set(backup)!={SOURCE,TARGET}:raise ValueError("Wrong backup scope")
    src=backup[SOURCE];prefix=root(SOURCE)+"/"
    docs=src["documents"];groups={};counts=Counter({k:0 for k in src["collectionCounts"]});seen=set()
    if not 1<=len(docs)<=5000 or src["missingAncestors"]:raise ValueError("Incomplete source")
    for d in docs:
        n=d["name"]
        if not n.startswith(prefix) or n in seen or not d.get("updateTime"):raise ValueError("Invalid snapshot path")
        seen.add(n);counts[n.rsplit("/",1)[0]]+=1
        parts=n[len(prefix):].split("/")
        if len(parts)==2:groups.setdefault(parts[0],[]).append(d)
    if dict(counts)!=src["collectionCounts"]:raise ValueError("Snapshot count mismatch")
    profile=[d for d in groups.get("school_settings",[]) if scalar(d["fields"],"iemisCode") in (SID,int(SID))]
    if len(profile)!=1:raise ValueError("Need exactly one verified source school profile")
    name,profile_fields=project_profile(profile[0]["fields"])
    base=root(TARGET)+"/schools/"+SID
    out={base:{"id":string(SID),"iemisCode":string(SID),"name":string(name),"active":boolean(False)},
         base+"/school_settings/profile":profile_fields}
    errors=Counter()
    for coll,project in (("students",project_student),("staff",project_staff)):
        for d in groups.get(coll,[]):
            try:out[base+"/"+coll+"/"+safeid(d["name"].rsplit("/",1)[1])]=project(d)
            except ValueError as e:errors[coll+": "+str(e)]+=1
    print("OPERATIONAL STUDENTS:",sum(k.startswith(base+"/students/") for k in out),"SOURCE:",len(groups.get("students",[])))
    print("OPERATIONAL STAFF:",sum(k.startswith(base+"/staff/") for k in out),"SOURCE:",len(groups.get("staff",[])))
    print("STUDENT CLASS COUNTS:",json.dumps(dict(sorted(Counter(scalar(f,"class") for k,f in out.items() if k.startswith(base+"/students/")).items())),ensure_ascii=False))
    print("SOURCE TRANSFER STATUS:",json.dumps(dict(Counter(transfer_bucket(d["fields"]) for d in groups.get("students",[]))),sort_keys=True))
    print("OPERATIONAL ACTIVE STUDENTS:",sum(scalar(f,"active") is True for k,f in out.items() if k.startswith(base+"/students/")))
    print("OPERATIONAL INACTIVE STUDENTS:",sum(scalar(f,"active") is False for k,f in out.items() if k.startswith(base+"/students/")))
    print("STAFF NAME REVIEW:",sum(not isinstance(scalar(f,"name"),str) or len(scalar(f,"name").strip())<2 or len(scalar(f,"name"))>160 for k,f in out.items() if k.startswith(base+"/staff/")))
    if errors:
        print("UNMAPPED CLASS RECORDS:",sum(not class_recognized(scalar(d["fields"],"class")) for d in groups.get("students",[])))
    if errors:
        print("SCHEMA REVIEW REQUIRED:",json.dumps(errors,sort_keys=True))
        raise ValueError("No partial operational copy; review invalid rows first")
    identity=[{"name":d["name"],"fields":d.get("fields",{})} for d in sorted(docs,key=lambda d:d["name"])]
    digest=hashlib.sha256(canon({"readTime":src["readTime"],"documents":identity})).hexdigest()
    archive=root(TARGET)+"/v47_migration_archives/"+SID+"/snapshots/"+digest
    return out,archive,len(docs),groups
def self_test():
    d={"fields":{"studentName":string("विद्यार्थी"),"class":string("1"),"studentIemisNo":string("00123"),"isTransferred":boolean(True)}}
    out=project_student(d)
    assert out["name"]==string("विद्यार्थी") and out["studentIemisId"]==string("00123") and out["active"]==boolean(False)
    try:project_student({"fields":dict(d["fields"],schoolId=string("999999"))})
    except ValueError:pass
    else:raise AssertionError("Foreign school accepted")
    assert project_profile({"iemisCode":string(SID),"schoolName":string("School"),"schoolNameNe":string("विद्यालय")})[1]["nameNepali"]==string("विद्यालय")
    for n in range(1,13):
        nepali=str(n).translate(str.maketrans("0123456789","०१२३४५६७८९"))
        for label in (str(n),"Class "+str(n),"कक्षा "+str(n),"कक्षा "+nepali):
            assert canonical_class(label)==str(n)
    assert canonical_class("Early Childhood Development")=="ECD"
    assert canonical_class("lkg")=="LKG"
    for invalid in ("Class 13","कक्षा १-३","Class 1 A",None,True):
        assert not class_recognized(invalid)
    assert project_staff({"fields":{"name":string(""),"nameNepali":string("शिक्षक")}})["name"]==string("शिक्षक")
    assert project_staff({"fields":{"name":string("")}})["name"]==string("")
    assert project_staff({"fields":{"name":string("क")}})["name"]==string("क")
    for value in (False,None,"","  ","False","NO","0","०","होइन","Not Transferred"):
        assert transfer_status(value) is False
    for value in (True,"TRUE","Yes","1","१","हो","Transferred"):
        assert transfer_status(value) is True
    for value in ("unknown","pending","2",{},[]):
        try:transfer_status(value)
        except ValueError:pass
        else:raise AssertionError("Unknown transfer status accepted")
    assert project_student({"fields":dict(d["fields"],isTransferred=string("No"))})["active"]==boolean(True)
    assert project_student({"fields":dict(d["fields"],isTransferred=string("Yes"))})["active"]==boolean(False)
    print("PASS school scope, class aliases, staff preservation and V46 text transfer status")
def main(path):
    if os.environ.get("CI") or os.environ.get("GITHUB_ACTIONS"):raise RuntimeError("Live migration forbidden in CI")
    warnings.simplefilter("error",getpass.GetPassWarning)
    raw=path.read_bytes();magic=b"SMSS-MIGRATION-V1";n=len(magic)
    if len(raw)>97*1024*1024 or not raw.startswith(magic):raise ValueError("Invalid backup")
    key=Scrypt(salt=raw[n:n+16],length=32,n=2**17,r=8,p=1).derive(getpass.getpass("Backup passphrase: ").encode())
    backup=json.loads(AESGCM(key).decrypt(raw[n+16:n+28],raw[n+28:],raw[:n+28]))
    out,archive,total,groups=plan(backup)
    print("STAGED SCHOOL PROFILE: 1; SCHOOL ACTIVE: FALSE")
    print("SOURCE SUBJECT CLASS ROWS:",len(groups.get("classes",[])),"SUBJECT MASTER RECORDS:",len(groups.get("subjects",[])))
    # Aggregate-only schema diagnostics for the next subject/assignment stage.
    for field in ("className","subject","creditHour","teacher","active"):
        c=Counter(next(iter(d.get("fields",{}).get(field,{})),"missing") for d in groups.get("classes",[]))
        print("CLASS FIELD TYPE",field,dict(c))
    token=subprocess.check_output(["gcloud","auth","print-access-token"],text=True).strip()
    session=requests.Session();headers={"Authorization":"Bearer "+token,"x-goog-user-project":TARGET}
    def call(url,body=None):
        r=session.request("GET" if body is None else "POST",url,headers=headers,json=body,timeout=(10,90),allow_redirects=False)
        if r.status_code!=200:raise RuntimeError("Target API HTTP "+str(r.status_code))
        return r.json()
    rb="https://firebaserules.googleapis.com/v1/"
    release=call(rb+"projects/"+TARGET+"/releases/cloud.firestore")
    name=release.get("rulesetName","")
    if not name.startswith("projects/"+TARGET+"/rulesets/"):raise RuntimeError("Unexpected live ruleset")
    fs=call(rb+name).get("source",{}).get("files",[])
    if len(fs)!=1:raise RuntimeError("Unexpected rules sources")
    b=fs[0]["content"].encode()
    if hashlib.sha1(("blob "+str(len(b))+"\0").encode()+b).hexdigest()!=RULES_BLOB:raise RuntimeError("Rules differ from reviewed source")
    base="https://firestore.googleapis.com/v1/"+root(TARGET)+":"
    def read(names):
        result=call(base+"batchGet",{"documents":names})
        values={}
        for item in result:
            doc=item.get("found");name=doc["name"] if doc else item.get("missing")
            if name not in names or name in values:raise RuntimeError("Unexpected result identity")
            values[name]=doc.get("fields",{}) if doc else None
        if set(values)!=set(names):raise RuntimeError("Incomplete read")
        return values
    m=read([archive])[archive]
    if not m or m.get("state")!=string("ARCHIVE_VERIFIED_NOT_OPERATIONAL") or m.get("documentCount")!={"integerValue":str(total)}:raise RuntimeError("Verified archive manifest required")
    school=root(TARGET)+"/schools/"+SID
    # Ensure no unrelated data in this school. Allow only an exact resumable subset.
    sub=call("https://firestore.googleapis.com/v1/"+school+":listCollectionIds",{"pageSize":100})
    if sub.get("nextPageToken") or set(sub.get("collectionIds",[]))-{"students","staff","school_settings"}:raise RuntimeError("Unexpected target school subcollections")
    for c in sub.get("collectionIds",[]):
        r=call("https://firestore.googleapis.com/v1/"+school+"/"+c+"?pageSize=300")
        if r.get("nextPageToken") or any(d["name"] not in out for d in r.get("documents",[])):raise RuntimeError("Unrelated target records exist")
    def check(batch):
        values=read(batch)
        for name,fields in values.items():
            if fields is not None and canon(fields)!=canon(out[name]):raise RuntimeError("Existing school or record differs; no overwrite")
        return [name for name in batch if values[name] is None]
    names=[school]+sorted(set(out)-{school});batches=[names[i:i+50] for i in range(0,len(names),50)]
    missing=[]
    for batch in batches:missing.extend(check(batch))
    print("CREATE ONLY:",len(missing),"ALREADY IDENTICAL:",len(names)-len(missing))
    if input("Type STAGE-V47-SCHOOL to proceed: ").strip()!="STAGE-V47-SCHOOL":raise RuntimeError("Not confirmed")
    for i in range(0,len(missing),50):
        chunk=missing[i:i+50]
        if any(n!=school and not n.startswith(school+"/") for n in chunk):raise RuntimeError("Wrong target")
        result=call(base+"commit",{"writes":[{"update":{"name":n,"fields":out[n]},"currentDocument":{"exists":False}} for n in chunk]})
        if len(result.get("writeResults",[]))!=len(chunk):raise RuntimeError("Incomplete commit result")
        print("STAGED:",min(i+50,len(missing)),"/",len(missing),flush=True)
    for batch in batches:
        if check(batch):raise RuntimeError("Staging verification incomplete")
    print("STAGED VERIFIED RECORDS:",len(names))
    print("V46 WRITES: ZERO; AUTH CHANGES: ZERO; SCHOOL ACTIVE: FALSE")
    print("Subjects, marks, attendance, roles and other operational mappings still pending. All original source fields remain in private archive.")
if __name__=="__main__":
    try:
        if sys.argv[1:]==["--self-test"]:self_test()
        elif len(sys.argv)==2:main(Path(sys.argv[1]).expanduser())
        else:raise ValueError("Specify encrypted backup")
    except (Exception,KeyboardInterrupt) as e:
        print("STAGE STOPPED:",type(e).__name__,str(e) if isinstance(e,(ValueError,RuntimeError)) else "",file=sys.stderr)
        sys.exit(1)
