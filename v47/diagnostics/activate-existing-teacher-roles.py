"""Owner-only review/activation of already staged V47 memberships and duties.
Reuse the existing V46 role planner. No new accounts, assignments, deletions,
source writes or academic writes. A mismatched account is held as a whole.
"""
import os, sys, json, hashlib, subprocess, importlib.util, re
from pathlib import Path
from collections import Counter
import requests
SOURCE="exam-portal-smss-95016"
TARGET="smss-exam-portal-v47"
SID="300160003"
FS="https://firestore.googleapis.com/v1/"
RB="https://firebaserules.googleapis.com/v1/"
RULES_BLOB="174dbb914674c4389695d808a083a2784a251217"
def root(p):return "projects/"+p+"/databases/(default)/documents"
BASE=root(TARGET)+"/schools/"+SID
def scalar(f,k):
    v=f.get(k,{})
    return v.get("stringValue",v.get("booleanValue"))
def indexed(rows,prefix):
    out={}
    for d in rows:
        n=d["name"]
        if not n.startswith(prefix+"/") or not n[len(prefix)+1:] or "/" in n[len(prefix)+1:] or n in out or not d.get("updateTime"):raise ValueError("Invalid inventory identity")
        out[n]=d
    return out
def select_changes(expected,members,assignments,held_details=None,plan_reasons=None):
    writes=[];counts=Counter()
    byuid={}
    for n,d in assignments.items():
        uid=scalar(d["fields"],"uid")
        if not uid or n!=BASE+"/teacher_assignments/"+":".join(str(scalar(d["fields"],k)) for k in ("schoolId","uid","classId","subjectId")) or scalar(d["fields"],"schoolId")!=SID:raise ValueError("Invalid staged assignment scope")
        byuid.setdefault(uid,set()).add(n)
    for n,d in members.items():
        f=d["fields"];uid=scalar(f,"uid");role=scalar(f,"role")
        if n!=BASE+"/members/"+str(uid) or scalar(f,"schoolId")!=SID:raise ValueError("Invalid membership scope")
        if role=="school_admin":continue
        if role not in ("teacher","viewer"):raise ValueError("Unexpected membership role")
        planned={k:v for k,v in expected.get(uid,{}).items()}
        actual={n:d,**{k:assignments[k] for k in byuid.get(uid,set())}}
        if not planned or set(planned)!=set(actual):
            counts["held_identity_or_duties"]+=1
            if held_details is not None:
                if not planned:
                    labels=(plan_reasons or {}).get(uid,["no matching live source account"])
                    held_details.update(labels or ["no verified current role plan"])
                else:
                    if set(planned)-set(actual):held_details["missing staged duty records"]+=1
                    if set(actual)-set(planned):held_details["additional staged duty records"]+=1
            continue
        if any(type(scalar(x["fields"],"active")) is not bool or {k:v for k,v in x["fields"].items() if k!="active"}!={k:v for k,v in planned[key].items() if k!="active"} for key,x in actual.items()):
            counts["held_field_mismatch"]+=1
            if held_details is not None:held_details["staged role or duty fields differ"]+=1
            continue
        counts["verified_"+role]+=1
        for key,x in actual.items():
            if scalar(x["fields"],"active") is True:counts["already_active_records"]+=1;continue
            counts["activate_memberships" if key==n else "activate_assignments"]+=1
            writes.append({"update":{"name":key,"fields":{"active":{"booleanValue":True}}},"updateMask":{"fieldPaths":["active"]},"currentDocument":{"updateTime":x["updateTime"]}})
    return writes,dict(counts)
def held_subject_details(items,catalog,canonical_class,subject_key):
    # Inspect only the failing source duties; never include a UID, email or password.
    rows=[]
    for item in items:
        f=item.get("mapValue",{}).get("fields",{})
        raw_class=scalar(f,"className")
        raw_subject=scalar(f,"subject")
        cls=None
        try:cls=canonical_class(raw_class)
        except ValueError:pass
        if cls is None:reason="invalid class"
        elif str(scalar(f,"section") or "").strip():reason="section-specific duty"
        elif not isinstance(raw_subject,str) or not raw_subject.strip():reason="invalid subject"
        elif not catalog.get((cls,subject_key(raw_subject))):reason="subject absent from active class catalog"
        else:continue
        rows.append({"class":cls or "(unrecognized)","subject":raw_subject[:120] if isinstance(raw_subject,str) else "(invalid)","reason":reason})
    return rows
def api_error_summary(project,url,status,payload):
    # Never print API messages, URLs with identifiers, tokens or response bodies.
    if url.startswith(RB):service="Rules metadata"
    elif url.startswith("https://identitytoolkit.googleapis.com/"):service="Auth inventory"
    elif url.endswith(":commit"):service="Firestore commit"
    elif url==FS+BASE:service="Firestore school registry"
    else:
        collection=url.rsplit("/",1)[-1]
        service="Firestore "+collection if collection in ("members","subjects","teacher_assignments","user_roles","v47_super_admins") else "Firestore inventory"
    error=payload.get("error",{}) if isinstance(payload,dict) else {}
    if not isinstance(error,dict):error={}
    def safe(v):return v if isinstance(v,str) and re.fullmatch(r"[A-Za-z0-9_.-]{1,100}",v) else ""
    codes=[safe(error.get("status"))]
    for detail in error.get("details",[]) if isinstance(error.get("details",[]),list) else []:
        if isinstance(detail,dict):codes.append(safe(detail.get("reason")))
    for item in error.get("errors",[]) if isinstance(error.get("errors",[]),list) else []:
        if isinstance(item,dict):codes.append(safe(item.get("reason")))
    suffix=" ".join(dict.fromkeys(x for x in codes if x))
    return f"{'V46' if project==SOURCE else 'V47'} {service}: HTTP {status}"+(" ("+suffix+")" if suffix else "")
def self_test():
    u="teacher123";n=BASE+"/members/"+u;a=BASE+"/teacher_assignments/"+SID+":"+u+":6:math"
    s=lambda v:{"stringValue":v}
    f={"uid":s(u),"schoolId":s(SID),"role":s("teacher"),"active":{"booleanValue":False}}
    af={"uid":s(u),"schoolId":s(SID),"classId":s("6"),"subjectId":s("math"),"active":{"booleanValue":False}}
    doc=lambda x:{"fields":x,"updateTime":"test"}
    exp={u:{n:f,a:af}}
    w,c=select_changes(exp,{n:doc(f)},{a:doc(af)})
    assert len(w)==2 and c["verified_teacher"]==1
    assert all(x["updateMask"]["fieldPaths"]==["active"] for x in w)
    assert not select_changes(exp,{n:doc(f)},{})[0]
    assert not select_changes({}, {n:doc(f)},{a:doc(af)})[0]
    reasons=Counter()
    assert not select_changes({}, {n:doc(f)},{a:doc(af)},reasons,{u:["subject assignments held"]})[0]
    assert reasons=={"subject assignments held":1}
    reasons=Counter()
    assert not select_changes(exp,{n:doc(f)},{},reasons,{})[0]
    assert reasons=={"missing staged duty records":1}
    reasons=Counter()
    assert not select_changes(exp,{n:doc(dict(f,role=s("viewer")))},{a:doc(af)},reasons,{})[0]
    assert reasons=={"staged role or duty fields differ":1}
    assert not select_changes(exp,{n:doc(dict(f,role=s("viewer")))},{a:doc(af)})[0]
    msg=api_error_summary(SOURCE,"https://identitytoolkit.googleapis.com/v1/projects/"+SOURCE+"/accounts:batchGet",429,{"error":{"status":"RESOURCE_EXHAUSTED","message":"private data","details":[{"reason":"RATE_LIMIT_EXCEEDED"}]}})
    assert msg=="V46 Auth inventory: HTTP 429 (RESOURCE_EXHAUSTED RATE_LIMIT_EXCEEDED)" and "private" not in msg
    assert api_error_summary(TARGET,FS+BASE,429,{})=="V47 Firestore school registry: HTTP 429"
    item=lambda c,n,section="":{"mapValue":{"fields":{"className":s(c),"subject":s(n),"section":s(section)}}}
    reasons=held_subject_details([item("6","Math"),item("6","Science"),item("6","Math","A")],{("6","math"):"math"},lambda x:x,lambda x:x.lower())
    assert reasons==[{"class":"6","subject":"Science","reason":"subject absent from active class catalog"},{"class":"6","subject":"Math","reason":"section-specific duty"}]
    print("PASS exact staged roles and duties, missing/mismatched held, active-only writes and sanitized API diagnostics; specific held subject details")
def main():
    if sys.argv[1:]==["--self-test"]:return self_test()
    if sys.argv[1:] not in (["--review"],["--held-review"],["--apply"]):raise ValueError("Choose review, held-review or apply")
    if os.getenv("CI") or os.getenv("GITHUB_ACTIONS") or os.getenv("FIRESTORE_EMULATOR_HOST") or os.getenv("FIREBASE_AUTH_EMULATOR_HOST") or os.getenv("V47_CONFIRM_PROJECT")!=TARGET:raise ValueError("Explicit V47 Cloud Shell operator required")
    spec=importlib.util.spec_from_file_location("roleplan",Path.home()/ "smss-role-plan.py")
    planner=importlib.util.module_from_spec(spec);spec.loader.exec_module(planner)
    if (planner.m.SOURCE,planner.m.TARGET,planner.m.SID,planner.BASE)!=(SOURCE,TARGET,SID,BASE):raise ValueError("Planner scope mismatch")
    token=subprocess.check_output(["gcloud","auth","print-access-token"],text=True).strip()
    session=requests.Session()
    def call(p,url,body=None,params=None):
        if p not in (SOURCE,TARGET) or (body is not None and (p!=TARGET or url!=FS+root(TARGET)+":commit")):raise ValueError("Unauthorized endpoint")
        r=session.request("GET" if body is None else "POST",url,params=params,json=body,headers={"Authorization":"Bearer "+token,"x-goog-user-project":p},timeout=(10,60),allow_redirects=False)
        if r.status_code!=200:
            try:payload=r.json()
            except ValueError:payload={}
            raise RuntimeError(api_error_summary(p,url,r.status_code,payload))
        return r.json()
    def docs(p,relative,cap):
        prefix=root(p)+"/"+relative
        out=[];seen=set();page=None
        while True:
            q={"pageSize":min(cap,300)}
            if page:q["pageToken"]=page
            j=call(p,FS+prefix,params=q);out.extend(j.get("documents",[]))
            page=j.get("nextPageToken")
            if len(out)>cap or page in seen:raise ValueError("Inventory cap")
            if not page:break
            seen.add(page)
        return indexed(out,prefix)
    def users(p):
        j=call(p,"https://identitytoolkit.googleapis.com/v1/projects/"+p+"/accounts:batchGet?maxResults=1000")
        u=j.get("users",[])
        if j.get("nextPageToken") or len({x["localId"] for x in u})!=len(u) or len({str(x.get("email","")).casefold() for x in u})!=len(u):raise ValueError("Unverified Auth inventory")
        return u
    def rules_match():
        release=call(TARGET,RB+"projects/"+TARGET+"/releases/cloud.firestore")
        name=release.get("rulesetName","")
        if not name.startswith("projects/"+TARGET+"/rulesets/"):raise ValueError("Wrong rules project")
        files=call(TARGET,RB+name).get("source",{}).get("files",[])
        if len(files)!=1:return False
        raw=files[0]["content"].encode()
        return hashlib.sha1(("blob "+str(len(raw))+"\\0").encode().replace(b"\\0",b"\x00")+raw).hexdigest()==RULES_BLOB
    def snapshot(explain=False):
        school=call(TARGET,FS+BASE)
        if school.get("name")!=BASE or scalar(school["fields"],"id")!=SID or scalar(school["fields"],"active") is not True:raise ValueError("Canonical active school required")
        src=users(SOURCE);dst=users(TARGET)
        admin_email=os.getenv("V47_SCHOOL_ADMIN_EMAIL","").strip().casefold()
        source_admin=[u["localId"] for u in src if str(u.get("email","")).casefold()==admin_email]
        dest_admin=[u["localId"] for u in dst if str(u.get("email","")).casefold()==admin_email and not u.get("disabled")]
        if len(source_admin)!=1 or len(dest_admin)!=1:raise ValueError("Existing School Admin identity not verified")
        roots=docs(TARGET,"v47_super_admins",100)
        superuids={n.rsplit("/",1)[1] for n in roots}
        if not any(scalar(x["fields"],"active") is True for x in roots.values()):raise ValueError("Retained Super Admin missing")
        members=docs(TARGET,"schools/"+SID+"/members",300)
        admin=members.get(BASE+"/members/"+dest_admin[0],{}).get("fields",{})
        if scalar(admin,"role")!="school_admin" or scalar(admin,"active") is not True or scalar(admin,"uid")!=dest_admin[0] or scalar(admin,"schoolId")!=SID:raise ValueError("School Admin membership not verified")
        subjects=docs(TARGET,"schools/"+SID+"/subjects",1000);catalog={}
        for n,d in subjects.items():
            f=d["fields"]
            if scalar(f,"schoolId")!=SID:raise ValueError("Foreign subject")
            if scalar(f,"active") is not True:continue
            cls=planner.m.canonical_class(scalar(f,"class"))
            key=(cls,planner.sub.subject_key(scalar(f,"name")))
            if key in catalog:raise ValueError("Ambiguous target subject")
            catalog[key]=n.rsplit("/",1)[1]
        roles=docs(SOURCE,"user_roles",300);assignments=docs(TARGET,"schools/"+SID+"/teacher_assignments",1000)
        expected={}
        plan_reasons={}
        held_subject_rows=[]
        allowed_reasons={"invalid UID","collision or missing target identity","disabled account held","admin held for explicit authorization","missing or inactive role","mixed or unsupported roles held","class assignments held","subject assignments held"}
        for u in src:
            uid=u["localId"]
            rr=[d for n,d in roles.items() if n.rsplit("/",1)[1]==uid]
            out,held=planner.plan([u],dst,rr,catalog,superuids,source_admin[0])
            plan_reasons[uid]=sorted(k for k,v in held.items() if v and k in allowed_reasons)
            if explain and held.get("subject assignments held") and len(rr)==1 and BASE+"/members/"+uid in members:
                held_subject_rows.extend(held_subject_details(planner.cdc.decode_array(rr[0]["fields"],"subjectAssignments"),catalog,planner.m.canonical_class,planner.sub.subject_key))
            if any("assignments held" in k and v for k,v in held.items()):continue
            if out:expected[uid]=out
        details=Counter() if explain else None
        w,c=select_changes(expected,members,assignments,details,plan_reasons)
        if explain:
            print("HELD ACCOUNT REASONS (aggregate; categories may overlap):",json.dumps(dict(details),sort_keys=True))
            print("HELD SUBJECT DUTIES (no account identity):",json.dumps(held_subject_rows,ensure_ascii=False,sort_keys=True))
            print("READ ONLY; V46 WRITES: ZERO; V47 WRITES: ZERO; AUTH CHANGES: ZERO")
        return w,c
    ok=rules_match()
    print("LIVE RULES MATCH REVIEWED V47:",ok,flush=True)
    w,c=snapshot(explain=sys.argv[1:]==["--held-review"])
    print("EXISTING ROLE REVIEW:",json.dumps(c,sort_keys=True))
    if sys.argv[1:] in (["--review"],["--held-review"]):return
    if not ok:raise ValueError("Deployed rules differ; activation blocked")
    if len(w)>200:raise ValueError("Write cap")
    if not w:print("NO ELIGIBLE INACTIVE RECORDS; ZERO WRITES");return
    if input("Type ACTIVATE-VERIFIED-V47-ROLES: ").strip()!="ACTIVATE-VERIFIED-V47-ROLES":raise ValueError("Not confirmed")
    if snapshot()!=(w,c) or not rules_match():raise ValueError("Role or rules snapshot changed; no writes")
    result=call(TARGET,FS+root(TARGET)+":commit",{"writes":w})
    if len(result.get("writeResults",[]))!=len(w):raise ValueError("Commit response uncertain; review before retry")
    w2,c2=snapshot()
    if w2:raise ValueError("Post-commit review incomplete")
    print("VERIFIED EXISTING ROLE RECORDS ACTIVATED:",len(w))
    print("V46 WRITES: ZERO; AUTH CHANGES: ZERO; ACADEMIC DATA CHANGES: ZERO")
if __name__=="__main__":
    try:main()
    except Exception as e:
        print("STOPPED:",str(e) if isinstance(e,(ValueError,RuntimeError)) else type(e).__name__,file=sys.stderr)
        sys.exit(1)
