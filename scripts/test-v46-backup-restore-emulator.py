"""Synthetic-only encrypted snapshot restoration into a local Firestore emulator.
This is a rehearsal test, NOT a production restore command. No ADC or cloud URLs.
"""
import importlib.util
import json
import os
from pathlib import Path
from urllib.request import Request, build_opener, HTTPRedirectHandler
from urllib.error import HTTPError

spec=importlib.util.spec_from_file_location("backup",Path(__file__).with_name("v46-local-firestore-backup.py"))
backup=importlib.util.module_from_spec(spec)
spec.loader.exec_module(backup)
PROJECT="demo-smss-v46-backup-test"
HOST="127.0.0.1:8080"
TARGET=f"projects/{PROJECT}/databases/(default)/documents"
BASE=f"http://{HOST}/v1/"
class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs):
        raise ValueError("Unexpected emulator redirect")
opener=build_opener(NoRedirect())
def call(method,path,payload=None,expected=200):
    if not (path.startswith(TARGET+"/") or path==TARGET+":commit"):
        raise ValueError("Emulator target guard")
    req=Request(BASE+path,data=json.dumps(payload).encode() if payload is not None else None,
                method=method,headers={"Content-Type":"application/json","Authorization":"Bearer owner"})
    try:
        with opener.open(req,timeout=20) as response:
            assert response.status==expected
            return json.load(response)
    except HTTPError as e:
        if e.code==expected: return None
        raise

def remap(value):
    # Preserve typed REST field values; remap only referenceValue fields inside
    # typed values, not unrelated text containing a production path.
    if isinstance(value,list): return [remap(x) for x in value]
    if isinstance(value,dict):
        if set(value)=={"referenceValue"}:
            ref=value["referenceValue"]
            if not isinstance(ref,str) or not ref.startswith(backup.ROOT+"/"):
                raise ValueError("Cross-database reference requires manual review")
            return {"referenceValue":TARGET+ref[len(backup.ROOT):]}
        return {k:remap(v) for k,v in value.items()}
    return value

def main():
    if os.environ.get("FIRESTORE_EMULATOR_HOST") not in ("localhost:8080",HOST):
        raise SystemExit("Local emulator required; never connect to cloud")
    src=backup.ROOT
    t="2026-01-01T00:00:00Z"
    def doc(path,fields):
        return {"name":src+"/"+path,"fields":fields,"createTime":t,"updateTime":t}
    docs=[
        doc("students/synthetic-one",{"roll":{"integerValue":"9223372036854775807"},"name":{"stringValue":"Synthetic Student"}}),
        doc("students/missing-parent/attendance/synthetic-day",{"present":{"booleanValue":True},"date":{"timestampValue":t}}),
        doc("question_bank/synthetic-one",{"fields":{"mapValue":{"fields":{"owner":{"referenceValue":src+"/students/synthetic-one"},"note":{"stringValue":src+"/students/synthetic-one"},"arr":{"arrayValue":{"values":[{"nullValue":None},{"bytesValue":"AAE="}]}}}}}})
    ]
    counts={x["name"].rsplit("/",1)[0]:1 for x in docs}
    payload={"format":"SMSS-Firestore-REST-Snapshot","version":1,"project":backup.PROJECT,"database":"(default)","readTime":t,
             "scope":"Synthetic rehearsal only","documents":docs,"missingAncestors":[src+"/students/missing-parent"],"collectionCounts":counts,
             "documentCount":3,"collectionCount":3,"restoreRehearsalVerified":False}
    sealed=backup.seal(payload,"synthetic-only-passphrase")
    recovered=backup.unseal(sealed,"synthetic-only-passphrase")
    backup.validate(recovered)
    writes=[]
    for original in recovered["documents"]:
        name=TARGET+original["name"][len(src):]
        fields=remap(original["fields"])
        writes.append({"update":{"name":name,"fields":fields},"currentDocument":{"exists":False}})
    call("POST",TARGET+":commit",{"writes":writes})
    for w in writes:
        expected=w["update"]
        actual=call("GET",expected["name"])
        assert actual["name"]==expected["name"]
        assert actual["fields"]==expected["fields"],"Restored typed field mismatch"
    call("GET",TARGET+"/students/missing-parent",expected=404)
    try: call("POST",TARGET+":commit",{"writes":writes})
    except HTTPError as e: assert e.code in (400,409,412)
    else: raise AssertionError("Restore could overwrite existing documents")
    for w in writes:
        expected=w["update"]
        assert call("GET",expected["name"])["fields"]==expected["fields"]
    try: remap({"referenceValue":"projects/another-school/databases/(default)/documents/students/a"})
    except ValueError: pass
    else: raise AssertionError("Cross-project reference accepted")
    print("PASS synthetic encrypted snapshot -> isolated emulator: 3 documents, nested orphan, int64, bytes, timestamp, typed references, and overwrite protection.")
    print("No actual school backup or real restore rehearsal is certified.")

if __name__=="__main__": main()
