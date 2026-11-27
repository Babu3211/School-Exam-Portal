import {attendanceModule} from './iemis-direct-attendance.js';
// V46 single-school saved marks, no writes or draft/UI state reads.
export function createV46DirectReader({getWorkspace,T,examTermKey,subjectLabel,optionalSlot,studentOptional}){
 const termKeys={first:'first',second:'second',third:'third',final:'annual'};
 const names={first:'First Term',second:'Second Term',third:'Third Term',final:'Final Term'};
 const kinds=new Set(['absent','participation','practical','term','theory']);
 const fail=m=>{throw Error(m)};
 const attendance=attendanceModule({version:'v46',getWorkspace,T});
 return async request=>{
  if(request?.mode==='attendance')return attendance(request);
  if(request?.mode!=='marks')fail('Attendance र Class 5 को Direct Sync अझै तयार छैन।');
  const c=request.context,term=request.examTerm;
  if(!c||!Object.hasOwn(termKeys,term)||T.termKey(c.term)!==term||T.clean(c.year)!=='2083'||!/^[0-9]{5,20}$/.test(c.schoolCode)||!['1','2','3','4','5','6','7','8','9','10'].includes(T.classKey(c.className))||!Array.isArray(request.columns)||!request.columns.length||request.columns.length>150)fail('सही विद्यालय, वर्ष 2083, कक्षा 1–10 र Term आवश्यक छ।');
  const klass=T.classKey(c.className), year=T.clean(c.year);
  const primary=Number(klass)<=5,primaryKinds=new Set(['absent','count','full','obtained']);
  const w=getWorkspace(),{auth,db,api,role,isAdmin}=w,user=auth?.currentUser;
  if(!user?.uid||!isAdmin()||role?.active!==true)fail('सक्रिय SMSS Admin Login आवश्यक छ।');
  const check=()=>{const now=getWorkspace();if(now.auth!==auth||auth.currentUser!==user||now.role!==role||!now.isAdmin())fail('Login परिवर्तन भयो। फेरि Fetch गर्नुहोस्।');};
  const read=async(name,filters,max)=>{
   check();const snap=await api.getDocsFromServer(api.query(api.collection(db,name),...filters.map(([k,v])=>api.where(k,'==',v)),api.limit(max+1)));check();
   if(!Array.isArray(snap?.docs)||snap.docs.length>max)fail('सुरक्षित read सीमा नाघ्यो: '+name);
   const ids=new Set();return snap.docs.map(d=>{const v=d.data();if(typeof d.id!=='string'||!d.id||ids.has(d.id)||d.ref?.path!==undefined&&d.ref.path!==name+'/'+d.id||!v||typeof v!=='object'||filters.some(([k,x])=>v[k]!==x))fail('अमान्य saved record: '+name);ids.add(d.id);return {...v,id:d.id};});
  };
  const school=async()=>{check();const s=await api.getDocFromServer(api.doc(db,'school_settings','main'));check();const d=s.exists()?s.data():null;if(!d||T.clean(d.iemisCode)!==c.schoolCode||T.clean(d.academicYear)!==year)fail('SMSS School/Academic Year मिलेन।');return d;};
  await school();
  const wanted=new Map();
  for(const col of request.columns){
   if(typeof col?.subject!=='string'||typeof col?.label!=='string')fail('अमान्य विषय request');
   const key=T.subjectKey(col.subject),kind=T.componentKey(col.label);
   if(!key||!(primary?primaryKinds:kinds).has(kind))fail('Unsupported component: '+col.label);
   if(!wanted.has(key))wanted.set(key,new Set());
   if(wanted.get(key).has(kind))fail('Duplicate requested component');
   wanted.get(key).add(kind);
  }
  if(primary)for(const set of wanted.values())if((set.has('obtained')||set.has('full'))&&!set.has('count'))fail('Learning Achievement count column आवश्यक छ।');
  const subjectKey=s=>T.subjectKey(subjectLabel(s));
  const [catalog,allStudents,exams]=await Promise.all([read('classes',[],3000),read('students',[],5000),read('exams',[],1000)]);
  const subjects=new Map();
  for(const r of catalog){
   if(r.active===false||T.classKey(r.className)!==klass||typeof r.subject!=='string')continue;
   const key=subjectKey(r.subject);
   if(!wanted.has(key))continue;
   if(subjects.has(key)&&subjects.get(key)!==r.subject)fail('Duplicate subject in class catalog');
   subjects.set(key,r.subject);
  }
  if(subjects.size!==wanted.size)fail('IEMIS को कुनै विषय SMSS class catalog मा भेटिएन।');
  const selected=exams.filter(e=>e.active!==false&&T.classKey(e.className)===klass&&T.clean(e.academicYear)===year&&examTermKey(e)===termKeys[term]);
  if(selected.length!==1)fail('यो कक्षा, वर्ष र Term मा एउटा मात्र सुरक्षित परीक्षा चाहिन्छ।');
  const exam=selected[0], sectionKey=T.key(c.section),allSections=sectionKey==='all';
  const classStudents=allStudents.filter(s=>T.classKey(s.class??s.className)===klass);
  const byId=new Map(classStudents.map(s=>[s.id,s]));
  const roster=classStudents.filter(s=>s.active!==false&&(allSections||T.key(s.section)===sectionKey));
  if(!roster.length)fail('सही कक्षा/Section का विद्यार्थी भेटिएनन्।');
  const identities=new Map(),registrations=new Set(),symbols=new Set();
  for(const [i,s] of roster.entries()){
   const ids=[s.studentIemisId,s.studentIemisNo,s.iemisStudentNo,s.iemisNumber,s.iemisNo,s.registrationNo,s.regdNo,s.regNo,s.studentIemisNumber].map(v=>T.clean(v)).filter(Boolean);
   if(new Set(ids).size>1)fail('Conflicting IEMIS student identifiers');
   const reg=ids[0]||'';
   const symbol=T.clean(s.symbolNo||s.symbolNumber||s.examSymbolNo||'');
   const name=T.clean(s.studentNameEnglish||s.nameEnglish||s.studentName||s.name);
   if(!name||(!reg&&!symbol)||reg&&registrations.has(reg)||!reg&&symbols.has(symbol))fail('विद्यार्थी ID खाली वा दोहोरिएको छ।');
   if(reg)registrations.add(reg);else symbols.add(symbol);
   identities.set(s.id,[s.rollNo??i+1,name,reg,symbol]);
  }
  const records=await read('marks',[['examId',exam.id]],30000);
  const columns=[],byStudent=new Map(roster.map(s=>[s.id,new Map()]));
  for(const [key,subject] of subjects){
   const requested=wanted.get(key),slot=optionalSlot(subject);
   const applies=new Set();
   for(const student of roster){
    if(!slot){applies.add(student.id);continue;}
    const selected=studentOptional(student,slot);
    if(!T.clean(selected))fail('Optional subject assignment पूरा छैन।');
    if(subjectKey(selected)===key)applies.add(student.id);
   }
   if(!applies.size)fail('यो optional subject का विद्यार्थी छैनन्: '+subject);
   const seen=new Set(),scales=new Map();
   for(const r of records){
    if(subjectKey(r.subject)!==key)continue;
    const student=byId.get(r.studentId);
    if(!student||T.classKey(r.className)!==klass||r.academicYear!==undefined&&T.clean(r.academicYear)!==year||seen.has(r.studentId))fail('Duplicate वा गलत saved marks: '+subject);
    seen.add(r.studentId);
    if(!byStudent.has(r.studentId))continue;
    if(!applies.has(r.studentId))fail('Optional subject को सुरक्षित record assignment सँग मिलेन।');
    if(r.section&&T.key(r.section)!==T.key(student.section))fail('Saved section mismatch');
    if(typeof r.isAbsent!=='boolean'||!Array.isArray(r.scores))fail('Saved assessment संरचना मिलेन।');
    const scores=new Map();
    for(const s of r.scores){
     const k=T.componentKey(s.name),n=s.obtained;
     if(scores.has(k)||typeof s.fullMarks!=='number'||!Number.isFinite(s.fullMarks)||s.fullMarks<0||n!==null&&n!==''&&(typeof n!=='number'||!Number.isFinite(n)||n<0||n>s.fullMarks))fail('Invalid original saved score');
     scores.set(k,s);
    }
    // The saved primary assessment is an exact count × 4 contract; never scale it.
    if(primary){
     const count=scores.get('count'),full=scores.get('full'),obtained=scores.get('obtained');
     if(!count||!full||!obtained||!Number.isInteger(count.fullMarks)||count.fullMarks<0||count.fullMarks>5000||full.fullMarks!==count.fullMarks*4||obtained.fullMarks!==full.fullMarks||full.obtained!==null||(!r.isAbsent&&(count.obtained!==count.fullMarks||!Number.isInteger(obtained.obtained)||obtained.obtained<0||obtained.obtained>full.fullMarks))||(r.isAbsent&&(count.obtained!==null||obtained.obtained!==null)))fail('Saved learning achievement count/full/obtained mismatch');
     if(r.isAbsent&&!requested.has('absent'))fail('IEMIS primary absence column unavailable');
     for(const kind of requested){
      const value=kind==='absent'?(r.isAbsent?'TRUE':'FALSE'):kind==='count'?count.fullMarks:kind==='full'?full.fullMarks:r.isAbsent?'':obtained.obtained;
      byStudent.get(r.studentId).set(key+'::'+kind,value);
     }
     continue;
    }
    for(const kind of requested){
     const row=byStudent.get(r.studentId),col=key+'::'+kind;
     if(kind==='absent'){row.set(col,r.isAbsent?'TRUE':'FALSE');continue;}
     const s=scores.get(kind);
     if(!s||s.fullMarks<=0)fail('मूल component वा पूर्णाङ्क भेटिएन: '+subject);
     if(scales.has(kind)&&scales.get(kind)!==s.fullMarks)fail('Mixed SMSS full marks: '+subject);
     scales.set(kind,s.fullMarks);row.set(col,r.isAbsent||s.obtained===null?'':s.obtained);
    }
   }
   if([...applies].some(id=>!seen.has(id)))fail('Incomplete saved marks: '+subject);
   for(const kind of requested){
    if(primary){
     const label={absent:'IsAbsent',count:'No. Of Learning Achievement',full:'Full Marks',obtained:'Obtained Learning Achievement'}[kind];
     columns.push({subject:subjectLabel(subject),label,key:key+'::'+kind});
     continue;
    }
    const base={absent:'IsAbsent',participation:'Participation',practical:'Practical/Project',term:term==='final'?'Total of Term':names[term]+' Examination',theory:'TH (Theory)'}[kind];
    columns.push({subject:subjectLabel(subject),label:kind==='absent'?base:base+'('+scales.get(kind)+')',key:key+'::'+kind});
   }
   for(const s of roster)if(!applies.has(s.id))for(const kind of requested)byStudent.get(s.id).set(key+'::'+kind,'N/A');
  }
  const profile=await school();
  const context={schoolCode:T.clean(profile.iemisCode),year:T.clean(exam.academicYear),className:exam.className,term:names[term],section:allSections?'All':T.clean(roster[0].section)};
  if(JSON.stringify(T.normalizeContext(context))!==JSON.stringify(T.normalizeContext(c)))fail('Source context mismatch');
  check();
  return {format:'SMSS-IEMIS-DIRECT-1',savedOnly:true,mode:'marks',examTerm:term,grid:{context,columns:columns.map(({subject,label},i)=>({subject,label,index:i+4})),rows:[...identities].map(([id,row])=>[...row,...columns.map(col=>byStudent.get(id).get(col.key)??'')])}};
 };
}
