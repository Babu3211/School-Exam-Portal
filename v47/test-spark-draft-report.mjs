import assert from 'node:assert/strict';
import {loadSparkDraftReport} from './spark-draft-report.mjs';
const schoolId='12345678',uid='admin1',classNo='1',term='final',subjectId='math',id='1_math_final',base='schools/'+schoolId;
const actor={schoolId,uid,role:'school_admin',active:true};
const docs=new Map([
 [base,{id:schoolId,name:'Synthetic School',active:true}],
 [base+'/members/'+uid,actor],
 [base+'/students/s1',{schoolId,class:'1',name:'Test Student',active:true}],
 [base+'/subjects/math',{schoolId,class:'1',name:'Mathematics',active:true,creditHour:4,theoryFullMarks:0,practicalFullMarks:100}],
 [base+'/mark_settings/'+id,{id,schoolId,classId:classNo,subjectId,examId:term,active:true,components:[{key:'count',name:'No. of Learning Achievement',fullMarks:25},{key:'obtained',name:'Obtained Learning Achievement',fullMarks:100}]}],
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

// Positive fixture and all grade groups / terms using actual V46 schema.
import {iemisEntrySchema} from './iemis-entry.js';
import {legacyGradePreviewExcel} from './legacy-grade-report-preview.mjs';
const first=await loadSparkDraftReport(args);
assert.equal(first.draftPreview,true);assert.equal(first.summary.rows[0].gpa,3.6);
assert.equal(first.summary.rows[0].subjects[0].summary.obtained,80);
assert.equal(first.publicationAllowed,false);
for(const klass of ['1','2','3','4','5','6','7','8','9','10'])for(const exam of ['1st','2nd','final']){
 for(const k of [...docs.keys()])if(/\/(students|subjects|mark_settings|class_mark_drafts)\//.test(k))docs.delete(k);
 for(const st of ['s1','s2'])docs.set(base+'/students/'+st,{schoolId,class:klass,name:'Student '+st,active:true});
 const subjects=Number(klass)<=5?[['math','Mathematics'],['english','English']]:[['math','Mathematics'],['computer','Computer Science']];
 for(const [sid,name] of subjects){
  docs.set(base+'/subjects/'+sid,{schoolId,class:klass,name,active:true,creditHour:4});
  const key=klass+'_'+sid+'_'+exam;
  const components=Number(klass)<=5?[{key:'count',name:'No. of Learning Achievement',fullMarks:10},{key:'got',name:'Obtained Learning Achievement',fullMarks:40}]:
   iemisEntrySchema(klass,exam==='final'?'annual':exam==='1st'?'first':'second',name).filter(c=>!c.readonly).map((c,i)=>({key:'f'+i,name:c.name,fullMarks:c.max}));
  docs.set(base+'/mark_settings/'+key,{id:key,schoolId,classId:klass,subjectId:sid,examId:exam,active:true,components});
  const values=Object.fromEntries(components.map(c=>[c.key,c.fullMarks]));
  docs.set(base+'/class_mark_drafts/'+key,{format:'smss-v47-complete-class-draft-v1',state:'draft',schoolId,classId:klass,subjectId:sid,examId:exam,settingsId:key,rosterCount:2,revision:1,updatedBy:uid,updatedAt:'test',
   entries:['s1','s2'].map(studentId=>({studentId,isAbsent:false,values,totalObtained:Object.values(values).reduce((a,b)=>a+b,0)}))});
 }
 const result=await loadSparkDraftReport({...args,classNo:klass,term:exam});
 assert.equal(result.rosterCount,2);assert.equal(result.subjectCount,2);assert.equal(result.summary.complete,true);
 assert.equal(result.summary.rows[0].gpa,4);assert.match(result.ledger.body,/<td>4\.00<\/td><\/tr>/);
 assert.equal(result.previewOnly,true);assert.equal(result.publicationAllowed,false);
 for(const mode of ['grade','number','entry']){
  assert.match(result.ledgers[mode].body,/Student s1/);
  const bytes=new Uint8Array(await legacyGradePreviewExcel(result,mode).arrayBuffer());
  assert.deepEqual([...bytes.slice(0,2)],[80,75]);assert.match(new TextDecoder().decode(bytes),/NOT FOR OFFICIAL USE/);
 }
 const sheet=result.printFor('s1');if(Number(klass)<=5||exam==='final'){assert.equal(sheet.ready,true);assert.match(sheet.html,/NOT VALID FOR OFFICIAL USE/)}else assert.equal(sheet.ready,false);
}
console.log('PASS Spark Draft reports: 30 class/term combinations, two subjects, all ledgers and preview XLSX, GPA and watermark');

// A verified secondary Draft has an explicit absence row, unlike a missing row.
// The original V46 renderer must show Abs without awarding GPA to that student.
{
 const klass='9',exam='final',sid='computer',name='Computer Science',key=klass+'_'+sid+'_'+exam;
 for(const k of [...docs.keys()])if(/\/(students|subjects|mark_settings|class_mark_drafts)\//.test(k))docs.delete(k);
 for(const st of ['s1','s2'])docs.set(base+'/students/'+st,{schoolId,class:klass,name:'Student '+st,active:true});
 docs.set(base+'/subjects/'+sid,{schoolId,class:klass,name,active:true,creditHour:4});
 const components=iemisEntrySchema(klass,'annual',name).filter(c=>!c.readonly).map((c,i)=>({key:'f'+i,name:c.name,fullMarks:c.max}));
 const values=Object.fromEntries(components.map(c=>[c.key,c.fullMarks]));
 docs.set(base+'/mark_settings/'+key,{id:key,schoolId,classId:klass,subjectId:sid,examId:exam,active:true,components});
 const original={format:'smss-v47-complete-class-draft-v1',state:'draft',schoolId,classId:klass,subjectId:sid,examId:exam,settingsId:key,rosterCount:2,revision:1,updatedBy:uid,updatedAt:'test',entries:[{studentId:'s1',isAbsent:true,values:null,totalObtained:0},{studentId:'s2',isAbsent:false,values,totalObtained:Object.values(values).reduce((a,b)=>a+b,0)}]};
 const path=base+'/class_mark_drafts/'+key;docs.set(path,original);
 const r=await loadSparkDraftReport({...args,classNo:klass,term:exam});
 assert.equal(r.summary.rows[0].gpa,null);assert.equal(r.summary.rows[1].gpa,4);assert.match(r.ledger.body,/>Abs<\/td>/);
 assert.equal(r.printFor('s1').ready,false);assert.equal(r.printFor('s2').ready,true);
 const invalid=structuredClone(original);invalid.entries[0].values={f0:0};docs.set(path,invalid);
 await assert.rejects(loadSparkDraftReport({...args,classNo:klass,term:exam}));
}
console.log('PASS saved secondary Draft absence through school-scoped read-only report loader');
