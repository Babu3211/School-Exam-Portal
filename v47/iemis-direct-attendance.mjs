// Attendance direct sync: authorized fresh reads, confirmed school-day calendar, no Firestore writes.
export function attendanceModule({version,getWorkspace,T,verifySchoolSession,enforceSchoolIdle,storage=globalThis.localStorage,showCalendar=displayCalendar}){
 const fail=m=>{throw Error(m)};
 const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T00:00:00Z'))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
 const statuses=new Set(['present','absent','leave']);
 const validClass=k=>/^(?:[1-9]|1[0-2])$/.test(k);
 function validateCalendar(value,cols){
  if(!Array.isArray(value)||value.length!==cols.length)fail('प्रमाणित विद्यालय-दिनको सूची आवश्यक छ।');
  const days=new Set();
  const out=value.map((a,i)=>{
   if(!Array.isArray(a)||!a.length||a.length>366||new Set(a).size!==a.length||a.some(d=>!validDate(d)))fail('विद्यालय खुलेका सही AD मिति (YYYY-MM-DD) राख्नुहोस्; duplicate मिति नराख्नुहोस्।');
   const max=T.maximum(cols[i].label);
   if(max!==null&&a.length>max)fail('विद्यालय-दिन IEMIS column को सीमा भन्दा धेरै छन्।');
   a.forEach(d=>days.add(d));return [...a].sort();
  });
  if(days.size>366)fail('एक शैक्षिक वर्षभन्दा धेरै मिति भयो।');
  return out;
 }
 return async request=>{
  const c=request?.context,term=request?.examTerm,klass=T.classKey(c?.className);
  if(request?.mode!=='attendance'||!c||!['first','second','third','final'].includes(term)||!/^attendance(?:\s*\/|$)/i.test(c.term)||!validClass(klass)||T.clean(c.year)!=='2083'||!/^\d{5,20}$/.test(c.schoolCode)||!T.clean(c.section)||!Array.isArray(request.columns)||!request.columns.length||request.columns.length>16)fail('IEMIS Attendance को विद्यालय, वर्ष, कक्षा र अवधि प्रमाणित गर्नुहोस्।');
  const columns=request.columns.map(col=>{
   if(typeof col?.label!=='string'||!col.label.trim()||col.label.length>200||T.subjectKey(col.subject)!=='attendance'||/absent|leave|holiday|working\s*days|school\s*days|percentage|percent|%|अनुपस्थित|बिदा|प्रतिशत/i.test(col.label))fail('उपस्थित दिनको column मात्र समर्थित छ।');
   return {subject:'Attendance',label:col.label};
  });
  if(new Set(columns.map(col=>T.columnKey(col.subject,col.label))).size!==columns.length)fail('Duplicate attendance column');
  const w=getWorkspace(),{auth,api,db}=w,user=auth?.currentUser,uid=user?.uid;
  const v47=version==='v47',sid=c.schoolCode,actor=w.actor,role=w.role,root='schools/'+sid;
  if(!uid||(v47?actor?.role!=='school_admin'||actor.active!==true||actor.uid!==uid||actor.schoolId!==sid||w.schoolId!==sid:!w.isAdmin?.()||role?.active!==true))fail('सही विद्यालयको सक्रिय Admin Login आवश्यक छ।');
  const check=()=>{const now=getWorkspace();if(now.auth!==auth||auth.currentUser?.uid!==uid||(v47?now.actor!==actor||now.sessionSeq!==w.sessionSeq||now.schoolId!==sid:auth.currentUser!==user||now.role!==role||!now.isAdmin?.()))fail('School Login परिवर्तन भयो।');};
  const readDoc=async path=>{check();const s=await api.getDocFromServer(api.doc(db,...path.split('/')));check();return s.exists()?s.data():null};
  const verify=async()=>{
   check();
   if(v47){
    if(!await enforceSchoolIdle(auth,w.authSdk))fail('Login expired');
    const member=await verifySchoolSession({schoolId:sid,uid,readDocument:readDoc});check();
    if(member.role!=='school_admin'||member.schoolId!==sid||member.uid!==uid)fail('School Admin access changed');
    const school=await readDoc(root);if(!school||school.id!==sid||school.active!==true)fail('School unavailable');
   }else{
    const school=await readDoc('school_settings/main');
    if(!school||T.clean(school.iemisCode)!==sid||T.clean(school.academicYear)!==T.clean(c.year))fail('SMSS School/Academic Year मिलेन।');
   }
   check();
  };
  await verify();
  const key='smss-iemis-attendance-calendar-v1:'+JSON.stringify([version,uid,T.normalizeContext(c),term,columns.map(x=>x.label)]);
  let calendar;
  try{const saved=storage?.getItem(key);if(saved)calendar=validateCalendar(JSON.parse(saved),columns);}catch{}
  if(!calendar){
   showCalendar({context:{...c},term,columns,onSave:async value=>{await verify();const valid=validateCalendar(value,columns);if(!storage)fail('Browser storage unavailable');storage.setItem(key,JSON.stringify(valid));}});
   fail('SMSS Portal को Attendance Sync Calendar खोल्नुहोस्। यस अवधि/कक्षाको वास्तविक विद्यालय-दिन एकपटक राखेर Save गर्नुहोस्; त्यसपछि IEMIS बाट फेरि Fetch गर्नुहोस्।');
  }
  const dates=new Set(calendar.flat()),section=T.key(c.section),allSections=section==='all';
  let readCount=0;
  const rows=async(name,filters,max)=>{
   check();const path=v47?['schools',sid,name]:[name];const snap=await api.getDocsFromServer(api.query(api.collection(db,...path),...filters.map(([k,v])=>api.where(k,'==',v)),api.limit(max+1)));check();
   if(!Array.isArray(snap?.docs)||snap.docs.length>max)fail('Attendance read limit exceeded: '+name);
   readCount+=snap.docs.length;if(readCount>30000)fail('Attendance सुरक्षित read सीमा नाघ्यो। छोटो अवधि प्रयोग गर्नुहोस्।');
   const ids=new Set();return snap.docs.map(d=>{
    const value=d.data();
    if(typeof d.id!=='string'||!d.id||ids.has(d.id)||d.ref?.path!==undefined&&d.ref.path!==path.join('/')+'/'+d.id||!value||v47&&value.schoolId!==sid||filters.some(([k,v])=>value[k]!==v))fail('Foreign or invalid saved attendance record');
    ids.add(d.id);return {...value,id:d.id};
   });
  };
  const students=await rows('students',v47?[['class',klass]]:[],v47?1500:5000);
  const classStudents=students.filter(s=>T.classKey(s.class??s.className)===klass),allIds=new Set(classStudents.map(s=>s.id));
  const roster=classStudents.filter(s=>s.active!==false&&(allSections||T.key(s.section)===section));
  if(!roster.length)fail('कक्षाका विद्यार्थी भेटिएनन्।');
  const identities=new Map(),seenReg=new Set(),seenSymbol=new Set(),counts=new Map();
  for(const [i,s] of roster.entries()){
   const regs=[s.studentIemisId,s.studentIemisNo,s.iemisStudentNo,s.iemisNumber,s.iemisNo,s.registrationNo,s.regdNo,s.regNo,s.studentIemisNumber].map(x=>T.clean(x)).filter(Boolean);
   if(new Set(regs).size>1)fail('Conflicting IEMIS student identifiers');
   const reg=regs[0]||'',symbol=T.clean(s.symbolNo||s.symbolNumber||s.examSymbolNo),name=T.clean(s.studentNameEnglish||s.nameEnglish||s.nameEn||s.studentName||s.name);
   if(!name||!reg&&!symbol||reg&&seenReg.has(reg)||symbol&&seenSymbol.has(symbol))fail('विद्यार्थी पहिचान खाली वा दोहोरिएको छ।');
   if(reg)seenReg.add(reg);if(symbol)seenSymbol.add(symbol);
   identities.set(s.id,[s.rollNo??i+1,name,reg,symbol]);counts.set(s.id,new Map());
  }
  const add=(id,date,status)=>{
   if(!allIds.has(id))fail('Unknown student in saved class attendance');
   if(!counts.has(id))return;const map=counts.get(id);
   if(map.has(date))fail('Duplicate daily attendance: '+date);
   if(!statuses.has(status))fail('Invalid daily attendance status');map.set(date,status);
  };
  const batches=await rows('attendance',[['attendanceType','daily'],['academicYear',c.year]],4000);
  for(const b of batches){
   if(!dates.has(b.date)||T.classKey(b.className)!==klass)continue;
   if(!Array.isArray(b.students)||!b.students.length||b.students.length>1500||b.subject)fail('Invalid daily attendance batch');
   const unique=new Set(),totals={present:0,absent:0,leave:0};
   for(const s of b.students){if(!s||unique.has(s.studentId)||!statuses.has(s.status))fail('Invalid or duplicate batch student');unique.add(s.studentId);totals[s.status]++;add(s.studentId,b.date,s.status);}
   if(b.totalStudents!==b.students.length||b.presentCount!==totals.present||b.absentCount!==totals.absent||b.leaveCount!==totals.leave)fail('Saved attendance totals mismatch');
  }
  if(v47){
   // New V47 daily rows and legacy daily batches cannot be silently merged twice.
   const days=[...dates].sort();
   for(let i=0;i<days.length;i+=6){
    const result=await Promise.all(days.slice(i,i+6).map(date=>rows('attendance',[['class',klass],['date',date]],1500)));
    for(const group of result)for(const r of group){
     if(Array.isArray(r.students))continue; // processed via verified legacy batch query
     if(typeof r.present!=='boolean'||r.attendanceType&&r.attendanceType!=='daily'||r.academicYear!==undefined&&T.clean(r.academicYear)!==c.year)fail('Invalid individual attendance');
     add(r.studentId,r.date,r.present?'present':'absent');
    }
   }
  }
  const result=[...identities].map(([id,identity])=>[...identity,...calendar.map(period=>{
   let present=0;for(const date of period){const state=counts.get(id).get(date);if(state===undefined)fail('हाजिरी अपूर्ण छ: '+date+' को सबै विद्यार्थीको हाजिरी सुरक्षित गर्नुहोस्।');if(state==='present')present++;}
   return present;
  })]);
  await verify();
  return {format:'SMSS-IEMIS-DIRECT-1',savedOnly:true,mode:'attendance',examTerm:term,grid:{context:{schoolCode:sid,year:c.year,className:klass,term:c.term,section:allSections?'All':T.clean(roster[0].section)},columns:columns.map((col,i)=>({...col,index:i+4})),rows:result}};
 };
}
function displayCalendar({context,term,columns,onSave}){
 if(typeof document==='undefined')return;
 document.getElementById('smss-iemis-calendar-panel')?.remove();
 const panel=document.createElement('section');panel.id='smss-iemis-calendar-panel';panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Attendance Sync Calendar');
 Object.assign(panel.style,{position:'fixed',right:'12px',top:'12px',zIndex:'2147483647',background:'#fff',color:'#153457',border:'1px solid #c3d1e0',borderRadius:'10px',padding:'16px',maxWidth:'min(520px,90vw)',maxHeight:'85vh',overflow:'auto',boxShadow:'0 8px 35px #0004',font:'15px system-ui'});
 const make=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e};
 panel.append(make('h2','Attendance Sync Calendar'),make('p',`${context.year} · Class ${context.className} · ${context.section} · ${term}`),make('p','विद्यालय खुलेका वास्तविक AD मिति YYYY-MM-DD (प्रति लाइन एक) प्रत्येक IEMIS column का लागि राख्नुहोस्। बिदाका दिन नराख्नुहोस्। यो सूची यही Browser मा मात्र सुरक्षित हुन्छ।'));
 const inputs=columns.map(col=>{const label=make('label',col.label);label.style.display='block';const field=make('textarea');field.rows=4;field.placeholder='2026-09-01\n2026-09-02';field.style.width='100%';label.append(field);panel.append(label);return field});
 const confirmation=make('label');const box=make('input');box.type='checkbox';confirmation.append(box,document.createTextNode(' यी विद्यालयका प्रमाणित वास्तविक खुला दिन हुन्।'));panel.append(confirmation);
 const status=make('p'),save=make('button','Save Calendar'),close=make('button','Close');save.type=close.type='button';panel.append(status,save,close);
 close.onclick=()=>panel.remove();
 save.onclick=async()=>{if(!box.checked){status.textContent='पहिले वास्तविक दिन प्रमाणित गर्नुहोस्।';return}save.disabled=true;try{await onSave(inputs.map(e=>e.value.trim().split(/[\s,;]+/).filter(Boolean)));status.textContent='Calendar सुरक्षित भयो। IEMIS मा फर्केर Fetch SMSS Attendance थिच्नुहोस्।';save.remove();}catch(e){status.textContent=String(e.message||e);save.disabled=false}};
 (document.body||document.documentElement).append(panel);
}
