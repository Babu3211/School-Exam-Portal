"""Offline migration dry run for the operator's encrypted V46/V47 backup.
No network, Firebase writes, credential display, plaintext output or data upload.
Only aggregate schema and identity diagnostics are printed.
"""
import getpass, json, sys, warnings
from collections import Counter
from pathlib import Path
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.scrypt import Scrypt

SOURCE="exam-portal-smss-95016"
TARGET="smss-exam-portal-v47"
SCHOOL="300160003"
MAGIC=b"SMSS-MIGRATION-V1"
KNOWN=set("audit_logs attendance cdc_observations cdc_serofero_indicators certificates classes exams mark_settings marks public_result_exams public_result_lookup public_results school_gallery school_public_branding school_settings staff students subjects user_roles user_activity user_presence".split())
CLASSES=set("ECD LKG UKG 1 2 3 4 5 6 7 8 9 10 11 12".split())
ROLES=set("admin school_admin teacher viewer super_admin class_teacher subject_teacher".split())
FIELDS={
 "students": "id name nameEnglish nameNepali nameEn class className roll rollNo section active status academicYear iemisId studentId",
 "subjects": "id name nameEnglish nameNepali subject subjectName class className classGroup classes active creditHour creditHours theoryFullMarks practicalFullMarks fullMarks",
 "marks": "id studentId class className subject subjectId term examId examName academicYear scores theory practical fullMarks obtainedMarks total marks grade gpa",
 "attendance": "id studentId class className date dateBs status present attendance academicYear",
 "school_settings": "name nameEnglish nameNepali schoolName schoolNameEnglish schoolNameNepali address addressEnglish addressNepali iemisCode schoolCode logo logoUrl",
 "user_roles": "uid userId email role roles active disabled class classId subject subjectId assignments",
 "staff": "id name nameEnglish nameNepali nameEn email emailId authUid uid userUid firebaseUid",
 "mark_settings": "id class className classGroup subject subjectId examId term components totalFullMarks",
}

def root(p): return f"projects/{p}/databases/(default)/documents/"
def val(d,k):
    v=d.get("fields",{}).get(k,{})
    for t in ("stringValue","integerValue","doubleValue","booleanValue"):
        if t in v:return v[t]
    return None
def open_backup(path,password):
    raw=path.read_bytes()
    n=len(MAGIC)
    if len(raw)>97*1024*1024 or len(raw)<n+44 or not raw.startswith(MAGIC):raise ValueError("Invalid encrypted backup")
    key=Scrypt(salt=raw[n:n+16],length=32,n=2**17,r=8,p=1).derive(password.encode())
    return json.loads(AESGCM(key).decrypt(raw[n+16:n+28],raw[n+28:],raw[:n+28]))
def verify(p,data):
    seen=set();counts=Counter({k:0 for k in data["collectionCounts"]})
    for d in data["documents"]:
        name=d["name"]
        if not name.startswith(root(p)) or len(name[len(root(p)):].split("/"))%2 or name in seen or not d.get("updateTime"):raise ValueError("Invalid document inventory")
        seen.add(name);counts[name.rsplit("/",1)[0]]+=1
    if dict(counts)!=data["collectionCounts"]:raise ValueError("Collection count mismatch")
    users=data["users"]
    if len({u["localId"] for u in users})!=len(users):raise ValueError("Duplicate Auth UID")
def auth_summary(s,t):
    users=s["users"];target=t["users"]
    email=lambda u:str(u.get("email","")).casefold()
    uids={u["localId"]:u for u in target}
    emails={email(u):u for u in target if email(u)}
    c=Counter()
    for u in users:
        a=uids.get(u["localId"]);b=emails.get(email(u)) if email(u) else None
        if a or b:
            if a and email(a)==email(u) and (not b or b["localId"]==u["localId"]):c["same_uid_email"]+=1
            else:c["identity_conflict"]+=1
        else:c["new_account"]+=1
        if u.get("passwordHash"):c["password_hash"]+=1
        if u.get("passwordHash") and u.get("salt"):c["hash_and_salt"]+=1
        if u.get("disabled"):c["disabled"]+=1
    return {k:c[k] for k in ["new_account","same_uid_email","identity_conflict","password_hash","hash_and_salt","disabled"]}
def analyze(data):
    if set(data)!={SOURCE,TARGET}:raise ValueError("Unexpected backup projects")
    s,t=data[SOURCE],data[TARGET]
    verify(SOURCE,s);verify(TARGET,t)
    print("BACKUP INVENTORY VERIFIED")
    print("SOURCE DOCUMENTS:",len(s["documents"]),"TARGET DOCUMENTS:",len(t["documents"]))
    groups={}
    for d in s["documents"]:
        path=d["name"][len(root(SOURCE)):].split("/")
        groups.setdefault(path[0],[]).append(d)
    for name,docs in sorted(groups.items()):
        if name in KNOWN:print("COLLECTION",name,len(docs))
    unknown=[d for k,v in groups.items() if k not in KNOWN for d in v]
    print("UNMAPPED ROOT COLLECTIONS:",len(set(groups)-KNOWN),"DOCUMENTS:",len(unknown))
    print("NESTED DOCUMENTS:",sum(len(d["name"][len(root(SOURCE)):].split("/"))>2 for d in s["documents"]))
    print("SOURCE MISSING ANCESTORS:",len(s["missingAncestors"]))
    print("TARGET CANONICAL SCHOOL EXISTS:",any(d["name"]==root(TARGET)+"schools/"+SCHOOL for d in t["documents"]))
    print("TARGET CANONICAL SCHOOL CHILDREN:",sum(d["name"].startswith(root(TARGET)+"schools/"+SCHOOL+"/") for d in t["documents"]))
    for name,fields in FIELDS.items():
        docs=groups.get(name,[])
        print("SCHEMA",name," ".join(f"{k}={sum(k in d.get('fields',{}) for d in docs)}" for k in fields.split() if any(k in d.get("fields",{}) for d in docs)) or "(none)")
    docs=groups.get("subjects",[])
    print("NEPALI SUBJECT NAMES:",sum(any("\u0900"<=ch<="\u097f" for ch in str(val(d,"name") or val(d,"subjectName") or val(d,"subject") or "")) for d in docs))
    print("SUBJECTS WITH CANONICAL CLASS:",sum(str(val(d,"class")) in CLASSES for d in docs))
    print("SUBJECTS WITH CLASS ARRAY:",sum("arrayValue" in d.get("fields",{}).get("classes",{}) for d in docs))
    roles=Counter(str(val(d,"role") or "").strip().lower() for d in groups.get("user_roles",[]))
    print("KNOWN ROLE COUNTS:",json.dumps({k:v for k,v in roles.items() if k in ROLES},sort_keys=True))
    print("UNRECOGNIZED ROLE RECORDS:",sum(v for k,v in roles.items() if k not in ROLES))
    source_uids={u["localId"] for u in s["users"]}
    print("ROLE DOCUMENT IDS MATCH AUTH:",sum(d["name"].rsplit("/",1)[1] in source_uids for d in groups.get("user_roles",[])))
    print("AUTH SOURCE:",len(s["users"]),"TARGET:",len(t["users"]))
    print("AUTH PLAN:",json.dumps(auth_summary(s,t),sort_keys=True))
    print("SOURCE HASH CONFIG PRESENT:",bool(s.get("hashConfig",{}).get("signerKey")))
    print("REFERENCE FIELDS:",sum('"referenceValue"' in json.dumps(d.get("fields",{})) for d in s["documents"]))
    print("POSSIBLE STORAGE REFERENCES:",sum(any(x in json.dumps(d.get("fields",{})) for x in ("firebasestorage.googleapis.com","gs://","storage.googleapis.com")) for d in s["documents"]))
    print("DRY RUN COMPLETE; FIREBASE WRITES: ZERO")
    print("No automatic mapping or password overwrite authorized; Storage and restore rehearsal remain separate.")
if __name__=="__main__":
    try:
        warnings.simplefilter("error",getpass.GetPassWarning)
        if len(sys.argv)!=2:raise ValueError("Specify encrypted backup path")
        analyze(open_backup(Path(sys.argv[1]).expanduser(),getpass.getpass("Backup passphrase: ")))
    except Exception as e:
        print("DRY RUN STOPPED:",type(e).__name__,str(e) if isinstance(e,ValueError) else "",file=sys.stderr)
        sys.exit(1)
