"""Local-only Firestore snapshot candidate; never writes to a Firestore database.
Requires local authorized ADC, cryptography, and explicit operator confirmation.
No production credentials or data are used by the synthetic self-test.
"""
import argparse
from collections import Counter
from datetime import datetime, timezone, timedelta
import getpass
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import sys
from urllib.parse import quote

PROJECT = "exam-portal-smss-95016"
ROOT = f"projects/{PROJECT}/databases/(default)/documents"
MAGIC = b"SMSS-FS-SNAPSHOT-V1\x00"
MAX_BYTES = 96 * 1024 * 1024

def canonical(obj):
    return json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",",":"), allow_nan=False).encode("utf-8")

def snapshot(api, read_time, max_docs=5000, max_requests=10000):
    docs = []
    counts = Counter()
    collections = set()
    missing = set()
    visited = set()
    requests = 0
    size = 0

    def request(method, path, args):
        nonlocal requests
        requests += 1
        if requests > max_requests:
            raise ValueError("Request cap exceeded; no complete backup produced")
        return api(method, path, {**args, "readTime":read_time})

    def pages(method, path, args, key):
        token = None
        seen_tokens = set()
        while True:
            result = request(method, path, {**args, **({"pageToken":token} if token else {})})
            values = result.get(key, [])
            if not isinstance(values, list):
                raise ValueError("Invalid response list")
            yield from values
            token = result.get("nextPageToken")
            if not token: break
            if not isinstance(token,str) or token in seen_tokens:
                raise ValueError("Repeated pagination token")
            seen_tokens.add(token)

    def walk(parent):
        nonlocal size
        if parent in visited:
            raise ValueError("Duplicate parent")
        visited.add(parent)
        if len(visited) > max_docs + 1:
            raise ValueError("Document traversal cap exceeded")
        ids = list(pages("POST", parent+":listCollectionIds", {"pageSize":100}, "collectionIds"))
        if len(ids)!=len(set(ids)): raise ValueError("Duplicate collection ID")
        for cid in sorted(ids):
            if not isinstance(cid,str) or not cid or "/" in cid:
                raise ValueError("Invalid collection ID")
            path=parent+"/"+cid
            collections.add(path)
            counts[path] += 0
            seen=set()
            for doc in pages("GET",path,{"pageSize":100,"showMissing":"true"},"documents"):
                name=doc.get("name","")
                if not name.startswith(path+"/") or "/" in name[len(path)+1:] or name==path+"/" or name in seen:
                    raise ValueError("Invalid or repeated document path")
                seen.add(name)
                if len(docs)+len(missing)>=max_docs:
                    raise ValueError("Document cap exceeded; no complete backup produced")
                # Firestore returns missing ancestors without create/update time.
                if not doc.get("createTime") and not doc.get("updateTime"):
                    if doc.get("fields"): raise ValueError("Unexpected missing document fields")
                    missing.add(name)
                elif not doc.get("createTime") or not doc.get("updateTime") or not isinstance(doc.get("fields",{}),dict):
                    raise ValueError("Invalid document metadata")
                else:
                    # Keep Firestore REST typed values, including int64 strings, references,
                    # timestamps, bytes, maps and arrays. Do not convert into lossy JS values.
                    size += len(canonical(doc))
                    if size>MAX_BYTES: raise ValueError("Snapshot memory cap exceeded")
                    docs.append(doc)
                    counts[path]+=1
                walk(name)
    walk(ROOT)
    docs.sort(key=lambda d:d["name"])
    payload={"format":"SMSS-Firestore-REST-Snapshot","version":1,"project":PROJECT,"database":"(default)",
        "readTime":read_time,"scope":"Firestore document data only","documents":docs,
        "missingAncestors":sorted(missing),"collectionCounts":dict(sorted(counts.items())),
        "documentCount":len(docs),"collectionCount":len(collections),"apiRequests":requests,
        "restoreRehearsalVerified":False}
    raw=canonical(payload)
    if len(raw)>MAX_BYTES: raise ValueError("Snapshot byte cap exceeded")
    return payload

def seal(payload,password):
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    from cryptography.hazmat.primitives.kdf.scrypt import Scrypt
    salt=secrets.token_bytes(16); nonce=secrets.token_bytes(12)
    key=Scrypt(salt=salt,length=32,n=2**17,r=8,p=1).derive(password.encode())
    header=MAGIC+salt+nonce
    return header+AESGCM(key).encrypt(nonce,canonical(payload),header)

def unseal(raw,password):
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    from cryptography.hazmat.primitives.kdf.scrypt import Scrypt
    n=len(MAGIC)
    if len(raw)<n+44 or len(raw)>MAX_BYTES+128 or not raw.startswith(MAGIC):
        raise ValueError("Unrecognized encrypted snapshot")
    salt=raw[n:n+16]; nonce=raw[n+16:n+28]; header=raw[:n+28]
    key=Scrypt(salt=salt,length=32,n=2**17,r=8,p=1).derive(password.encode())
    return json.loads(AESGCM(key).decrypt(nonce,raw[n+28:],header))

def validate(payload):
    if payload.get("format")!="SMSS-Firestore-REST-Snapshot" or payload.get("version")!=1 or payload.get("project")!=PROJECT:
        raise ValueError("Wrong snapshot scope")
    docs=payload["documents"]
    counts=Counter({k:0 for k in payload["collectionCounts"]})
    names=set()
    for doc in docs:
        name=doc["name"]
        if not name.startswith(ROOT+"/") or name in names or not doc.get("createTime") or not doc.get("updateTime"):
            raise ValueError("Invalid document inventory")
        names.add(name)
        counts[name.rsplit("/",1)[0]]+=1
    if dict(counts)!=payload["collectionCounts"] or len(docs)!=payload["documentCount"] or len(counts)!=payload["collectionCount"]:
        raise ValueError("Inventory mismatch")
    return True

def self_test():
    from cryptography.exceptions import InvalidTag
    rt="2026-01-01T00:00:00.000000Z"
    a=ROOT+"/students"
    orphan=a+"/orphan"
    actual=a+"/one"
    nested=orphan+"/history"
    timestamp="2026-01-01T00:00:00Z"
    d=lambda name,fields:{"name":name,"fields":fields,"createTime":timestamp,"updateTime":timestamp}
    calls=[]
    def fake(method,path,args):
        assert args["readTime"]==rt
        calls.append((method,path,args.get("pageToken")))
        if method=="POST":
            if path==ROOT+":listCollectionIds":
                return {"collectionIds":["students"],"nextPageToken":"second"} if not args.get("pageToken") else {"collectionIds":["question_bank"]}
            if path==orphan+":listCollectionIds": return {"collectionIds":["history"]}
            return {}
        assert method=="GET" and args["showMissing"]=="true"
        if path==a:
            return {"documents":[d(actual,{"x":{"integerValue":"9223372036854775807"}})],"nextPageToken":"next"} if not args.get("pageToken") else {"documents":[{"name":orphan}]}
        if path==nested: return {"documents":[d(nested+"/record",{"data":{"bytesValue":"AAE="}})]}
        if path==ROOT+"/question_bank": return {"documents":[d(path+"/sample",{})]}
        raise AssertionError("Unexpected request")
    p=snapshot(fake,rt)
    assert p["documentCount"]==3 and p["collectionCount"]==3 and p["missingAncestors"]==[orphan]
    assert validate(p)
    raw=seal(p,"synthetic-test-passphrase")
    assert b"9223372036854775807" not in raw
    assert unseal(raw,"synthetic-test-passphrase")==p
    try: unseal(raw[:-1]+bytes([raw[-1]^1]),"synthetic-test-passphrase")
    except InvalidTag: pass
    else: raise AssertionError("Tampered ciphertext accepted")
    for limits in [{"max_docs":1},{"max_requests":1}]:
        try: snapshot(fake,rt,**limits)
        except ValueError: pass
        else: raise AssertionError("Incomplete snapshot accepted")
    print("PASS local synthetic pagination, unknown collections, missing ancestors, typed fields, limits, encrypted roundtrip and tamper rejection")

def local_api():
    import google.auth
    from google.auth.transport.requests import AuthorizedSession
    credentials,_=google.auth.default(scopes=["https://www.googleapis.com/auth/datastore"])
    session=AuthorizedSession(credentials)
    def call(method,path,args):
        url="https://firestore.googleapis.com/v1/"+quote(path,safe="/():")
        if method=="GET" and path.startswith(ROOT+"/"):
            res=session.get(url,params=args,timeout=45,allow_redirects=False)
        elif method=="POST" and path.startswith(ROOT) and path.endswith(":listCollectionIds"):
            res=session.post(url,json=args,timeout=45,allow_redirects=False)
        else: raise ValueError("Read-only request guard rejected method")
        if res.status_code!=200:
            raise ValueError("Firestore read failed, HTTP "+str(res.status_code))
        return res.json()
    return call

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--self-test",action="store_true")
    parser.add_argument("--output",type=Path)
    parser.add_argument("--verify",type=Path)
    parser.add_argument("--confirm")
    parser.add_argument("--max-docs",type=int,default=5000)
    parser.add_argument("--max-requests",type=int,default=10000)
    args=parser.parse_args()
    if args.self_test:
        self_test(); return
    if os.environ.get("CI") or os.environ.get("GITHUB_ACTIONS"):
        raise ValueError("Real backup forbidden in CI")
    if args.verify:
        password=getpass.getpass("Snapshot passphrase: ")
        if args.verify.stat().st_size>MAX_BYTES+128: raise ValueError("File too large")
        data=unseal(args.verify.read_bytes(),password)
        validate(data)
        print("Encrypted inventory verified:",data["documentCount"],"documents;",data["collectionCount"],"collections; readTime",data["readTime"])
        print("Restore rehearsal has NOT been verified.")
        return
    if not args.output or args.confirm!="READ-ONLY-V46-BACKUP" or not (1<=args.max_docs<=15000 and 1<=args.max_requests<=20000):
        raise ValueError("Explicit local output, bounded limits and READ-ONLY-V46-BACKUP confirmation required")
    output=args.output.expanduser().resolve()
    # Keep encrypted output outside the working repository, even if launched from elsewhere.
    repo=Path(__file__).resolve().parent.parent
    if output==repo or repo in output.parents or output.exists() or output.suffix!=".enc":
        raise ValueError("Use a new .enc file outside the repository")
    password=getpass.getpass("New backup passphrase (at least 16 characters): ")
    if len(password)<16 or password!=getpass.getpass("Repeat passphrase: "):
        raise ValueError("Passphrase too short or confirmation mismatch")
    rt=(datetime.now(timezone.utc)-timedelta(seconds=30)).isoformat(timespec="microseconds").replace("+00:00","Z")
    data=snapshot(local_api(),rt,args.max_docs,args.max_requests)
    validate(data)
    encrypted=seal(data,password)
    assert validate(unseal(encrypted,password))
    # Exclusive output prevents overwriting any existing backup. Never write plaintext.
    fd=os.open(output,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
    try:
        with os.fdopen(fd,"wb") as f:
            f.write(encrypted); f.flush(); os.fsync(f.fileno())
    except BaseException:
        output.unlink(missing_ok=True)
        raise
    print("Encrypted snapshot candidate:",data["documentCount"],"documents;",data["collectionCount"],"collections;",data["apiRequests"],"API requests")
    print("Ciphertext SHA256:",hashlib.sha256(encrypted).hexdigest())
    print("Not a verified disaster-recovery backup until isolated restore and scope review pass. No data written to Firestore.")

if __name__=="__main__":
    try: main()
    except Exception as exc:
        # Avoid dumping data, credentials or remote response bodies.
        print("Snapshot operation failed:",type(exc).__name__,str(exc) if isinstance(exc,ValueError) else "",file=sys.stderr)
        sys.exit(1)
