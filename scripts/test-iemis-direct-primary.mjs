import '../iemis-importer/transfer.js';
import {createV46DirectReader} from '../iemis-direct-saved-marks.js';
async function runPrimaryRegression(T,reader,version){
 const sid="999990001",uid="synthetic",user={uid},auth={currentUser:user},role={active:true},actor={uid,schoolId:sid,role:"school_admin",active:true},v47=version==="v47";
 const expectReject=async(fn,re)=>{let e;try{await fn()}catch(x){e=x}if(!e||!re.test(e.message))throw Error("Expected "+re+" got "+e?.message)};
 for(let grade=1;grade<=5;grade++){
  const klass=String(grade),base=v47?{schoolId:sid,class:klass}:{className:klass};
  const students=[{id:"a",class:klass,...(v47?{schoolId:sid}:{}),studentIemisId:"123",name:"Synthetic Student"}];
  const exam={...base,id:"e",academicYear:"2083",termKey:"first",...(v47?{term:"1st"}:{})};
  const subject={...base,id:"english",subject:"English",name:"English",active:true};
  const record={...base,id:"m",studentId:"a",subject:"English",subjectId:"english",examId:"e",academicYear:"2083",termKey:"first",term:"1st",isAbsent:false,scores:[{name:"No. of Learning Achievement",fullMarks:25,obtained:25},{name:"Full Marks",fullMarks:100,obtained:null},{name:"Obtained Learning Achievement",fullMarks:100,obtained:0}]};
  const tables={students,exams:[exam],classes:[subject],subjects:[subject],marks:[record]};
  const doc=(d,p)=>({id:d.id,ref:{path:p},exists:()=>true,data:()=>d});
  const api={doc:(_, ...p)=>p.join("/"),collection:(_, ...p)=>p.join("/"),query:(path,...filters)=>({path,filters}),where:(k,op,v)=>[k,v],limit:n=>n,getDocFromServer:async p=>doc(v47?{id:sid,active:true}:{iemisCode:sid,academicYear:"2083"},p),getDocsFromServer:async({path,filters})=>({docs:tables[path.split("/").at(-1)].filter(d=>filters.filter(Array.isArray).every(([k,v])=>d[k]===v)).map(d=>doc(d,path+"/"+d.id))})};
  const w={auth,role,actor,db:{},api,schoolId:sid,sessionSeq:1,authSdk:{},isAdmin:()=>true};
  const read=reader({getWorkspace:()=>w,T,examTermKey:e=>e.termKey,subjectLabel:s=>s,optionalSlot:()=>'',studentOptional:()=>'',verifySchoolSession:async()=>({schoolId:sid,uid,role:"school_admin"}),enforceSchoolIdle:async()=>true});
  const q={mode:"marks",examTerm:"first",context:{schoolCode:sid,year:"2083",className:klass,term:"First Term",section:"All"},columns:["IsAbsent","No. Of Learning Achievement","Full Marks","Obtained Learning Achievement"].map(label=>({subject:"English",label}))};
  const g=(await read(q)).grid;if(JSON.stringify(g.rows[0].slice(4))!==JSON.stringify(["FALSE",25,100,0]))throw Error("Primary data mismatch");
  record.scores[1].fullMarks=99;await expectReject(()=>read(q),/learning achievement/);record.scores[1].fullMarks=100;
  await expectReject(()=>read({...q,columns:q.columns.filter(c=>!/^No\./.test(c.label))}),/count column/);
  record.isAbsent=true;record.scores[0].obtained=null;record.scores[2].obtained=null;
  const absent=(await read(q)).grid.rows[0].slice(4);
  if(JSON.stringify(absent)!==JSON.stringify(["TRUE",25,100,""]))throw Error("Primary absence mismatch");
  await expectReject(()=>read({...q,columns:q.columns.slice(1)}),/absence column/);
  if(grade===5){
   exam.termKey='annual';if(v47)exam.term='final';record.termKey='annual';record.term='final';
   record.isAbsent=false;record.scores[0].obtained=25;record.scores[2].obtained=73;
   const finalReq={...q,mode:'class5',examTerm:'final',context:{...q.context,term:'Class 5 Final / Final Term'}};
   const finalResult=await read(finalReq);
   if(finalResult.mode!=='class5'||finalResult.examTerm!=='final'||finalResult.grid.context.term!==finalReq.context.term||JSON.stringify(finalResult.grid.rows[0].slice(4))!==JSON.stringify(['FALSE',25,100,73]))throw Error('Class 5 Final exact transfer mismatch');
   await expectReject(()=>read({...finalReq,examTerm:'first'}),/Term/);
   await expectReject(()=>read({...finalReq,context:{...finalReq.context,className:'4'}}),/Term/);
   await expectReject(()=>read({...finalReq,columns:[{subject:'English',label:'Marks'}]}),/Unsupported component/);
  }
 }
 return "PASS "+version+" grades 1–5 exact saved achievement count, ×4 maximum, zero and absence, wrong full and incomplete columns rejected";
}
console.log(await runPrimaryRegression(globalThis.SmssIemisTransfer,createV46DirectReader,'v46'));
