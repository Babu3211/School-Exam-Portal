"""Create-only private V47 archive of exact V46 Firestore snapshot fields.
Never writes to V46, modifies Auth, registers/activates schools, or changes rules.
Run by the authorized owner in Cloud Shell; all source data stays private.
"""
import getpass, hashlib, json, os, subprocess, sys, warnings
from pathlib import Path
from collections import Counter
import requests
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.scrypt import Scrypt

SOURCE="exam-portal-smss-95016"
TARGET="smss-exam-portal-v47"
SCHOOL="300160003"
RULES_BLOB="6866b33e01f195fc87424905761bea71d0d575e5"
MAGIC=b"SMSS-MIGRATION-V1"
MAX_BYTES=96*1024*1024
LIMIT=5000
def canonical(data):
    return json.dumps(data,ensure_ascii=False,sort_keys=True,separators=(",",":"),allow_nan=False).encode()
def root(p):
    return f"projects/{p}/databases/(default)/documents"
def open_backup(path,password):
    if path.stat().st_size>MAX_BYTES+128: raise RuntimeError("Backup size limit")
    raw=path.read_bytes();n=len(MAGIC)
    if not raw.startswith(MAGIC) or len(raw)<n+44:raise RuntimeError("Invalid encrypted backup")
    key=Scrypt(salt=raw[n:n+16],length=32,n=2**17,r=8,p=1).derive(password.encode())
    return json.loads(AESGCM(key).decrypt(raw[n+16:n+28],raw[n+28:],raw[:n+28]))
def make_plan(backup):
    if set(backup)!={SOURCE,TARGET}:raise RuntimeError("Wrong backup scope")
    src=backup[SOURCE];docs=src["documents"]
    if not 1<=len(docs)<=LIMIT or src["missingAncestors"]:raise RuntimeError("Incomplete or oversized source snapshot")
    count=Counter({k:0 for k in src["collectionCounts"]});seen=set()
    prefix=root(SOURCE)+"/"
    for d in docs:
        name=d["name"]
        if not name.startswith(prefix) or name in seen or not d.get("createTime") or not d.get("updateTime"):raise RuntimeError("Invalid document inventory")
        parts=name[len(prefix):].split("/")
        if len(parts)%2 or any(not x or x in (".","..") for x in parts):raise RuntimeError("Invalid document path")
        if not isinstance(d.get("fields",{}),dict):raise RuntimeError("Invalid typed fields")
        seen.add(name);count[name.rsplit("/",1)[0]]+=1
    if dict(count)!=src["collectionCounts"]:raise RuntimeError("Collection count mismatch")
    identity=[{"name":d["name"],"fields":d.get("fields",{})} for d in sorted(docs,key=lambda d:d["name"])]
    digest=hashlib.sha256(canonical({"readTime":src["readTime"],"documents":identity})).hexdigest()
    archive=root(TARGET)+"/v47_migration_archives/"+SCHOOL+"/snapshots/"+digest
    planned={archive+"/"+d["name"][len(prefix):]:d["fields"] for d in identity}
    manifest={"schoolId":{"stringValue":SCHOOL},"sourceProject":{"stringValue":SOURCE},
              "sourceReadTime":{"stringValue":src["readTime"]},"sourceDigest":{"stringValue":digest},
              "documentCount":{"integerValue":str(len(planned))},
              "state":{"stringValue":"ARCHIVE_VERIFIED_NOT_OPERATIONAL"}}
    return archive,planned,manifest
def self_test():
    p=root(SOURCE)+"/subjects/abc"
    d={"name":p,"fields":{"name":{"stringValue":"नेपाली"},"n":{"integerValue":"9223372036854775807"}},"createTime":"a","updateTime":"b"}
    b={SOURCE:{"documents":[d],"collectionCounts":{p.rsplit("/",1)[0]:1},"missingAncestors":[],"readTime":"t"},TARGET:{}}
    archive,planned,manifest=make_plan(b)
    assert archive.startswith(root(TARGET)+"/v47_migration_archives/300160003/")
    assert planned[archive+"/subjects/abc"]==d["fields"]
    assert manifest["documentCount"]["integerValue"]=="1"
    assert make_plan(b)==(archive,planned,manifest)
    b[SOURCE]["documents"].append(d)
    try:make_plan(b)
    except RuntimeError:pass
    else:raise AssertionError("Duplicate accepted")
    print("PASS archive target isolation, original typed Unicode, deterministic identity and duplicate rejection")
def main(path):
    if os.environ.get("CI") or os.environ.get("GITHUB_ACTIONS"):raise RuntimeError("Live copy forbidden in CI")
    warnings.simplefilter("error",getpass.GetPassWarning)
    archive,planned,manifest=make_plan(open_backup(path,getpass.getpass("Backup passphrase: ")))
    token=subprocess.check_output(["gcloud","auth","print-access-token"],text=True).strip()
    session=requests.Session()
    headers={"Authorization":"Bearer "+token,"x-goog-user-project":TARGET}
    def call(url,body=None):
        response=session.request("GET" if body is None else "POST",url,headers=headers,json=body,timeout=(10,90),allow_redirects=False)
        if response.status_code!=200:raise RuntimeError("Target API HTTP "+str(response.status_code)+"; stopped, rerun same snapshot to resume after review")
        return response.json()
    rulesbase="https://firebaserules.googleapis.com/v1/"
    release=call(rulesbase+"projects/"+TARGET+"/releases/cloud.firestore")
    name=release.get("rulesetName","")
    if not name.startswith("projects/"+TARGET+"/rulesets/"):raise RuntimeError("Wrong active rules project")
    files=call(rulesbase+name).get("source",{}).get("files",[])
    if len(files)!=1:raise RuntimeError("Unexpected rules source")
    raw=files[0]["content"].encode()
    blob=hashlib.sha1(("blob "+str(len(raw))+"\0").encode()+raw).hexdigest()
    if blob!=RULES_BLOB:raise RuntimeError("Live rules differ from reviewed deny-by-default source; no copy")
    print("PRIVATE ARCHIVE RULES VERIFIED")
    base="https://firestore.googleapis.com/v1/projects/"+TARGET+"/databases/(default)/documents:"
    def read_batch(names):
        if not names:return {}
        response=call(base+"batchGet",{"documents":names})
        if not isinstance(response,list):raise RuntimeError("Unexpected batch response")
        out={}
        for item in response:
            found=item.get("found")
            name=found["name"] if found else item.get("missing")
            if name not in names or name in out:raise RuntimeError("Unexpected batch identity")
            out[name]=found.get("fields",{}) if found else None
        if set(out)!=set(names):raise RuntimeError("Incomplete batch response")
        return out
    def check(names,expected):
        values=read_batch(names)
        for name,fields in values.items():
            if fields is not None and canonical(fields)!=canonical(expected[name]):
                raise RuntimeError("Existing destination differs; no overwrite")
        return [name for name in names if values[name] is None]
    def create(names,expected):
        if not names:return
        if any(not n.startswith(archive+"/") and n!=archive for n in names):raise RuntimeError("Wrong archive path")
        body={"writes":[{"update":{"name":n,"fields":expected[n]},"currentDocument":{"exists":False}} for n in names]}
        result=call(base+"commit",body)
        if len(result.get("writeResults",[]))!=len(names):raise RuntimeError("Incomplete commit result; resume verification")
    names=sorted(planned);batches=[names[i:i+50] for i in range(0,len(names),50)]
    missing=[]
    for batch in batches:missing.extend(check(batch,planned))
    manifest_missing=check([archive],{archive:manifest})
    if not manifest_missing and missing:raise RuntimeError("Archive manifest already exists but data incomplete")
    print("SOURCE DOCUMENTS:",len(names),"ALREADY IDENTICAL:",len(names)-len(missing),"TO COPY:",len(missing))
    print("Target private archive only; existing schools and Auth accounts remain untouched.")
    if input("Type COPY-V46-ARCHIVE to proceed: ").strip()!="COPY-V46-ARCHIVE":raise RuntimeError("Copy not confirmed")
    for i in range(0,len(missing),50):
        create(missing[i:i+50],planned)
        print("ARCHIVE COPIED:",min(i+50,len(missing)),"/",len(missing),flush=True)
    for batch in batches:
        if check(batch,planned):raise RuntimeError("Archive verification incomplete")
    if manifest_missing:create([archive],{archive:manifest})
    if check([archive],{archive:manifest}):raise RuntimeError("Manifest verification incomplete")
    print("ARCHIVE VERIFIED DOCUMENTS:",len(names))
    print("V46 WRITES: ZERO; AUTH CHANGES: ZERO; V47 SCHOOL ACTIVATION: ZERO")
    print("Private exact Firestore field copy complete; not yet operational migration. Storage files and current source changes are separate.")
if __name__=="__main__":
    try:
        if sys.argv[1:]==["--self-test"]:self_test()
        elif len(sys.argv)==2:main(Path(sys.argv[1]).expanduser())
        else:raise RuntimeError("Supply encrypted backup path")
    except (Exception,KeyboardInterrupt) as e:
        print("ARCHIVE STOPPED:",type(e).__name__,str(e) if isinstance(e,RuntimeError) else "",file=sys.stderr)
        sys.exit(1)
