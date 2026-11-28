import '../iemis-importer/transfer.js';
import {attendanceModule} from '../iemis-direct-attendance.js';
async function runAttendanceRegression(attendanceModule,T,version){
 const equal=(a,b,m)=>{if(JSON.stringify(a)!==JSON.stringify(b))throw Error(m+': '+JSON.stringify(a))};
 const reject=async(fn,re)=>{let e;try{await fn()}catch(x){e=x}if(!e||!re.test(e.message))throw Error('Expected '+re+' got '+e?.message)};
 const sid='999990001',uid='test-admin',v47=version==='v47',user={uid},auth={currentUser:user},actor={uid,schoolId:sid,role:'school_admin',active:true},role={active:true};
 const days=['2026-09-01','2026-09-02','2026-09-03'],studentClass=v47?'9':'कक्षा ९';
 const base=v47?{schoolId:sid}:{},students=[{...base,id:'s1',class:studentClass,nameEnglish:'Student A',studentIemisId:'1001',section:'A'},{...base,id:'s2',class:studentClass,nameEnglish:'Student B',studentIemisId:'1002',section:'A'}];
 const batch=(id,date,states,type='daily')=>({...base,id,date,className:studentClass,academicYear:'2083',attendanceType:type,subject:type==='daily'?null:'English',students:states.map(([studentId,status])=>({studentId,status})),totalStudents:states.length,presentCount:states.filter(s=>s[1]==='present').length,absentCount:states.filter(s=>s[1]==='absent').length,leaveCount:states.filter(s=>s[1]==='leave').length});
 const attendance=[batch('b1',days[0],[['s1','present'],['s2','absent']]),batch('b2',days[1],[['s1','leave'],['s2','absent']]),batch('ignored',days[0],[['s1','present'],['s2','present']],'subject')];
 if(v47)attendance.push({...base,id:'s1day3',class:'9',date:days[2],studentId:'s1',present:true},{...base,id:'s2day3',class:'9',date:days[2],studentId:'s2',present:false});
 else attendance.push(batch('b3',days[2],[['s1','present'],['s2','absent']]));
 const tables={students,attendance};let admin=true,memberRole='school_admin',panel=null,reads=0;
 const school=v47?{id:sid,active:true}:{iemisCode:sid,academicYear:'2083'};
 const doc=(d,p)=>({id:d.id,ref:{path:p},data:()=>d,exists:()=>true});
 const api={doc:(_, ...p)=>p.join('/'),collection:(_, ...p)=>p.join('/'),query:(path,...filters)=>({path,filters}),where:(k,op,v)=>[k,v],limit:n=>n,
 getDocFromServer:async p=>doc(school,p),getDocsFromServer:async({path,filters})=>{reads++;if(v47&&!path.startsWith('schools/'+sid+'/'))throw Error('Tenant path escaped');return {docs:tables[path.split('/').at(-1)].filter(d=>filters.filter(Array.isArray).every(([k,v])=>d[k]===v)).map(d=>doc(d,path+'/'+d.id))}}};
 const w={auth,api,db:{},actor,role,schoolId:sid,sessionSeq:1,authSdk:{},isAdmin:()=>admin};
 const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
 const reader=attendanceModule({version,getWorkspace:()=>w,T,storage,showCalendar:p=>panel=p,verifySchoolSession:async()=>({schoolId:sid,uid,role:memberRole}),enforceSchoolIdle:async()=>true});
 const req={mode:'attendance',examTerm:'second',context:{schoolCode:sid,year:'2083',className:'Class 9',term:'Attendance / Term',section:'All'},columns:[{subject:'Attendance',label:'Present Days(20)'}]};
 await reject(()=>reader(req),/Attendance Sync Calendar/);equal(reads,0,'No student reads before calendar');
 await reject(()=>panel.onSave([['2026-02-30']]),/मिति/);
 await reject(()=>panel.onSave([[days[0],days[0]]]),/duplicate/);
 await panel.onSave([days]);
 const result=await reader(req);
 equal([result.format,result.mode,result.examTerm,result.savedOnly],['SMSS-IEMIS-DIRECT-1','attendance','second',true],'Envelope');
 equal(result.grid.rows.map(r=>[r[2],r[4]]),[['1001',2],['1002',0]],'Present only counts, leave and zero preserved');
 equal(result.grid.columns[0].index,4,'Column index');
 const duplicate=batch('duplicate',days[0],[['s1','present'],['s2','absent']]);attendance.push(duplicate);await reject(()=>reader(req),/Duplicate daily/);attendance.pop();
 const b2=attendance.splice(1,1)[0];await reject(()=>reader(req),/हाजिरी अपूर्ण/);attendance.splice(1,0,b2);
 attendance[0].presentCount=99;await reject(()=>reader(req),/totals mismatch/);attendance[0].presentCount=1;
 await reject(()=>reader({...req,context:{...req.context,schoolCode:'999990002'}}),v47?/Admin Login/:/School/);
 await reject(()=>reader({...req,columns:[{subject:'Attendance',label:'Absent Days'}]}),/उपस्थित/);
 if(v47){memberRole='viewer';await reject(()=>reader(req),/access changed/);memberRole='school_admin';}else{admin=false;await reject(()=>reader(req),/Admin Login/);admin=true;}
 return 'PASS '+version+' saved attendance: approved calendar, batch and individual records, present/leave/absence, zero, scope, missing and duplicate dates, no writes';
}
console.log(await runAttendanceRegression(attendanceModule,globalThis.SmssIemisTransfer,'v46'));
