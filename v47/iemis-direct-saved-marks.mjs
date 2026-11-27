import {attendanceModule} from './iemis-direct-attendance.mjs';
// Read-only V47 migrated saved marks, ordinary score components only. No Firebase writes.
export function createV47IemisReader({getWorkspace,verifySchoolSession,enforceSchoolIdle,T}){
 const termMap={first:'1st',second:'2nd',third:'3rd',final:'final'};
 const labels={first:'First Term',second:'Second Term',third:'Third Term',final:'Final Term'};
 const oldKeys={first:'first',second:'second',third:'third',final:'annual'};
 const fail=m=>{throw Error(m)};
 const ident=/^[A-Za-z0-9_-]{1,128}$/;
 const kindSet=new Set(['participation','practical','term','theory','absent']);
 const attendance=attendanceModule({version:'v47',getWorkspace,T,verifySchoolSession,enforceSchoolIdle});
 return async request=>{
  if(request?.mode==='attendance')return attendance(request);
  if(request?.mode!=='marks')fail('Attendance र Class 5 Final को प्रमाणित reader अझै तयार छैन।');
  const c=request.context, examTerm=request.examTerm, term=termMap[examTerm], klass=T.classKey(c?.className);
  if(!c||!term||T.termKey(c.term)!==examTerm||!['6','7','8','9','10'].includes(klass)||T.clean(c.year)!=='2083'||!Array.isArray(request.columns)||!request.columns.length||request.columns.length>150)fail('Class 6–10, 2083 र सही Term आवश्यक छ।');
  const w=getWorkspace(), {actor,auth,authSdk,db,api,schoolId,sessionSeq}=w;
  if(!actor||actor.role!=='school_admin'||actor.active!==true||!auth?.currentUser?.uid||actor.uid!==auth.currentUser.uid||actor.schoolId!==schoolId||schoolId!==T.clean(c.schoolCode)||!/^\d{5,20}$/.test(schoolId))fail('सही विद्यालयको सक्रिय School Admin Login आवश्यक छ।');
  const uid=actor.uid;
  const check=()=>{const v=getWorkspace();if(v.actor!==actor||v.sessionSeq!==sessionSeq||v.schoolId!==schoolId||v.auth!==auth||auth.currentUser?.uid!==uid)fail('School Login परिवर्तन भयो।')};
  const root='schools/'+schoolId;
  const readDocument=async path=>{check();const s=await api.getDocFromServer(api.doc(db,...path.split('/')));check();return s.exists()?s.data():null};
  const verify=async()=>{check();if(!await enforceSchoolIdle(auth,authSdk))fail('Login expired');const member=await verifySchoolSession({schoolId,uid,readDocument});check();if(member.role!=='school_admin'||member.schoolId!==schoolId||member.uid!==uid)fail('School Admin access changed');};
  const readRows=async(collection,filters,max)=>{
   check();const snapshot=await api.getDocsFromServer(api.query(api.collection(db,'schools',schoolId,collection),...filters.map(([field,value])=>api.where(field,'==',value)),api.limit(max+1)));check();
   if(!Array.isArray(snapshot?.docs)||snapshot.docs.length>max)fail('Data limit exceeded: '+collection);
   const seen=new Set();return snapshot.docs.map(d=>{const value=d.data();if(!(collection==='marks'?/^[A-Za-z0-9_:-]{1,256}$/.test(d.id):ident.test(d.id))||seen.has(d.id)||d.ref?.path!==undefined&&d.ref.path!==root+'/'+collection+'/'+d.id||!value||value.schoolId!==schoolId||filters.some(([key,expected])=>value[key]!==expected))fail('Invalid or foreign '+collection+' record');seen.add(d.id);return {...value,id:d.id};});
  };
  await verify();
  const school=await readDocument(root);if(!school||school.id!==schoolId||school.active!==true)fail('School unavailable');
  const wanted=new Map();
  for(const column of request.columns){
   if(typeof column?.subject!=='string'||typeof column?.label!=='string')fail('Invalid subject request');
   const sub=T.subjectKey(column.subject),kind=T.componentKey(column.label);
   if(!sub||!kindSet.has(kind))fail('Unsupported marks component: '+column.label);
   if(!wanted.has(sub))wanted.set(sub,new Set());
   if(wanted.get(sub).has(kind))fail('Duplicate subject component');wanted.get(sub).add(kind);
  }
  const catalog=await readRows('subjects',[['class',klass]],100);
  const subjects=new Map();
  for(const subject of catalog){const key=T.subjectKey(subject.name);if(!wanted.has(key))continue;if(subject.active!==true||subjects.has(key))fail('Inactive or duplicate subject: '+subject.name);subjects.set(key,subject);}
  if(subjects.size!==wanted.size)fail('IEMIS subject not found in saved school catalog');
  const all=await readRows('students',[['class',klass]],1500);
  const allStudents=new Map(all.map(s=>[s.id,s]));
  const sectionKey=T.key(c.section||'All'), allSections=sectionKey==='all';
  const roster=all.filter(s=>(!Object.hasOwn(s,'active')||s.active===true)&&(allSections||T.key(s.section)===sectionKey));
  if(!roster.length)fail('No eligible saved students');
  const section=allSections?'All':T.clean(roster[0].section);
  const seenReg=new Set();
  const rows=new Map(roster.map((s,i)=>{
   const ids=[s.studentIemisId,s.studentIemisNo,s.iemisStudentNo,s.iemisNumber,s.iemisNo,s.registrationNo,s.regdNo,s.regNo,s.studentIemisNumber].map(v=>T.clean(v)).filter(Boolean);
   if(new Set(ids).size>1)fail('Conflicting IEMIS student identifiers');
   const reg=ids[0]||'';
   const name=T.clean(s.studentNameEnglish||s.nameEnglish||s.studentName||s.name);
   if(!reg||!name||seenReg.has(reg))fail('Missing or duplicate IEMIS student registration');
   seenReg.add(reg);return [s.id,[s.rollNo??i+1,name,reg,T.clean(s.symbolNo||s.symbolNumber||s.examSymbolNo||'')]];
  }));
  const exams=await readRows('exams',[['class',klass],['term',term]],100);
  const eligible=exams.filter(e=>String(e.academicYear)==='2083'&&e.active!==false&&e.termKey===oldKeys[examTerm]);
  if(eligible.length!==1)fail('एक मात्र प्रमाणित 2083 परीक्षा आवश्यक छ; duplicate वा missing exam भेटियो।');
  const exam=eligible[0],columns=[],dataByStudent=new Map(roster.map(s=>[s.id,new Map()]));
  for(const [key,subject] of subjects){
   const records=await readRows('marks',[['class',klass],['term',term],['subjectId',subject.id],['examId',exam.id]],3000);
   const seen=new Set(), scales=new Map(), requested=wanted.get(key);
   // V46 optional choices are preserved on migrated student records. Do not require
   // a Computer/Optional I mark from students enrolled in a different optional.
   const raw=String(subject.name).trim().toLowerCase();
   const slot=Number(klass)>=9?(/ऐच्छिक\s*(?:प्रथम|पहिलो|१)|optional\s*(?:i|1|first)\b|\bopt\.?\s*i\b/.test(raw)?1:/ऐच्छिक\s*(?:द्वितीय|दोस्रो|२)|optional\s*(?:ii|2|second)\b|\bopt\.?\s*ii\b/.test(raw)?2:['environmentalscience','additionalmathematics'].includes(key)?1:key==='computerscience'?2:0):0;
   const applicable=new Set();
   for(const st of roster){
    if(!slot){applicable.add(st.id);continue;}
    const selected=slot===1?(st.optionalSubject1??st.optionalI??st.optionalFirstSubject):(st.optionalSubject2??st.optionalII??st.optionalSecondSubject);
    if(!T.clean(selected))fail('Optional subject assignment पूरा छैन: '+subject.name);
    if(T.subjectKey(selected)===key)applicable.add(st.id);
   }
   if(!applicable.size)fail('No eligible optional students: '+subject.name);
   for(const r of records){
    const st=allStudents.get(r.studentId);
    if(!st||String(r.academicYear)!==String(exam.academicYear)||r.termKey!==exam.termKey||T.subjectKey(r.subject)!==key||typeof r.isAbsent!=='boolean'||!Array.isArray(r.scores)||seen.has(r.studentId))fail('Invalid, duplicated or wrong-year saved marks');
    seen.add(r.studentId);if(!rows.has(r.studentId))continue;
    if(!applicable.has(r.studentId))fail('Saved optional subject assignment mismatch');
    if(r.section&&T.key(r.section)!==T.key(st.section))fail('Saved section mismatch');
    const scores=new Map();
    for(const score of r.scores){const k=T.componentKey(score.name);if(scores.has(k)||typeof score.fullMarks!=='number'||!Number.isFinite(score.fullMarks)||score.fullMarks<0||score.obtained!==null&&score.obtained!==''&&(typeof score.obtained!=='number'||!Number.isFinite(score.obtained)||score.obtained<0||score.obtained>score.fullMarks))fail('Invalid original saved score');scores.set(k,score);}
    for(const kind of requested){
     const row=dataByStudent.get(r.studentId), col=key+'::'+kind;
     if(kind==='absent'){row.set(col,r.isAbsent?'TRUE':'FALSE');continue;}
     const score=scores.get(kind);
     if(!score||score.fullMarks<=0)fail('Original component/full marks missing: '+subject.name+' '+kind);
     if(scales.has(kind)&&scales.get(kind)!==score.fullMarks)fail('Mixed SMSS full marks in one subject component');
     scales.set(kind,score.fullMarks);row.set(col,r.isAbsent||score.obtained===null?'':score.obtained);
    }
   }
   if([...applicable].some(id=>!seen.has(id)))fail('Incomplete saved class marks: '+subject.name);
   for(const st of roster)if(!applicable.has(st.id))for(const kind of requested)dataByStudent.get(st.id).set(key+'::'+kind,'N/A');
   for(const kind of requested){
    const base={absent:'IsAbsent',participation:'Participation',practical:'Practical/Project',term:examTerm==='final'?'Total of Term':labels[examTerm]+' Examination',theory:'TH (Theory)'}[kind];
    columns.push({subject:subject.name,label:kind==='absent'?base:base+'('+scales.get(kind)+')',key:key+'::'+kind});
   }
  }
  await verify();
  const context={schoolCode:school.id,year:String(exam.academicYear),className:exam.class,term:labels[examTerm],section};
  if(JSON.stringify(T.normalizeContext(context))!==JSON.stringify(T.normalizeContext(c)))fail('Source context mismatch');
  const grid={context,columns:columns.map(({subject,label},i)=>({subject,label,index:i+4})),rows:[...rows].map(([id,row])=>[...row,...columns.map(col=>dataByStudent.get(id).get(col.key)??'')])};
  check();return {format:'SMSS-IEMIS-DIRECT-1',savedOnly:true,mode:'marks',examTerm,grid};
 };
}
