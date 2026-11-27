import './iemis-direct-transfer-keys.js';
import {createV47IemisReader} from './iemis-direct-saved-marks.mjs';
async function runRegression(T,createV47IemisReader){
 const assert=(v,m)=>{if(!v)throw Error(m)};
 const eq=(a,b,m)=>assert(JSON.stringify(a)===JSON.stringify(b),m+': '+JSON.stringify(a));
 const reject=async(fn,re)=>{let caught;try{await fn()}catch(e){caught=e;}assert(caught&&re.test(caught.message),'Expected rejection '+re+'; got '+caught?.message);};
 const schoolId='999990001',uid='test-admin',root='schools/'+schoolId;
 const school={id:schoolId,active:true},auth={currentUser:{uid}},actor={uid,schoolId,role:'school_admin',active:true};
 let activeRole='school_admin',idle=true,reads=0,flip=false,foreign=false;
 let workspace={actor,auth,authSdk:{},db:{},api:null,schoolId,sessionSeq:1};
 const b={schoolId,class:'9'},x={...b,term:'2nd',termKey:'second',academicYear:'2083'};
 const subjects=[{...b,id:'english',name:'English',active:true},{...b,id:'math',name:'Mathematics',active:true}];
 const students=[{...b,id:'b',nameEnglish:'Student B',studentIemisNo:'902',section:'A'},{...b,id:'a',nameEnglish:'Student A',studentIemisId:'901',section:'A'}];
 const exams=[{...x,id:'exam-2',active:true}];
 const marks=[];
 for(const [studentId,subjectId,n] of [['b','english',0],['a','english',70],['b','math',80],['a','math',95]]){
  marks.push({...x,id:studentId+':'+subjectId,studentId,subjectId,subject:subjects.find(s=>s.id===subjectId).name,examId:'exam-2',isAbsent:false,section:'A',scores:[{name:'Second Term Examination',fullMarks:100,obtained:n}]});
 }
 const tables={subjects,students,exams,marks};
 const doc=(d,path)=>({id:d.id,ref:{path},exists:()=>true,data:()=>d});
 workspace.api={doc:(_, ...p)=>p.join('/'),collection:(_, ...p)=>p.join('/'),where:(field,op,value)=>[field,value],limit:n=>n,query:(path,...filters)=>({path,filters}),
  getDocFromServer:async path=>{assert(path===root,'Unexpected school read');return doc(school,path);},
  getDocsFromServer:async({path,filters})=>{
   assert(path.startsWith(root+'/'),'Tenant path escaped');reads++;
   const k=path.split('/').at(-1),f=filters.filter(Array.isArray);
   const docs=tables[k].filter(d=>f.every(([key,value])=>d[key]===value)).map(d=>doc(foreign&&k==='marks'?{...d,schoolId:'999990002'}:d,path+'/'+d.id));
   if(flip&&k==='marks')workspace={...workspace,sessionSeq:2};
   return {docs};
  }};
 const reader=createV47IemisReader({getWorkspace:()=>workspace,verifySchoolSession:async()=>({schoolId,uid,role:activeRole}),enforceSchoolIdle:async()=>idle,T});
 const request={mode:'marks',examTerm:'second',context:{schoolCode:schoolId,year:'2083',className:'Class 9',term:'Second Term',section:'All'},columns:[{subject:'Comp Mathematics (1031)',label:'Second Term Examination(50)'},{subject:'English',label:'IsAbsent'},{subject:'English',label:'Second Term Examination(25)'}]};
 const response=await reader(request);
 eq([response.format,response.savedOnly,response.mode,response.examTerm],['SMSS-IEMIS-DIRECT-1',true,'marks','second'],'Envelope mismatch');
 eq(response.grid.columns.map(c=>c.index),[4,5,6],'Source indexes');
 const keys=response.grid.columns.map(c=>T.columnKey(c.subject,c.label));
 const m=keys.indexOf('mathematics::term')+4,e=keys.indexOf('english::term')+4;
 assert(m>=4&&e>=4,'Subject mapping missing');
 eq(response.grid.rows.map(r=>[r[2],r[m],r[e]]),[['902',80,0],['901',95,70]],'Student/subject source scores');
 eq(response.grid.columns.filter(c=>T.componentKey(c.label)==='term').map(c=>T.maximum(c.label)),[100,100],'Source full marks must remain original');
 students[1].studentIemisNo='999';await reject(()=>reader(request),/Conflicting IEMIS/);delete students[1].studentIemisNo;
 const initialReads=reads;
 await reject(()=>reader({...request,context:{...request.context,schoolCode:'999990002'}}),/School Admin/);eq(reads,initialReads,'Foreign request read data');
 await reject(()=>reader({...request,examTerm:'first'}),/Class 6/);
 await reject(()=>reader({...request,mode:'attendance'}),/Attendance/);
 await reject(()=>reader({...request,columns:[...request.columns,request.columns[0]]}),/Duplicate/);
 await reject(()=>reader({...request,context:{...request.context,section:'B'}}),/No eligible/);
 activeRole='viewer';await reject(()=>reader(request),/access changed/);activeRole='school_admin';
 idle=false;await reject(()=>reader(request),/expired/);idle=true;
 foreign=true;await reject(()=>reader(request),/foreign/);foreign=false;
 marks[0].scores[0].obtained=101;await reject(()=>reader(request),/Invalid original/);marks[0].scores[0].obtained=0;
 marks[0].scores[0].fullMarks=50;await reject(()=>reader(request),/Mixed SMSS/);marks[0].scores[0].fullMarks=100;
 const missing=marks.pop();await reject(()=>reader(request),/Incomplete saved/);marks.push(missing);
 const duplicate={...marks[0],id:'duplicate'};marks.push(duplicate);await reject(()=>reader(request),/duplicated/);marks.pop();
 exams.push({...exams[0],id:'exam-other'});await reject(()=>reader(request),/duplicate/);exams.pop();
 // Optional II must not require marks for students who take another subject.
 subjects.push({...b,id:'computer',name:'Computer Science',active:true});
 students[0].optionalSubject2='Computer Science';students[1].optionalSubject2='Health';
 marks.push({...x,id:'b:computer',studentId:'b',subjectId:'computer',subject:'Computer Science',examId:'exam-2',isAbsent:false,section:'A',scores:[{name:'Second Term Examination',fullMarks:50,obtained:45}]});
 const optionalReq={...request,columns:[{subject:'Computer Science (3031)',label:'Second Term Examination(36)'}]};
 const optional=(await reader(optionalReq)).grid;
 eq(optional.rows.map(r=>[r[2],r[4]]),[['902',45],['901','N/A']],'Optional enrollment mapping');
 eq(T.maximum(optional.columns[0].label),50,'Original computer full marks');
 students[1].optionalSubject2='';await reject(()=>reader(optionalReq),/Optional subject assignment/);students[1].optionalSubject2='Health';
 marks.push({...marks.at(-1),id:'a:computer',studentId:'a'});await reject(()=>reader(optionalReq),/optional subject assignment mismatch/);marks.pop();
 flip=true;await reject(()=>reader(request),/Login/);
 return 'PASS V47 direct saved marks contract: source scales, zero, subject/ID order, duplicate and incomplete data, school/term/section, revoked role, idle and changed session';
}
console.log(await runRegression(globalThis.SmssIemisTransfer,createV47IemisReader));
