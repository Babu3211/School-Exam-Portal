import assert from 'node:assert/strict';
import {prepareTeacherClassDraft,TEACHER_DRAFT_FORMAT,verifyStoredTeacherClassDraft,sameTeacherDraftEntries} from './teacher-class-draft.mjs';
import {saveVerifiedTeacherClassDraft} from './save-verified-teacher-class-draft.mjs';

const schoolId='12345678',classId='9',subjectId='computer',examId='final',uid='teacherA';
const actor={uid,active:true,role:'teacher',schoolId},ids=['s1','s2','s3'];
const settings={id:'9_computer_final',schoolId,classId,subjectId,examId,active:true,
 components:[{key:'participation',name:'Participation',fullMarks:7},
 {key:'practical',name:'Practical',fullMarks:63},{key:'term',name:'Term',fullMarks:30}]};
const marks=studentId=>({studentId,values:{participation:7,practical:62,term:29}});
const drafts=ids.map(marks);
const teacherPath='schools/'+schoolId+'/teacher_mark_drafts/'+uid+'/class_drafts/9_computer_final';
const assignPath='schools/'+schoolId+'/teacher_assignments/'+schoolId+':'+uid+':9:computer';
const source={db:{},auth:{currentUser:{uid}},actor,schoolId,classId,subjectId,examId,drafts};
function fixture({beforeTransaction,existing}={}){
 const data=new Map([
  ['schools/'+schoolId,{id:schoolId,active:true}],
  ['schools/'+schoolId+'/members/'+uid,{uid,role:'teacher',schoolId,active:true}],
  [assignPath,{schoolId,uid,classId,subjectId,active:true}],
  ['schools/'+schoolId+'/subjects/'+subjectId,{name:'Computer',schoolId,class:classId,active:true}],
  ['schools/'+schoolId+'/mark_settings/9_computer_final',settings],
  ...ids.map(id=>['schools/'+schoolId+'/students/'+id,{schoolId,class:classId,active:true,name:id}])
 ]);
 if(existing)data.set(teacherPath,existing);
 const writes=[];
 const snap=ref=>({exists:()=>data.has(ref),data:()=>structuredClone(data.get(ref))});
 const api={
  doc:(_db,...segments)=>segments.join('/'),getDoc:async ref=>snap(ref),
  collection:(_db,...segments)=>segments.join('/'),
  where:(field,op,value)=>({where:[field,op,value]}),
  orderBy:x=>({orderBy:x}),limit:n=>({limit:n}),
  startAfter:ref=>({after:ref}),query:(...args)=>args,
  getDocs:async query=>{
   const cursor=query.find(x=>x?.after)?.after?.id;
   const rows=[...data.entries()].filter(([key,row])=>key.startsWith('schools/'+schoolId+'/students/')&&row.class===classId)
     .map(([key,row])=>({id:key.split('/').at(-1),data:()=>row}));
   rows.sort((a,b)=>a.id.localeCompare(b.id));
   const start=cursor?rows.findIndex(row=>row.id===cursor)+1:0;
   return {docs:rows.slice(start,start+100)};
  },
  serverTimestamp:()=>({now:true}),
  runTransaction:async(_db,fn)=>{
   const updates=[];
   const tx={get:async ref=>snap(ref),set:(ref,value)=>updates.push([ref,value])};
   if(beforeTransaction)beforeTransaction(data);
   const result=await fn(tx);
   for(const [ref,value] of updates){data.set(ref,structuredClone(value));writes.push([ref,value])}
   return result;
  }
 };
 return {api,data,writes};
}
const prepared=prepareTeacherClassDraft({...source,settings:{...settings,settingsId:'9_computer_final'},expectedStudentIds:ids});
assert.equal(prepared.data.format,TEACHER_DRAFT_FORMAT);
assert.equal(prepared.data.rosterCount,3);
assert.equal(prepared.publicationAllowed,false);
assert.equal(prepared.data.entries[0].totalObtained,98);
const sortedStored={...prepared.data,updatedAt:{seconds:1},
 entries:prepared.data.entries.map(row=>({
  values:row.isAbsent?null:Object.fromEntries(Object.entries(row.values).reverse()),
  totalObtained:row.totalObtained,studentId:row.studentId,isAbsent:row.isAbsent
 }))};
const restored=verifyStoredTeacherClassDraft({...source,settings:{...settings,settingsId:'9_computer_final'},
 expectedStudentIds:ids,stored:sortedStored});
assert.equal(restored.revision,1);
assert.ok(sameTeacherDraftEntries(prepared.data.entries,sortedStored.entries));
assert.equal(sameTeacherDraftEntries(prepared.data.entries,
 sortedStored.entries.map((v,i)=>i?{...v,totalObtained:v.totalObtained+1}:v)),false);
assert.throws(()=>verifyStoredTeacherClassDraft({...source,settings:{...settings,settingsId:'9_computer_final'},
 expectedStudentIds:ids,stored:{...sortedStored,entries:sortedStored.entries.map((v,i)=>i?{...v,totalObtained:v.totalObtained+1}:v)}}),/altered/);
assert.throws(()=>prepareTeacherClassDraft({...source,actor:{...actor,role:'viewer'},settings:{...settings,settingsId:'9_computer_final'},expectedStudentIds:ids}),/Teacher/);
assert.throws(()=>prepareTeacherClassDraft({...source,settings:{...settings,settingsId:'9_computer_final'},expectedStudentIds:ids,drafts:drafts.slice(1)}),/Complete/);
{
 const f=fixture();
 const saved=await saveVerifiedTeacherClassDraft({...source,api:f.api});
 assert.equal(saved.savedDraft,true);
 assert.equal(saved.rosterReverified,true);
 assert.equal(saved.revision,1);
 assert.equal(saved.publicationAllowed,false);
 assert.equal(saved.officialMarksWritten,false);
 assert.deepEqual(f.writes.map(([path])=>path),[teacherPath]);
 assert.equal(f.data.get(teacherPath).updatedBy,uid);
 assert(![...f.data.keys()].some(k=>k.includes('/marks/')||k.includes('/component_marks/')));
 // Compare-and-swap revision update, never lose a teacher's draft to a stale tab.
 const updated=await saveVerifiedTeacherClassDraft({...source,api:f.api,expectedRevision:1});
 assert.equal(updated.revision,2);
 await assert.rejects(saveVerifiedTeacherClassDraft({...source,api:f.api,expectedRevision:1}),/revision changed/);
 assert.equal(f.writes.length,2);
}
for(const change of [
 {actor:{...actor,role:'viewer'}},
 {actor:{...actor,schoolId:'87654321'}},
 {actor:{...actor,active:false}},
 {schoolId:'87654321'},
 {drafts:drafts.slice(1)},
 {drafts:[...drafts,marks('s2')]},
 {drafts:drafts.map((x,i)=>i?x:{studentId:'s1',values:{participation:80,practical:62,term:29}})}
]){
 const f=fixture();
 await assert.rejects(saveVerifiedTeacherClassDraft({...source,api:f.api,...change}));
 assert.equal(f.writes.length,0);
}
for(const kind of ['revoked assignment','viewer membership','inactive school','changed settings','wrong subject']){
 const f=fixture({beforeTransaction:data=>{
  const member='schools/'+schoolId+'/members/'+uid;
  const subject='schools/'+schoolId+'/subjects/'+subjectId;
  const config='schools/'+schoolId+'/mark_settings/9_computer_final';
  if(kind==='revoked assignment')data.get(assignPath).active=false;
  if(kind==='viewer membership')data.get(member).role='viewer';
  if(kind==='inactive school')data.get('schools/'+schoolId).active=false;
  if(kind==='changed settings')data.get(config).components[0].fullMarks=100;
  if(kind==='wrong subject')data.get(subject).class='8';
 }});
 await assert.rejects(saveVerifiedTeacherClassDraft({...source,api:f.api}));
 assert.equal(f.writes.length,0,'No teacher Draft after '+kind);
}
for(const issue of ['network','post-enrollment','post-login']){
 const f=fixture(),auth={currentUser:{uid}};
 const tx=f.api.runTransaction;
 let committed=false;
 f.api.runTransaction=async(...args)=>{
  const res=await tx(...args);committed=true;
  if(issue==='post-enrollment')f.data.set('schools/'+schoolId+'/students/s4',{schoolId,class:classId,active:true,name:'new'});
  if(issue==='post-login')auth.currentUser={uid:'intruder'};
  return res;
 };
 const getDoc=f.api.getDoc;
 f.api.getDoc=async ref=>{if(committed&&issue==='network'&&ref===teacherPath)throw Error('network after commit');return getDoc(ref)};
 await assert.rejects(saveVerifiedTeacherClassDraft({...source,auth,api:f.api}),err=>{
  assert.equal(err.name,'TeacherDraftPostSaveReviewError');
  assert.equal(err.committed,true);
  assert.equal(err.reviewRequired,true);
  assert.equal(err.revision,1);
  return true;
 });
 assert.equal(f.writes.length,1,'Acknowledged write must never be reported as rollback');
}
console.log('PASS teacher mark Draft: complete configured class, assigned duty, isolated CAS, post-commit review; official marks disabled');
