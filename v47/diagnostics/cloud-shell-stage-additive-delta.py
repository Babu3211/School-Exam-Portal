"""V46 -> V47 additive marks/legacy role catch-up. Default is read-only.
Requires the previously reviewed Cloud Shell helpers and encrypted baseline.
Never changes source, Auth, membership or school status. Reviewed reconciliation
updates only baseline-identical staff/catalog records, with the original archived.
"""
import getpass, hashlib, json, os, subprocess, sys, warnings
from datetime import datetime, timezone, timedelta
from pathlib import Path
from importlib.machinery import SourceFileLoader

COLLS=("students","staff","classes","subjects","exams","marks","mark_settings","attendance","cdc_observations","cdc_serofero_indicators","school_settings","user_roles","certificates","school_public_branding","school_gallery","public_result_exams","public_result_lookup","public_results")
ALLOWED={"marks","user_roles"}

def delta_counts(old,current,equal):
    return {"old":len(old),"current":len(current),"new":len(current.keys()-old.keys()),"removed":len(old.keys()-current.keys()),"changed":sum(not equal(old[k],current[k]) for k in old.keys() & current.keys())}

def additions(old, current, equal, allowed):
    counts=delta_counts(old,current,equal)
    if counts["removed"] or counts["changed"]:
        raise RuntimeError("Source changed or removed existing records; manual reconciliation required")
    new=set(current)-set(old)
    if new and not allowed:raise RuntimeError("New records in unreviewed collection")
    return new

def changed_fields(old,new,equal):
    return {k for k in old.keys() | new.keys() if k not in old or k not in new or not equal(old[k],new[k])}

def reconciliation_actions(base,original,desired,extra,replacements,vals,equal):
    creates=[];updates=[];conflicts=[]
    for k,v in desired.items():
        if k not in vals:raise RuntimeError("Incomplete target inventory")
        if equal(vals[k],v):continue
        if k in extra and k not in original and vals[k] is None and any(k.startswith(base+"/"+c+"/") for c in ("classes","subjects","marks","user_roles")):
            creates.append(k)
        elif k in replacements and k in original and equal(vals[k],original[k]) and (k.startswith(base+"/staff/") or (k.startswith(base+"/subjects/") and changed_fields(original[k],v,equal)=={"sourceClassRecordIds"})):
            updates.append(k)
        else:conflicts.append(k)
    return sorted(creates),sorted(updates),sorted(conflicts)

def mark_catchup_actions(original,desired,actual,equal):
    creates=[];updates=[];conflicts=[]
    for k,v in desired.items():
        if k not in actual:raise RuntimeError("Incomplete target inventory")
        current=actual[k]
        if equal(current,v):continue
        if current is None and k not in original:creates.append(k)
        elif k in original and current is not None and equal(current,original[k]):updates.append(k)
        else:conflicts.append(k)
    return sorted(creates),sorted(updates),sorted(conflicts)

def typed_mark_max(fields):
    # Firestore REST integerValue is decimal text, not a Python int.
    import re, math
    wrapper=fields.get("fullMarks",{})
    if not isinstance(wrapper,dict):return None
    if set(wrapper)=={"integerValue"}:
        v=wrapper["integerValue"]
        if type(v) is str and re.fullmatch(r"[0-9]{1,6}",v):v=int(v)
    elif set(wrapper)=={"doubleValue"}:v=wrapper["doubleValue"]
    elif set(wrapper)=={"stringValue"}:
        v=wrapper["stringValue"]
        if not isinstance(v,str) or not re.fullmatch(r"[0-9]{1,6}(?:\.[0-9]{1,6})?",v.strip()):return None
        v=float(v)
    else:return None
    return v if type(v) in (int,float) and math.isfinite(v) and 0<=v<=100000 else None

def v46_setting_subject_key(value):
    # Pinned V46 index.html canonicalSubjectKey, blob ad2e3b96.
    raw=" ".join(str(value or "").strip().lower().split())
    return "हाम्रो धुनिबेँशी" if raw in ("स्थानीय","स्थानीय विषय","local","local subject","हाम्रो धुनिबेँशी","hamro dhunibeshi","hamro dhunibesi") else raw

def plan_v46_entry_settings(legacy,catalog,exams,scalar):
    # Pinned V46 selectedEntrySetting: class override before group default;
    # final theory is derived from exam term, never a setting's nonexistent term.
    # This is an audit preview only. No new Firestore documents are created.
    import re
    from collections import Counter
    groups={str(n):"1-3" if n<=3 else "4-5" if n<=5 else "6-8" if n<=8 else "9-10" for n in range(1,11)}
    terms={"first":"1st","second":"2nd","third":"3rd","annual":"final"}
    review=Counter();shapes=Counter();proposals={}
    by_scope={}
    for e in exams.values():
        cls=scalar(e,"class");term=terms.get(scalar(e,"termKey"))
        if cls in groups and term and str(scalar(e,"academicYear"))=="2083" and scalar(e,"active") is not False:
            key=(cls,term);by_scope[key]=by_scope.get(key,0)+1
    for (cls,sid),name in catalog.items():
        if cls not in groups:continue
        candidates=[f for f in legacy.values() if scalar(f,"classGroup")==groups[cls] and v46_setting_subject_key(scalar(f,"subject"))==v46_setting_subject_key(name)]
        exact=[f for f in candidates if str(scalar(f,"className") or "")==cls]
        defaults=[f for f in candidates if not scalar(f,"className")]
        chosen=exact or defaults
        if len(chosen)!=1:
            review["missing_subject_setting" if not chosen else "ambiguous_subject_setting"]+=1
            continue
        parts=chosen[0].get("components",{}).get("arrayValue",{}).get("values",[])
        internal=[]
        for part in parts:
            p=part.get("mapValue",{}).get("fields",{})
            label=scalar(p,"name")
            if not isinstance(label,str) or not label.strip():internal=[];break
            if re.search(r"^TH\b|THEORY",label,re.I):continue
            internal.append((label,typed_mark_max(p)))
        if not internal or any(v is None for _,v in internal):
            review["invalid_component_values"]+=1;continue
        primary=int(cls)<=5
        if primary:
            count=internal[0][1]
            if count==0:
                review["dynamic_primary_count_requires_review"]+=1;continue
            if int(count)!=count or count>5000:
                review["invalid_primary_count"]+=1;continue
            # The calculated Full Marks field is NOT an editable component.
            internal=[("No. of Learning Achievement",int(count)),("Obtained Learning Achievement",int(count)*4)]
        elif any(v<=0 or v>5000 for _,v in internal) or len(internal)>5:
            review["invalid_secondary_components"]+=1;continue
        for (ec,term),num in by_scope.items():
            if ec!=cls:continue
            if num!=1:
                review["multiple_original_exams"]+=1;continue
            components=list(internal)
            if not primary and term=="final":
                computer="computer" in name.lower() or "कम्प्युटर" in name
                components.append(("TH (Theory)",50 if int(cls)<=8 or computer else 75))
            key=(cls,sid,term)
            proposals[key]=components
            review["ready_candidates"]+=1
            shapes[groups[cls]+" | "+term+" | "+",".join(str(v) for _,v in components)]+=1
    review["verified_class_term_scopes"]=sum(n==1 for n in by_scope.values())
    return proposals,dict(review),dict(shapes)

def entry_settings_inventory(legacy,subjects,operational,scalar,subject_key):
    """Aggregate exact matching candidates only. Never invent a setting or term."""
    from collections import Counter
    groups={"1-3":("1","2","3"),"4-5":("4","5"),"6-8":("6","7","8"),"9-10":("9","10")}
    terms={"first":"1st","second":"2nd","third":"3rd","annual":"final","1st":"1st","2nd":"2nd","3rd":"3rd","final":"final"}
    counts=Counter();shapes=Counter();term_fields=Counter();candidate_counts=Counter()
    for f in legacy.values():
        group=scalar(f,"classGroup");name=scalar(f,"subject")
        if group not in groups or not isinstance(name,str) or not name.strip():
            counts["invalid_legacy_identity"]+=1;continue
        explicit=[(k,scalar(f,k)) for k in ("termKey","term","examType","examTerm") if scalar(f,k) not in (None,"")]
        for k,v in explicit:term_fields[k]+=1
        mapped={terms.get(v) for k,v in explicit if isinstance(v,str)}
        term=next(iter(mapped)) if len(mapped)==1 and None not in mapped and len(explicit)==sum(isinstance(v,str) for k,v in explicit) else None
        if term is None:counts["term_missing_or_unresolved"]+=1
        items=f.get("components",{}).get("arrayValue",{}).get("values",[])
        shape=[]
        for x in items:
            p=x.get("mapValue",{}).get("fields",{})
            n=scalar(p,"name");v=scalar(p,"fullMarks")
            label=("count" if isinstance(n,str) and "learning achievement" in n.lower() and "obtained" not in n.lower()
              else "obtained" if isinstance(n,str) and "obtained learning" in n.lower()
              else "full" if isinstance(n,str) and n.lower().strip()=="full marks"
              else "participation" if isinstance(n,str) and "participation" in n.lower()
              else "practical" if isinstance(n,str) and ("practical" in n.lower() or "project" in n.lower())
              else "theory" if isinstance(n,str) and ("theory" in n.lower() or n.lower().startswith("th ") or "total of final" in n.lower())
              else "term" if isinstance(n,str) and ("term" in n.lower() or "examination" in n.lower())
              else "other")
            value=typed_mark_max(p)
            if value is None:value="invalid"
            shape.append(label+":"+str(value))
        shapes[group+" | "+(term or "unresolved")+" | "+",".join(shape)]+=1
        matches=[(cls,sid) for (cls,sid),subject in subjects.items() if cls in groups[group] and subject_key(subject)==subject_key(name)]
        if not matches:counts["no_catalog_subject"]+=1
        if term is not None:
            for cls,sid in matches:candidate_counts[(cls,sid,term)]+=1
    counts["legacy_records"]=len(legacy)
    counts["active_catalog_subjects"]=len(subjects)
    counts["explicit_unique_candidates"]=sum(v==1 for v in candidate_counts.values())
    counts["ambiguous_candidates"]=sum(v>1 for v in candidate_counts.values())
    counts["operational_settings"]=len(operational)
    counts["candidate_with_operational_settings"]=sum(k in operational for k in candidate_counts)
    return dict(counts),dict(shapes),dict(term_fields)

def operational_entry_documents(proposals,base,school_id):
    import re
    def text(v):return {"stringValue":v}
    out={}
    for (cls,sid,term),parts in proposals.items():
        id=cls+"_"+sid+"_"+term
        if not re.fullmatch(r"[A-Za-z0-9_-]{1,128}",id) or cls not in tuple(str(i) for i in range(1,11)) or term not in ("1st","2nd","3rd","final"):raise RuntimeError("Invalid operational setting identity")
        components=[]
        for i,(name,maxval) in enumerate(parts):
            if not isinstance(name,str) or not 1<=len(name.strip())<=160 or type(maxval) not in (int,float) or not 0<maxval<=100000:raise RuntimeError("Invalid operational component")
            number={"integerValue":str(int(maxval))} if int(maxval)==maxval else {"doubleValue":maxval}
            components.append({"mapValue":{"fields":{"key":text("component_"+str(i+1)),"name":text(name.strip()),"fullMarks":number}}})
        if not 1<=len(components)<=6:raise RuntimeError("Invalid operational components")
        out[base+"/mark_settings/"+id]={"id":text(id),"schoolId":text(school_id),"classId":text(cls),"subjectId":text(sid),"examId":text(term),"active":{"booleanValue":True},"components":{"arrayValue":{"values":components}}}
    return out

def self_test():
    assert additions({"a":1},{"a":1,"b":2},lambda x,y:x==y,True)=={"b"}
    for old,new,allowed in [({"a":1},{"a":2},True),({"a":1},{},True),({},{"a":1},False)]:
        try:additions(old,new,lambda x,y:x==y,allowed)
        except RuntimeError:pass
        else:raise AssertionError("Unexpected delta accepted")
    assert delta_counts({"a":1,"b":2},{"a":3,"c":4},lambda x,y:x==y)=={"old":2,"current":2,"new":1,"removed":1,"changed":1}
    assert changed_fields({"a":1,"b":2},{"a":3,"c":4},lambda x,y:x==y)=={"a","b","c"}
    assert changed_fields({"a":1},{"a":1},lambda x,y:x==y)==set()
    base="schools/test"
    staff=base+"/staff/s";mark=base+"/marks/m";member=base+"/members/u"
    old={staff:{"name":"old"}}
    desired={staff:{"name":"new"},mark:{"score":3}}
    extra={mark:desired[mark]};replacements={staff:desired[staff]};eq=lambda x,y:x==y
    assert reconciliation_actions(base,old,desired,extra,replacements,{staff:old[staff],mark:None},eq)==([mark],[staff],[])
    assert reconciliation_actions(base,old,desired,extra,replacements,desired,eq)==([],[],[])
    assert reconciliation_actions(base,old,desired,extra,replacements,{staff:{"name":"different"},mark:{"score":4}},eq)==([],[],[mark,staff])
    assert reconciliation_actions(base,{}, {member:{"active":True}}, {member:{"active":True}}, {}, {member:None},eq)==([],[],[member])
    assert mark_catchup_actions({"a":1},{"a":2,"b":3},{"a":1,"b":None},eq)==(["b"],["a"],[])
    assert mark_catchup_actions({"a":1},{"a":2,"b":3},{"a":2,"b":3},eq)==([],[],[])
    assert mark_catchup_actions({"a":1},{"a":2,"b":3},{"a":9,"b":4},eq)==([],[],["a","b"])
    assert mark_catchup_actions({"a":1},{"a":2},{"a":None},eq)==([],[],["a"])
    sc=lambda f,k:f.get(k)
    c,sh,t=entry_settings_inventory({"a":{"classGroup":"9-10","subject":"Math","termKey":"first","components":{"arrayValue":{"values":[{"mapValue":{"fields":{"name":"Participation","fullMarks":3}}}]}}},"b":{"classGroup":"9-10","subject":"Math"}},{("9","math"):"Math",("10","math"):"Math"},{("9","math","1st")},sc,str.lower)
    assert c["explicit_unique_candidates"]==2 and c["term_missing_or_unresolved"]==1 and c["candidate_with_operational_settings"]==1
    assert t=={"termKey":1}
    assert typed_mark_max({"fullMarks":{"integerValue":"36"}})==36
    assert typed_mark_max({"fullMarks":{"doubleValue":4.5}})==4.5
    assert typed_mark_max({"fullMarks":{"stringValue":"10"}})==10
    assert typed_mark_max({"fullMarks":{"booleanValue":True}}) is None
    def part(n,v):return {"mapValue":{"fields":{"name":n,"fullMarks":{"integerValue":str(v)}}}}
    l={"a":{"classGroup":"9-10","subject":"Computer","components":{"arrayValue":{"values":[part("Participation",4),part("Practical/Project",36),part("Term",10)]}}}}
    p,rv,shapes=plan_v46_entry_settings(l,{("9","comp"):"Computer"},{ "a":{"class":"9","termKey":"first","academicYear":"2083"},"b":{"class":"9","termKey":"annual","academicYear":"2083"}},sc)
    assert [v for n,v in p[("9","comp","1st")]]==[4,36,10]
    assert [v for n,v in p[("9","comp","final")]]==[4,36,10,50]
    assert rv["ready_candidates"]==2
    docs=operational_entry_documents(p,"schools/test","300160003")
    assert len(docs)==2
    assert docs["schools/test/mark_settings/9_comp_1st"]["components"]["arrayValue"]["values"][1]["mapValue"]["fields"]["fullMarks"]=={"integerValue":"36"}
    p,rv,_=plan_v46_entry_settings(l,{("9","comp"):"Computer"},{"a":{"class":"9","termKey":"first","academicYear":"2083"},"b":{"class":"9","termKey":"first","academicYear":"2083"}},sc)
    assert not p and rv["multiple_original_exams"]==1
    print("PASS additive-only delta policy, aggregate diagnostics and guarded reconciliation actions; mark catch-up conflict guards; entry settings inventory")

def main(path,apply=False,reconcile=False,marks_only=False,entry_settings=False):
    import requests
    if os.environ.get("CI") or os.environ.get("GITHUB_ACTIONS"):raise RuntimeError("Live migration forbidden in CI")
    warnings.simplefilter("error",getpass.GetPassWarning)
    home=Path.home()
    migration=SourceFileLoader("migration",str(home/"smss-migration-check.py")).load_module()
    cdc=SourceFileLoader("cdc_delta",str(home/"smss-cdc.py")).load_module()
    m=cdc.m;sub=cdc.sub;a=cdc.a;BASE=cdc.BASE
    if (m.SOURCE,m.TARGET,m.SID)!=("exam-portal-smss-95016","smss-exam-portal-v47","300160003"):raise RuntimeError("Unexpected migration project scope")
    backup=migration.open_backup(path,getpass.getpass("Backup passphrase: "))
    staged,archive,total,groups=m.plan(backup)
    subjectdocs,_=sub.catalog(groups)
    original={**staged,**subjectdocs,**a.plan(groups,staged,subjectdocs),**cdc.project(groups)}
    token=subprocess.check_output(["gcloud","auth","print-access-token"],text=True).strip()
    session=requests.Session()
    api="https://firestore.googleapis.com/v1/"+m.root(m.TARGET)
    source_api="https://firestore.googleapis.com/v1/"+m.root(m.SOURCE)
    def call(project,url,body=None,params=None):
        if project not in (m.SOURCE,m.TARGET) or (body is not None and project!=m.TARGET):raise RuntimeError("Wrong project")
        if body is not None and url not in (api+":batchGet",api+":beginTransaction",api+":commit",api+":rollback"):raise RuntimeError("Unexpected POST")
        if url in (api+":beginTransaction",api+":commit",api+":rollback") and not apply:raise RuntimeError("Read-only mode")
        r=session.request("GET" if body is None else "POST",url,headers={"Authorization":"Bearer "+token,"x-goog-user-project":project},json=body,params=params,timeout=(10,90),allow_redirects=False)
        if r.status_code!=200:raise RuntimeError("API HTTP "+str(r.status_code))
        return r.json()
    def check_rules():
        rb="https://firebaserules.googleapis.com/v1/"
        name=call(m.TARGET,rb+"projects/"+m.TARGET+"/releases/cloud.firestore").get("rulesetName","")
        if not name.startswith("projects/"+m.TARGET+"/rulesets/"):raise RuntimeError("Unexpected ruleset")
        fs=call(m.TARGET,rb+name).get("source",{}).get("files",[])
        if len(fs)!=1:raise RuntimeError("Unexpected rules source")
        b=fs[0]["content"].encode()
        if hashlib.sha1(("blob "+str(len(b))+"\0").encode()+b).hexdigest()!=m.RULES_BLOB:raise RuntimeError("Live rules differ")
    def listing(project,url,prefix,rt=None):
        result={};page=None;seen=set()
        while True:
            params={"pageSize":300}
            if rt:params["readTime"]=rt
            if page:params["pageToken"]=page
            data=call(project,url,params=params)
            for d in data.get("documents",[]):
                n=d["name"]
                if not n.startswith(prefix) or "/" in n[len(prefix):] or n in result:raise RuntimeError("Invalid collection identity")
                result[n]=d["fields"]
            page=data.get("nextPageToken")
            if len(result)>5000 or page in seen:raise RuntimeError("Inventory cap")
            if not page:return result
            seen.add(page)
    def snapshot():
        rt=(datetime.now(timezone.utc)-timedelta(seconds=10)).isoformat(timespec="microseconds").replace("+00:00","Z")
        updated=dict(groups);new_by_coll={};blocked=[];staff_changes={};class_additions=[]
        for c in COLLS:
            old={d["name"]:d["fields"] for d in groups.get(c,[])}
            if len(old)!=len(groups.get(c,[])):raise RuntimeError("Duplicate baseline identity")
            now=listing(m.SOURCE,source_api+"/"+c,m.root(m.SOURCE)+"/"+c+"/",rt)
            counts=delta_counts(old,now,sub.same_field)
            print("DELTA INVENTORY",c,json.dumps(counts,sort_keys=True),flush=True)
            if counts["removed"] or (counts["changed"] and not (reconcile and c=="staff")) or (counts["new"] and c not in ALLOWED and not (reconcile and c=="classes")):
                blocked.append(c)
            if reconcile and c=="staff":
                for k in old.keys() & now.keys():
                    if not sub.same_field(old[k],now[k]):
                        staff_changes[k]=changed_fields(old[k],now[k],sub.same_field)
            if reconcile and c=="classes":
                class_additions=[{"name":k,"fields":now[k]} for k in now.keys()-old.keys()]
            updated[c]=[{"name":n,"fields":f} for n,f in now.items()]
            new_by_coll[c]=counts["new"]
        if blocked:
            print("COLLECTIONS REQUIRING REVIEW:",", ".join(blocked))
            print("READ ONLY: ZERO FIRESTORE OR AUTH WRITES DURING THIS INVENTORY")
            raise RuntimeError("Source changes or unreviewed additions; no staging performed")
        if reconcile:
            from collections import Counter
            # Keep old source data in the verified original archive.
            # Map the new source using the same reviewed V46 schema helpers.
            newstaged=dict(staged)
            field_counts=Counter()
            # Never print field values or identifiers; unknown field names may
            # also be sensitive, so print only a fixed vocabulary.
            known={"name","nameEnglish","nameEn","nameNepali","email","emailId","emailID","emailAddress","phone","mobile","designation","post","qualification","address","active","updatedAt","updatedBy","createdAt","authUid","firebaseUid","userUid","uid","teacherId"}
            for k,fields in staff_changes.items():
                field_counts.update(x if x in known else "(other field)" for x in fields)
            print("STAFF CHANGED FIELD COUNTS:",json.dumps(dict(field_counts),sort_keys=True))
            for d in updated.get("staff",[]):
                dest=BASE+"/staff/"+m.safeid(d["name"].rsplit("/",1)[1])
                if d["name"] in staff_changes:
                    newstaged[dest]=m.project_staff(d)
            newsubjects,_=sub.catalog(updated)
            for d in class_additions:
                f=d["fields"]
                cls=m.canonical_class(m.scalar(f,"className"))
                # Class level and active state only; omit subject/teacher names.
                print("NEW CLASS ROW LEVEL:",cls,"ACTIVE:",m.scalar(f,"active") is not False)
            desired={**newstaged,**newsubjects,**a.plan(updated,newstaged,newsubjects),**cdc.project(updated)}
            if set(original)-set(desired):raise RuntimeError("Mapped records would be removed")
            replacements={k:v for k,v in desired.items() if k in original and not sub.same_field(original[k],v)}
            extra={k:v for k,v in desired.items() if k not in original}
            for k,v in replacements.items():
                if k.startswith(BASE+"/staff/"):continue
                if k.startswith(BASE+"/subjects/") and changed_fields(original[k],v,sub.same_field)=={"sourceClassRecordIds"}:continue
                raise RuntimeError("Unreviewed mapped replacement; no writes")
            allowed_new={"marks","user_roles","classes","subjects"}
            if any(not any(k.startswith(BASE+"/"+c+"/") for c in allowed_new) for k in extra):raise RuntimeError("Unreviewed mapped creation")
            if len(extra)+len(replacements)>100:raise RuntimeError("Reconciliation review limit")
            print("MAPPED NEW COUNTS:",json.dumps(dict(Counter(k[len(BASE)+1:].split("/")[0] for k in extra)),sort_keys=True))
            print("MAPPED UPDATE COUNTS:",json.dumps(dict(Counter(k[len(BASE)+1:].split("/")[0] for k in replacements)),sort_keys=True))
            return desired,extra,replacements
        expected={**staged,**subjectdocs,**a.plan(updated,staged,subjectdocs),**cdc.project(updated)}
        delta={k:v for k,v in expected.items() if k not in original}
        if any(k not in expected or not sub.same_field(v,expected[k]) for k,v in original.items()):raise RuntimeError("Mapped baseline changed")
        if len(delta)!=sum(new_by_coll.values()) or len(delta)>40 or any(not any(k.startswith(BASE+"/"+c+"/") for c in ALLOWED) for k in delta):raise RuntimeError("Unexpected delta scope")
        # Legacy roles are source evidence only, never memberships or privileges.
        print("SOURCE DELTA MARKS:",new_by_coll["marks"],"LEGACY USER ROLES:",new_by_coll["user_roles"])
        return expected,delta
    def read(names,tx=None):
        out={}
        for i in range(0,len(names),40):
            batch=names[i:i+40];body={"documents":batch}
            if tx:body["transaction"]=tx
            for item in call(m.TARGET,api+":batchGet",body):
                d=item.get("found");n=d["name"] if d else item.get("missing")
                if n not in batch or n in out:raise RuntimeError("Unexpected target identity")
                out[n]=d["fields"] if d else None
        if set(out)!=set(names):raise RuntimeError("Incomplete target read")
        return out
    def verify(expected,delta,tx=None):
        vals=read(sorted(set(expected)|{archive,BASE}),tx)
        if not sub.same_field(vals[BASE],staged[BASE]):raise RuntimeError("Inactive target school differs")
        if not vals[archive] or vals[archive].get("state")!=m.string("ARCHIVE_VERIFIED_NOT_OPERATIONAL") or vals[archive].get("documentCount")!={"integerValue":str(total)}:raise RuntimeError("Baseline archive not verified")
        missing=[]
        for k,v in expected.items():
            if vals[k] is None and k in delta:missing.append(k)
            elif not sub.same_field(vals[k],v):raise RuntimeError("Existing target record differs or baseline absent; no overwrite")
        return missing
    check_rules()
    if marks_only:
        # Re-read the live source at a consistent timestamp; only the inactive
        # target school's academic records may be changed. The original archive
        # is never altered. No source writes, no role or membership changes.
        from collections import Counter
        academic=("exams","marks","mark_settings")
        oldacademic={k:v for k,v in original.items() if any(k.startswith(BASE+"/"+c+"/") for c in academic)}
        def current_marks():
            rt=(datetime.now(timezone.utc)-timedelta(seconds=10)).isoformat(timespec="microseconds").replace("+00:00","Z")
            current=dict(groups)
            for c in ("school_settings","students","classes","exams","marks","mark_settings"):
                now=listing(m.SOURCE,source_api+"/"+c,m.root(m.SOURCE)+"/"+c+"/",rt)
                old={d["name"]:d["fields"] for d in groups.get(c,[])}
                counts=delta_counts(old,now,sub.same_field)
                print("LIVE SOURCE",c,json.dumps(counts,sort_keys=True),flush=True)
                if c in ("school_settings","students","exams","marks","mark_settings") and counts["removed"]:
                    raise RuntimeError("Source record removed; review required; no deletion")
                current[c]=[{"name":n,"fields":v} for n,v in now.items()]
            profiles=[d for d in current["school_settings"] if m.scalar(d["fields"],"iemisCode") in (m.SID,int(m.SID))]
            if len(profiles)!=1:raise RuntimeError("Source school identity not verified")
            live_students={BASE+"/students/"+m.safeid(d["name"].rsplit("/",1)[1]):m.project_student(d) for d in current["students"]}
            live_subjects,_=sub.catalog(current)
            # Attendance is deliberately out of scope for this marks catch-up.
            mapped=a.plan({**current,"attendance":[]},live_students,live_subjects)
            desired={k:v for k,v in mapped.items() if any(k.startswith(BASE+"/"+c+"/") for c in academic)}
            if set(oldacademic)-set(desired):raise RuntimeError("Mapped source record removed; no deletion")
            # Validate all target dependencies before any copy.
            deps={**live_students,**live_subjects}
            return desired,deps,rt
        def classify(desired,deps,tx=None):
            vals=read(sorted(set(desired)|set(deps)|{BASE,archive}),tx)
            if not sub.same_field(vals[BASE],staged[BASE]):raise RuntimeError("Inactive target school differs")
            if not vals[archive] or vals[archive].get("state")!=m.string("ARCHIVE_VERIFIED_NOT_OPERATIONAL") or vals[archive].get("documentCount")!={"integerValue":str(total)}:raise RuntimeError("Baseline archive not verified")
            missing=[k for k,v in deps.items() if not sub.same_field(v,vals[k])]
            print("DEPENDENCY MISMATCH COUNTS:",json.dumps(dict(Counter(k[len(BASE)+1:].split("/")[0] for k in missing)),sort_keys=True))
            if missing:raise RuntimeError("Student/class/subject dependencies differ; reconcile before copy")
            return mark_catchup_actions(oldacademic,desired,{k:vals[k] for k in desired},sub.same_field)
        def inventory(desired):
            for c in academic:
                actual=listing(m.TARGET,api+"/schools/"+m.SID+"/"+c,BASE+"/"+c+"/")
                extras=set(actual)-set(desired)
                if extras and c=="mark_settings":
                    legacy={k:v for k,v in desired.items() if k.startswith(BASE+"/mark_settings/")}
                    cat={(m.scalar(v,"class"),k.rsplit("/",1)[1]):m.scalar(v,"name") for k,v in deps.items() if k.startswith(BASE+"/subjects/") and m.scalar(v,"active") is True}
                    ex={k:v for k,v in desired.items() if k.startswith(BASE+"/exams/")}
                    p,_,_=plan_v46_entry_settings(legacy,cat,ex,m.scalar)
                    generated=operational_entry_documents(p,BASE,m.SID)
                    extras={k for k in extras if k not in generated or not sub.same_field(actual[k],generated[k])}
                if extras:raise RuntimeError("Extra target academic records; no deletion or overwrite")
        def counts(keys):return dict(Counter(k[len(BASE)+1:].split("/")[0] for k in keys))
        desired,deps,rt=current_marks()
        if entry_settings:
            legacy={k:v for k,v in desired.items() if k.startswith(BASE+"/mark_settings/")}
            catalog={(m.scalar(v,"class"),k.rsplit("/",1)[1]):m.scalar(v,"name") for k,v in deps.items() if k.startswith(BASE+"/subjects/") and m.scalar(v,"active") is True}
            target=listing(m.TARGET,api+"/schools/"+m.SID+"/mark_settings",BASE+"/mark_settings/")
            operational=set()
            for k,v in target.items():
                if k in legacy:
                    if not sub.same_field(v,legacy[k]):raise RuntimeError("Original mark settings differ")
                    continue
                cls,sid,term=(m.scalar(v,x) for x in ("classId","subjectId","examId"))
                if m.scalar(v,"schoolId")!=m.SID or m.scalar(v,"id")!=k.rsplit("/",1)[1] or (cls,sid) not in catalog or term not in ("weekly","monthly","1st","2nd","3rd","final") or m.scalar(v,"active") is not True:raise RuntimeError("Unexpected operational settings")
                if (cls,sid,term) in operational:raise RuntimeError("Duplicate operational settings identity")
                operational.add((cls,sid,term))
            if set(legacy)-set(target):raise RuntimeError("Original settings missing")
            # Verify school and archive and unchanged dependencies separately.
            vals=read(sorted(set(deps)|{BASE,archive}))
            if not sub.same_field(vals[BASE],staged[BASE]):raise RuntimeError("Inactive target school differs")
            if not vals[archive] or vals[archive].get("state")!=m.string("ARCHIVE_VERIFIED_NOT_OPERATIONAL"):raise RuntimeError("Archive not verified")
            if any(not sub.same_field(v,vals[k]) for k,v in deps.items()):raise RuntimeError("Dependencies differ")
            counts,shapes,fields=entry_settings_inventory(legacy,catalog,operational,m.scalar,sub.subject_key)
            print("ENTRY SETTINGS COUNTS:",json.dumps(counts,sort_keys=True))
            print("ENTRY SETTINGS SHAPES:",json.dumps(shapes,sort_keys=True))
            print("ENTRY SETTINGS TERM FIELDS:",json.dumps(fields,sort_keys=True))
            exams={k:v for k,v in desired.items() if k.startswith(BASE+"/exams/")}
            proposals,review,planned_shapes=plan_v46_entry_settings(legacy,catalog,exams,m.scalar)
            print("V46 EXACT ENTRY PLAN COUNTS:",json.dumps(review,sort_keys=True))
            print("V46 EXACT ENTRY PLAN SHAPES:",json.dumps(planned_shapes,sort_keys=True))
            print("V46 EXACT ENTRY PLAN EXISTING:",sum(k in operational for k in proposals))
            for (cls,sid),name in sorted(catalog.items()):
                if not any(k[:2]==(cls,sid) for k in proposals):
                    print("UNRESOLVED SUBJECT:",cls,json.dumps(name,ensure_ascii=False))
            docs=operational_entry_documents(proposals,BASE,m.SID)
            if set(docs)&set(legacy):raise RuntimeError("Operational identity collides with original settings")
            def setting_check(academic,dependencies,docs,tx=None):
                vals=read(sorted(set(academic)|set(dependencies)|set(docs)|{BASE,archive}),tx)
                if not sub.same_field(vals[BASE],staged[BASE]):raise RuntimeError("Inactive target school differs")
                if not vals[archive] or vals[archive].get("state")!=m.string("ARCHIVE_VERIFIED_NOT_OPERATIONAL") or vals[archive].get("documentCount")!={"integerValue":str(total)}:raise RuntimeError("Archive not verified")
                for k,v in {**academic,**dependencies}.items():
                    if not sub.same_field(v,vals[k]):raise RuntimeError("Original academic records or dependencies differ; run marks catch-up first")
                pending=[]
                for k,v in docs.items():
                    if vals[k] is None:pending.append(k)
                    elif not sub.same_field(v,vals[k]):raise RuntimeError("Existing operational settings differ; no overwrite")
                return sorted(pending)
            pending=setting_check(desired,deps,docs)
            print("OPERATIONAL SETTINGS READY TO CREATE:",len(pending))
            if not apply or not pending:
                print("V46 EXACT ENTRY PLAN: PREVIEW ONLY; NO SETTINGS CREATED")
                print("READ ONLY: ZERO FIRESTORE OR AUTH WRITES; SCHOOL ACTIVE: FALSE")
                return
            if len(pending)>200:raise RuntimeError("Settings transaction exceeds reviewed bound")
            if input("Type STAGE-ENTRY-SETTINGS-300160003 to create matching settings only: ").strip()!="STAGE-ENTRY-SETTINGS-300160003":raise RuntimeError("Not confirmed")
            check_rules()
            latest,latestdeps,_=current_marks()
            if not sub.same_field(desired,latest) or not sub.same_field(deps,latestdeps):raise RuntimeError("Source changed; review again")
            tx=call(m.TARGET,api+":beginTransaction",{"options":{"readWrite":{}}})["transaction"]
            committed=False
            try:
                if setting_check(desired,deps,docs,tx)!=pending:raise RuntimeError("Target changed after preview")
                writes=[{"update":{"name":k,"fields":docs[k]},"currentDocument":{"exists":False}} for k in pending]
                result=call(m.TARGET,api+":commit",{"transaction":tx,"writes":writes})
                committed=True
                if len(result.get("writeResults",[]))!=len(writes):raise RuntimeError("Commit response incomplete; audit before retry")
            finally:
                if not committed:
                    try:call(m.TARGET,api+":rollback",{"transaction":tx})
                    except Exception:pass
            if setting_check(desired,deps,docs):raise RuntimeError("Post-copy verification incomplete")
            print("OPERATIONAL ENTRY SETTINGS VERIFIED: CREATED",len(pending))
            print("ORIGINAL MARKS AND SETTINGS UNCHANGED; V46 WRITES: ZERO; AUTH CHANGES: ZERO; MEMBERSHIP CHANGES: ZERO; SCHOOL ACTIVE: FALSE")
            return
        inventory(desired)
        creates,updates,conflicts=classify(desired,deps)
        print("SOURCE SNAPSHOT UTC:",rt)
        print("TARGET MATCHING:",json.dumps(counts(set(desired)-set(creates)-set(updates)-set(conflicts)),sort_keys=True))
        print("TARGET CREATE:",json.dumps(counts(creates),sort_keys=True))
        print("TARGET UPDATE BASELINE-IDENTICAL:",json.dumps(counts(updates),sort_keys=True))
        print("TARGET CONFLICT:",json.dumps(counts(conflicts),sort_keys=True))
        if conflicts:raise RuntimeError("Target differs from original baseline; review conflicts without overwrite")
        if not apply or not (creates or updates):
            print("READ ONLY: ZERO FIRESTORE OR AUTH WRITES; SCHOOL ACTIVE: FALSE")
            print("MARK CATCH-UP AUDIT COMPLETE" if creates or updates else "MARK CATCH-UP VERIFIED: NO PENDING WRITES")
            return
        if len(creates)+len(updates)>200:raise RuntimeError("Catch-up exceeds 200-write reviewed transaction limit")
        if input("Type CATCHUP-V47-300160003 to apply displayed changes only: ").strip()!="CATCHUP-V47-300160003":raise RuntimeError("Not confirmed")
        check_rules()
        latest,latestdeps,_=current_marks()
        if not sub.same_field(desired,latest) or not sub.same_field(deps,latestdeps):raise RuntimeError("Source changed after preview; rerun catch-up")
        inventory(desired)
        tx=call(m.TARGET,api+":beginTransaction",{"options":{"readWrite":{}}})["transaction"]
        committed=False
        try:
            if classify(desired,deps,tx)!=(creates,updates,[]):raise RuntimeError("Target changed after preview; no writes")
            writes=[{"update":{"name":k,"fields":desired[k]},"currentDocument":{"exists":False}} for k in creates]
            writes.extend({"update":{"name":k,"fields":desired[k]},"currentDocument":{"exists":True}} for k in updates)
            r=call(m.TARGET,api+":commit",{"transaction":tx,"writes":writes})
            committed=True
            if len(r.get("writeResults",[]))!=len(writes):raise RuntimeError("Commit response incomplete; run audit")
        finally:
            if not committed:
                try:call(m.TARGET,api+":rollback",{"transaction":tx})
                except Exception:pass
        if classify(desired,deps)!=([],[],[]):raise RuntimeError("Post-copy audit incomplete")
        print("MARK CATCH-UP VERIFIED: CREATED",len(creates),"UPDATED",len(updates))
        print("V46 WRITES: ZERO; AUTH CHANGES: ZERO; MEMBERSHIP CHANGES: ZERO; SCHOOL ACTIVE: FALSE")
        # This confirms the reviewed source snapshot, not a continuous sync.
        # Teachers may have saved more records since the snapshot.
        fresh,freshdeps,fresh_rt=current_marks()
        print("SOURCE CHANGED SINCE COPY:",not (sub.same_field(desired,fresh) and sub.same_field(deps,freshdeps)))
        return
    if reconcile:
        from collections import Counter
        desired,extra,replacements=snapshot()
        def inventory():
            for c in ("staff","classes","subjects","marks","user_roles"):
                actual=listing(m.TARGET,api+"/schools/"+m.SID+"/"+c,BASE+"/"+c+"/")
                if any(k not in desired for k in actual):raise RuntimeError("Unrelated target records in "+c)
        def classify(tx=None):
            vals=read(sorted(set(desired)|{archive,BASE}),tx)
            if not sub.same_field(vals[BASE],staged[BASE]):raise RuntimeError("Inactive target school differs")
            if not vals[archive] or vals[archive].get("state")!=m.string("ARCHIVE_VERIFIED_NOT_OPERATIONAL") or vals[archive].get("documentCount")!={"integerValue":str(total)}:raise RuntimeError("Baseline archive not verified")
            return reconciliation_actions(BASE,original,desired,extra,replacements,vals,sub.same_field)
        def counts(keys):
            return dict(Counter(k[len(BASE)+1:].split("/")[0] if k!=BASE else "school" for k in keys))
        inventory()
        creates,updates,conflicts=classify()
        print("TARGET CREATE COUNTS:",json.dumps(counts(creates),sort_keys=True))
        print("TARGET UPDATE COUNTS:",json.dumps(counts(updates),sort_keys=True))
        print("TARGET CONFLICT COUNTS:",json.dumps(counts(conflicts),sort_keys=True))
        if conflicts:raise RuntimeError("Target diverges from approved baseline; no writes")
        if not apply or not (creates or updates):
            print("READ ONLY: ZERO FIRESTORE OR AUTH WRITES; SCHOOL ACTIVE: FALSE")
            print("RECONCILIATION PREVIEW COMPLETE" if creates or updates else "RECONCILIATION VERIFIED: NO PENDING WRITES")
            return
        print("REVIEWED TARGET SCHOOL:",m.SID,"CREATE:",len(creates),"UPDATE:",len(updates))
        print("Original baseline preserved in private archive. No membership, Auth or school activation writes.")
        if input("Type RECONCILE-V47-300160003 to commit the displayed counts: ").strip()!="RECONCILE-V47-300160003":raise RuntimeError("Not confirmed")
        check_rules()
        latest,latest_extra,latest_replacements=snapshot()
        if not all(sub.same_field(x,y) for x,y in ((desired,latest),(extra,latest_extra),(replacements,latest_replacements))):
            raise RuntimeError("Source changed after preview; retry to review fresh counts")
        inventory()
        tx=call(m.TARGET,api+":beginTransaction",{"options":{"readWrite":{}}})["transaction"]
        committed=False
        try:
            check_creates,check_updates,check_conflicts=classify(tx)
            if (check_creates,check_updates,check_conflicts)!=(creates,updates,[]):
                raise RuntimeError("Target changed after preview; no writes")
            writes=[{"update":{"name":k,"fields":desired[k]},"currentDocument":{"exists":False}} for k in creates]
            writes.extend({"update":{"name":k,"fields":desired[k]},"currentDocument":{"exists":True}} for k in updates)
            result=call(m.TARGET,api+":commit",{"transaction":tx,"writes":writes})
            committed=True
            if len(result.get("writeResults",[]))!=len(writes):raise RuntimeError("Commit response incomplete; run read-only audit before retry")
        finally:
            if not committed:
                try:call(m.TARGET,api+":rollback",{"transaction":tx})
                except Exception:pass
        if classify()!=([],[],[]):raise RuntimeError("Post-commit verification incomplete; run read-only audit")
        print("RECONCILIATION VERIFIED: CREATED",len(creates),"UPDATED",len(updates))
        print("V46 WRITES: ZERO; AUTH CHANGES: ZERO; MEMBERSHIP CHANGES: ZERO; SCHOOL ACTIVE: FALSE")
        return
    expected,delta=snapshot()
    for c in ALLOWED:
        actual=listing(m.TARGET,api+"/schools/"+m.SID+"/"+c,BASE+"/"+c+"/")
        if any(k not in expected for k in actual):raise RuntimeError("Unrelated target records")
    missing=verify(expected,delta)
    print("DELTA ALREADY IDENTICAL:",len(delta)-len(missing),"CREATE ONLY:",len(missing))
    if not apply or not missing:
        print("READ ONLY: ZERO FIRESTORE OR AUTH WRITES; SCHOOL ACTIVE: FALSE")
        return
    if input("Type STAGE-V47-DELTA to create missing records only: ").strip()!="STAGE-V47-DELTA":raise RuntimeError("Not confirmed")
    check_rules()
    latest,newdelta=snapshot()
    if not sub.same_field(expected,latest) or not sub.same_field(delta,newdelta):raise RuntimeError("Source changed after preview; retry")
    tx=call(m.TARGET,api+":beginTransaction",{"options":{"readWrite":{}}})["transaction"]
    committed=False
    try:
        checked=verify(expected,delta,tx)
        if set(checked)!=set(missing):raise RuntimeError("Target changed after preview; retry")
        writes=[{"update":{"name":k,"fields":delta[k]},"currentDocument":{"exists":False}} for k in checked]
        r=call(m.TARGET,api+":commit",{"transaction":tx,"writes":writes})
        committed=True
        if len(r.get("writeResults",[]))!=len(writes):raise RuntimeError("Commit response incomplete; run read-only audit")
    finally:
        if not committed:
            try:call(m.TARGET,api+":rollback",{"transaction":tx})
            except Exception:pass
    if verify(expected,delta):raise RuntimeError("Post-commit verification incomplete")
    print("DELTA VERIFIED:",len(delta),"CREATED:",len(missing))
    print("V46 WRITES: ZERO; AUTH CHANGES: ZERO; MEMBERSHIP CHANGES: ZERO; SCHOOL ACTIVE: FALSE")

if __name__=="__main__":
    try:
        if sys.argv[1:]==["--self-test"]:self_test()
        elif len(sys.argv)==3 and sys.argv[1] in ("--audit-only","--apply","--audit-reconcile","--apply-reconcile"):main(Path(sys.argv[2]).expanduser(),sys.argv[1] in ("--apply","--apply-reconcile"),sys.argv[1] in ("--audit-reconcile","--apply-reconcile"))
        elif len(sys.argv)==3 and sys.argv[1] in ("--audit-marks","--apply-marks"):main(Path(sys.argv[2]).expanduser(),sys.argv[1]=="--apply-marks",False,True)
        elif len(sys.argv)==3 and sys.argv[1] in ("--audit-entry-settings","--apply-entry-settings"):main(Path(sys.argv[2]).expanduser(),sys.argv[1]=="--apply-entry-settings",False,True,True)
        else:raise RuntimeError("Specify reviewed audit/apply mode and encrypted backup")
    except (Exception,KeyboardInterrupt) as e:
        print("DELTA STOPPED:",type(e).__name__,str(e) if isinstance(e,RuntimeError) else "",file=sys.stderr)
        sys.exit(1)
