import assert from 'node:assert/strict';
import {loadSparkDraftReport} from './spark-draft-report.mjs';
const schoolId='12345678',uid='admin1',classNo='1',term='final',subjectId='math',id='1_math_final',base='schools/'+schoolId;
const actor={schoolId,uid,role:'school_admin',active:true};
const docs=new Map([
 [base,{id:schoolId,name:'Synthetic School',active:true}],
 [base+'/members/'+uid,actor],
 [base+'/students/s1',{schoolId,class:'1',name:'Test Student',active:true}],
 [base+'/subjects/math',{schoolId,class:'1',name:'Mathematics',active:true,creditHour:4,theoryFullMarks:0,practicalFullMarks:100}],
 [base+'/mark_settings/'+id,{id,schoolId,classId:classNo,subjectId,examId:term,active:true,components:[{key:'count',name:'Number of Learning Achievements',fullMarks:25},{key:'obtained',name:'Obtained Marks',fullMarks:100}]}],
 [base+'/class_mark_drafts/'+id,{format:'smss-v47-complete-class-draft-v1',state:'draft',schoolId,classId:classNo,subjectId,examId:term,settingsId:id,rosterCount:1,revision:1,updatedBy:uid,updatedAt:'test',entries:[{studentId:'s1',isAbsent:false,values:{count:25,obtained:80},totalObtained:105}]}]
]);
const snap=p=>({id:p.split('/').at(-1),ref:{path:p},exists:()=>docs.has(p),data:()=>structuredClone(docs.get(p))});
const api={doc:(_db,...p)=>p.join('/'),collection:(_db,...p)=>p.join('/'),where:(...p)=>p,orderBy:(...p)=>p,limit:n=>n,startAfter:v=>v,query:(path,...conditions)=>({path,conditions}),
 getDocFromServer:async p=>snap(p),getDocsFromServer:async({path})=>({docs:[...docs.keys()].filter(p=>p.startsWith(path+'/')&&!p.slice(path.length+1).includes('/')).map(snap)}),
 runTransaction:async(_db,fn)=>fn({get:async p=>snap(p),set:()=>{throw Error('No writes')}})};
const args={db:{},api,auth:{currentUser:{uid}},actor,schoolId,classNo,term,assertCurrent:()=>{}};
await assert.rejects(loadSparkDraftReport({...args,actor:{...actor,role:'viewer'}}),/School Admin/);
const original=docs.get(base+'/class_mark_drafts/'+id);docs.delete(base+'/class_mark_drafts/'+id);
await assert.rejects(loadSparkDraftReport(args),/Missing settings or saved Draft/);
docs.set(base+'/class_mark_drafts/'+id,{...original,rosterCount:2});
await assert.rejects(loadSparkDraftReport(args),/full class roster/);
docs.set(base+'/class_mark_drafts/'+id,original);
await assert.rejects(loadSparkDraftReport({...args,assertCurrent:()=>{throw Error('session changed')}}),/session changed/);
console.log('PASS Spark private Draft report denies Viewer, missing/incomplete Draft and stale session');
