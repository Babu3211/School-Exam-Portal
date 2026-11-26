"""Operator-only, read-only backup from the two named Firebase projects.
Never prints accounts, credentials, hashes or Firestore document contents.
Uses active Cloud Shell user credentials; no IAM changes or Firebase writes.
"""
import concurrent.futures as cf
from collections import Counter
from datetime import datetime, timezone, timedelta
import getpass, json, os, secrets, subprocess, sys, threading, warnings
from pathlib import Path
from urllib.parse import quote
import requests
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.scrypt import Scrypt

PROJECTS=("exam-portal-smss-95016","smss-exam-portal-v47")
MAGIC=b"SMSS-MIGRATION-V1"
LIMIT=5000
MAX_BYTES=96*1024*1024
LOCAL=threading.local()

def api_for(p,token):
    def req(url,body=None,params=None):
        if not hasattr(LOCAL,"session"):
            LOCAL.session=requests.Session()
        headers={"Authorization":"Bearer "+token,"x-goog-user-project":p}
        r=LOCAL.session.request("POST" if body is not None else "GET",url,
            headers=headers,json=body,params=params,timeout=(10,45),allow_redirects=False)
        if r.status_code!=200:
            raise RuntimeError("Read API HTTP "+str(r.status_code))
        result=r.json()
        if not isinstance(result,dict) or "error" in result:
            raise RuntimeError("Unexpected read response")
        return result
    return req

def pages(req,url,key,args,post=False,token_key="pageToken"):
    args=dict(args)
    seen=set()
    while True:
        r=req(url,body=args) if post else req(url,params=args)
        values=r.get(key,[])
        if not isinstance(values,list): raise RuntimeError("Invalid page")
        yield from values
        token=r.get("nextPageToken")
        if not token: break
        if token in seen: raise RuntimeError("Repeated page token")
        seen.add(token);args[token_key]=token
        if len(seen)>100: raise RuntimeError("Pagination safety cap")

def inventory(req,p,rt,workers=10):
    root=f"projects/{p}/databases/(default)/documents"
    base="https://firestore.googleapis.com/v1/"
    def walk(parent):
        collections=list(pages(req,base+quote(parent,safe="/()")+":listCollectionIds",
            "collectionIds",{"pageSize":100,"readTime":rt},True))
        if len(collections)!=len(set(collections)): raise RuntimeError("Duplicate collection")
        found=[];counts={}
        for c in sorted(collections):
            if not isinstance(c,str) or not c or "/" in c: raise RuntimeError("Invalid collection ID")
            path=parent+"/"+c
            counts[path]=0
            for d in pages(req,base+quote(path,safe="/()"),"documents",
                {"pageSize":100,"showMissing":"true","readTime":rt}):
                name=d.get("name","")
                if not name.startswith(path+"/") or not name[len(path)+1:] or "/" in name[len(path)+1:]:
                    raise RuntimeError("Invalid document path")
                if d.get("createTime") and d.get("updateTime"):
                    if not isinstance(d.get("fields",{}),dict): raise RuntimeError("Invalid fields")
                    counts[path]+=1
                elif d.get("createTime") or d.get("updateTime") or d.get("fields"):
                    raise RuntimeError("Invalid missing ancestor")
                found.append(d)
                if len(found)>LIMIT: raise RuntimeError("Parent safety cap")
        return found,counts
    docs=[];missing=[];counts=Counter();seen={root};frontier=[root];checked=0;size=0
    with cf.ThreadPoolExecutor(max_workers=workers) as pool:
        while frontier:
            following=[]
            for found,cc in pool.map(walk,frontier):
                checked+=1
                if set(cc)&set(counts): raise RuntimeError("Repeated collection path")
                counts.update(cc)
                for d in found:
                    name=d["name"]
                    if name in seen or len(seen)>LIMIT: raise RuntimeError("Duplicate document or safety cap")
                    seen.add(name);following.append(name)
                    if d.get("updateTime"):
                        docs.append(d)
                        size+=len(json.dumps(d,ensure_ascii=False).encode())
                        if size>MAX_BYTES: raise RuntimeError("Snapshot size cap")
                    else: missing.append(name)
                if checked==1 or checked%100==0:
                    print(p,"PARENTS CHECKED:",checked,"DOCUMENTS FOUND:",len(docs),flush=True)
            frontier=following
    if len(docs)!=sum(counts.values()): raise RuntimeError("Inventory mismatch")
    return sorted(docs,key=lambda x:x["name"]),sorted(missing),dict(counts)

def main():
    if os.environ.get("CI") or os.environ.get("GITHUB_ACTIONS"): raise RuntimeError("Live backup not permitted in CI")
    warnings.simplefilter("error",getpass.GetPassWarning)
    os.umask(0o077)
    password=getpass.getpass("New backup passphrase (16+ characters): ")
    if len(password)<16 or password!=getpass.getpass("Repeat passphrase: "):
        raise RuntimeError("Passphrase mismatch or too short")
    token=subprocess.check_output(["gcloud","auth","print-access-token"],text=True).strip()
    backup={}
    for p in PROJECTS:
        print("BACKUP:",p,flush=True)
        req=api_for(p,token)
        users=list(pages(req,f"https://identitytoolkit.googleapis.com/v1/projects/{p}/accounts:batchGet",
            "users",{"maxResults":1000},token_key="nextPageToken"))
        if len(users)>3000 or len({u["localId"] for u in users})!=len(users): raise RuntimeError("Auth inventory cap or duplicate")
        config=req(f"https://identitytoolkit.googleapis.com/admin/v2/projects/{p}/config")
        signin=config.get("signIn",{})
        hc=signin.get("hashConfig") or signin.get("email",{}).get("hashConfig") or {}
        print("AUTH ACCOUNTS:",len(users),"HASHES:",sum(bool(u.get("passwordHash")) for u in users),"HASH CONFIG AVAILABLE:",bool(hc.get("signerKey")),flush=True)
        rt=(datetime.now(timezone.utc)-timedelta(seconds=30)).isoformat(timespec="microseconds").replace("+00:00","Z")
        docs,missing,counts=inventory(req,p,rt)
        backup[p]={"readTime":rt,"documents":docs,"missingAncestors":missing,
            "collectionCounts":counts,"users":users,"hashConfig":hc}
        print("DOCUMENTS:",len(docs),"COLLECTIONS:",len(counts),"MISSING ANCESTORS:",len(missing),flush=True)
    raw=json.dumps(backup,ensure_ascii=False,separators=(",",":"),allow_nan=False).encode()
    if len(raw)>MAX_BYTES: raise RuntimeError("Backup size limit")
    salt,nonce=secrets.token_bytes(16),secrets.token_bytes(12)
    key=Scrypt(salt=salt,length=32,n=2**17,r=8,p=1).derive(password.encode())
    header=MAGIC+salt+nonce
    encrypted=AESGCM(key).encrypt(nonce,raw,header)
    if AESGCM(key).decrypt(nonce,encrypted,header)!=raw: raise RuntimeError("Encryption verification failed")
    folder=Path.home()/"smss-migration"
    folder.mkdir(mode=0o700,exist_ok=True);folder.chmod(0o700)
    path=folder/("backup-"+datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")+".enc")
    with path.open("xb") as f:
        f.write(header+encrypted);f.flush();os.fsync(f.fileno())
    print("ENCRYPTED BACKUP CREATED:",path)
    print("ENCRYPTION CHECK: PASS")
    print("FIREBASE WRITES: ZERO")
    print("Storage and restore rehearsal not included; Auth and Firestore are separate snapshots.")

def self_test():
    p=PROJECTS[0];root=f"projects/{p}/databases/(default)/documents";ts="2026-01-01T00:00:00Z"
    a=root+"/subjects/a";orphan=root+"/subjects/missing";b=orphan+"/history/b"
    def fake(url,body=None,params=None):
        if url.endswith(":listCollectionIds"):
            if root+":listCollectionIds" in url: return {"collectionIds":["subjects"]}
            if orphan+":listCollectionIds" in url: return {"collectionIds":["history"]}
            return {}
        if url.endswith("/subjects"): return {"documents":[{"name":a,"createTime":ts,"updateTime":ts,"fields":{"name":{"stringValue":"नेपाली"}}},{"name":orphan}]}
        if url.endswith("/history"): return {"documents":[{"name":b,"createTime":ts,"updateTime":ts,"fields":{"value":{"integerValue":"9223372036854775807"}}}]}
        raise AssertionError("Unexpected request")
    d,m,c=inventory(fake,p,ts,2)
    assert len(d)==2 and m==[orphan] and sum(c.values())==2
    assert d[0]["fields"]["name"]["stringValue"]=="नेपाली"
    print("PASS recursive concurrent snapshot, missing parent, Unicode and typed values")

if __name__=="__main__":
    try:
        if sys.argv==[sys.argv[0],"--self-test"]: self_test()
        elif len(sys.argv)==1: main()
        else: raise RuntimeError("Unknown arguments")
    except (Exception,KeyboardInterrupt) as e:
        print("BACKUP STOPPED:",type(e).__name__,str(e) if isinstance(e,RuntimeError) else "",file=sys.stderr)
        sys.exit(1)
