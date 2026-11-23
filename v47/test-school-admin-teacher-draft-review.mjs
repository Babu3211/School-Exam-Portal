import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareTeacherClassDraft} from './teacher-class-draft.mjs';
import {loadSchoolAdminTeacherDraftReview} from './school-admin-teacher-draft-review.mjs';

const schoolId='12345678',teacherUid='teacherA',adminUid='adminA',classId='9',subjectId='computer',examId='final';
const draftId='9_computer_final',actor={uid:adminUid,role:'school_admin',active:true,schoolId};
const settings={id:draftId,schoolId,classId,subjectId,examId,active:true,
 components:[{key:'project',name:'Project',fullMarks:17},{key:'exam',name:'Examination',fullMarks:83}]};
const teacher={uid:teacherUid,role:'teacher',active:true,schoolId};
const studentIds=['s1','s2','s3'];
const marks=studentIds.map(studentId=>({studentId,values:{project:15,exam:80}}));
const planned=prepareTeacherClassDraft({
 actor:teacher,schoolId,classId,subjectId,examId,settings:{...settings,settingsId:draftId},
 expectedStudentIds:studentIds,drafts:marks
});
const draftPath='schools/'+schoolId+'/teacher_mark_drafts/'+teacherUid+'/class_drafts/'+draftId;
const assignmentPath='schools/'+schoolId+'/teacher_assignments/'+schoolId+':'+teacherUid+':'+classId+':'+subjectId;
function fixture({noDraft=false,afterRead}={}){
 const data=new Map([
  ['schools/'+schoolId,{id:schoolId,active:true}],
  ['schools/'+schoolId+'/members/'+adminUid,{uid:adminUid,schoolId,role:'school_admin',active:true}],
  ['schools/'+schoolId+'/members/'+teacherUid,{uid:teacherUid,schoolId,role:'teacher',active:true}],
  [assignmentPath,{uid:teacherUid,schoolId,classId,subjectId,active:true}],
  ['schools/'+schoolId+'/subjects/'+subjectId,{schoolId,class:classId,active:true,name:'Computer'}],
  ['schools/'+schoolId+'/mark_settings/'+draftId,structuredClone(settings)],
  ...studentIds.map(id=>['schools/'+schoolId+'/students/'+id,{schoolId,class:classId,name:id,active:true}])
 ]);
 if(!noDraft)data.set(draftPath,{...structuredClone(planned.data),updatedAt:{seconds:1}});
 let reads=0;
 const snap=ref=>({exists:()=>data.has(ref),data:()=>structuredClone(data.get(ref))});
 const api={
  doc:(_db,...parts)=>parts.join('/'),
  getDoc:async ref=>{reads++;if(afterRead)afterRead({ref,reads,data});return snap(ref)},
  collection:(_db,...parts)=>parts.join('/'),
  where:(key,op,val)=>({type:'where',key,op,val}),
  orderBy:key=>({type:'order',key}),
  limit:n=>({type:'limit',n}),
  startAfter:id=>({type:'after',id}),
  query:(...parts)=>parts,
  getDocs:async query=>{
   const cursor=query.find(x=>x?.type==='after')?.id;
   const limit=query.find(x=>x?.type==='limit')?.n??101;
   const docs=[...data].filter(([path,row])=>path.startsWith('schools/'+schoolId+'/students/')&&row.class===classId)
    .map(([path,row])=>({id:path.split('/').at(-1),data:()=>structuredClone(row)}))
    .sort((a,b)=>a.id.localeCompare(b.id));
   const start=cursor?docs.findIndex(doc=>doc.id===cursor)+1:0;
   return {docs:docs.slice(start,start+limit)};
  }
 };
 const auth={currentUser:{uid:adminUid}};
 const args={db:{},api,auth,actor,schoolId,teacherUid,classId,subjectId,examId};
 return {data,args,auth,get reads(){return reads}};
}
{
 const f=fixture(),result=await loadSchoolAdminTeacherDraftReview(f.args);
 assert.equal(result.found,true);
 assert.equal(result.rosterCount,3);
 assert.equal(result.entries.length,3);
 assert.equal(result.entries[0].totalObtained,95);
 assert.equal(result.revision,1);
 assert.deepEqual(result.components.map(c=>c.fullMarks),[17,83]);
 assert.equal(result.reviewOnly,true);
 assert.equal(result.publicationAllowed,false);
 assert.equal(result.officialMarksWritten,false);
 assert.equal(typeof f.args.api.setDoc,'undefined','Read-only dependency must expose no writes');
}
{
 const f=fixture({noDraft:true}),result=await loadSchoolAdminTeacherDraftReview(f.args);
 assert.equal(result.found,false);
 assert.equal(result.publicationAllowed,false);
}
{
 // A Draft appearing after the first missing read must not be reported absent.
 let reads=0;
 const f=fixture({noDraft:true,afterRead:({ref,data})=>{
  if(ref===draftPath&&++reads===2)
   data.set(draftPath,{...structuredClone(planned.data),updatedAt:{seconds:1}});
 }});
 await assert.rejects(loadSchoolAdminTeacherDraftReview(f.args),/Draft or enrollment changed/);
}
{
 // An enrollment change during a missing-Draft lookup must also fail closed.
 const f=fixture({noDraft:true});
 let pages=0;
 const original=f.args.api.getDocs;
 f.args.api.getDocs=async query=>{
  const page=await original(query);
  if(++pages===2)f.data.get('schools/'+schoolId+'/students/s1').name='changed';
  return page;
 };
 await assert.rejects(loadSchoolAdminTeacherDraftReview(f.args),/Draft or enrollment changed/);
}
{
 // Missing-Draft response must not be trusted if Examination Settings change.
 let settingsReads=0;
 const f=fixture({noDraft:true,afterRead:({ref,data})=>{
  if(ref==='schools/'+schoolId+'/mark_settings/'+draftId&&++settingsReads===2)
   data.get(ref).components[0].fullMarks=18;
 }});
 await assert.rejects(loadSchoolAdminTeacherDraftReview(f.args),/Examination Settings changed/);
}
{
 // A teacher's revoked assignment must not produce an apparently verified
 // missing-Draft response.
 let draftReads=0;
 const f=fixture({noDraft:true,afterRead:({ref,data})=>{
  if(ref===draftPath&&++draftReads===2)
   data.get(assignmentPath).active=false;
 }});
 await assert.rejects(loadSchoolAdminTeacherDraftReview(f.args),
  /assignment|Teacher|inactive|revoked/i);
}
for(const mutation of [
 f=>{f.auth.currentUser={uid:'intruder'}},
 f=>{f.data.get('schools/'+schoolId+'/members/'+adminUid).role='viewer'},
 f=>{f.data.get('schools/'+schoolId+'/members/'+teacherUid).active=false},
 f=>{f.data.get(assignmentPath).active=false},
 f=>{f.data.get('schools/'+schoolId+'/mark_settings/'+draftId).components[0].fullMarks=10},
 f=>{f.data.get(draftPath).entries[0].totalObtained=101},
 f=>{f.data.set('schools/'+schoolId+'/students/s4',{schoolId,class:classId,name:'new',active:true})},
 f=>{f.data.get('schools/'+schoolId).active=false}
]){
 const f=fixture();mutation(f);
 await assert.rejects(loadSchoolAdminTeacherDraftReview(f.args));
}
{
 const f=fixture();
 await assert.rejects(loadSchoolAdminTeacherDraftReview({...f.args,schoolId:'99999999'}));
 await assert.rejects(loadSchoolAdminTeacherDraftReview({...f.args,actor:{...actor,role:'viewer'}}));
 await assert.rejects(loadSchoolAdminTeacherDraftReview({...f.args,teacherUid:'../teacherA'}));
 await assert.rejects(loadSchoolAdminTeacherDraftReview({...f.args,examId:'malicious'}));
 await assert.rejects(loadSchoolAdminTeacherDraftReview({...f.args,assertSession:()=>{throw Error('Changed tab')}}));
}
{
 let draftReads=0;
 const f=fixture({afterRead:({ref,data})=>{
  if(ref===draftPath&&++draftReads===2)
   data.get(draftPath).revision=2;
 }});
 // Never claim a successful review when its revision changes during verification.
 await assert.rejects(loadSchoolAdminTeacherDraftReview(f.args));
}
{
 let seenDraft=false;
 const f=fixture({afterRead:({ref,data})=>{
  if(ref===draftPath&&!seenDraft){
   seenDraft=true;data.get(assignmentPath).active=false;
  }
 }});
 await assert.rejects(loadSchoolAdminTeacherDraftReview(f.args),
  /assignment|Teacher|inactive|revoked/i);
}
{
 // The roster IDs alone are insufficient: enrollment/name/status changes
 // between the two paginated reads must invalidate a review.
 let rosterReads=0;
 const f=fixture();
 const original=f.args.api.getDocs;
 f.args.api.getDocs=async query=>{
  const result=await original(query);
  if(++rosterReads===2)
   f.data.get('schools/'+schoolId+'/students/s2').name='Changed during review';
  return result;
 };
 await assert.rejects(loadSchoolAdminTeacherDraftReview(f.args),/Enrollment changed/);
}
{
 let rosterReads=0;
 const f=fixture();
 const original=f.args.api.getDocs;
 f.args.api.getDocs=async query=>{
  const result=await original(query);
  if(++rosterReads===2)
   f.data.get('schools/'+schoolId+'/students/s2').active=false;
  return result;
 };
 await assert.rejects(loadSchoolAdminTeacherDraftReview(f.args),/Enrollment changed|inactive/);
}

{
 const f=fixture();
 const result=await loadSchoolAdminTeacherDraftReview(f.args);
 const {teacherDraftReviewExcel}=await import('./teacher-draft-review-excel.mjs');
 const file=teacherDraftReviewExcel(result);
 assert.equal(file.count,3);
 assert.equal(file.official,false);
 assert.match(file.filename,/\.xlsx$/);
 const bytes=new Uint8Array(await file.blob.arrayBuffer());
 assert.equal(String.fromCharCode(...bytes.slice(0,2)),'PK');
 const raw=new TextDecoder().decode(bytes);
 assert.match(raw,/DRAFT ONLY/);
 assert.match(raw,/Student Name/);
 assert.match(raw,/Project \/ 17/);
 assert.match(raw,/Examination \/ 83/);
 assert.match(raw,/NOT OFFICIAL/);
 await assert.rejects(async()=>teacherDraftReviewExcel({...result,publicationAllowed:true}));
 await assert.rejects(async()=>teacherDraftReviewExcel({...result,entries:[result.entries[0],result.entries[0],result.entries[2]]}));
 await assert.rejects(async()=>teacherDraftReviewExcel({...result,entries:result.entries.slice(0,2)}));
 await assert.rejects(async()=>teacherDraftReviewExcel({...result,components:[
  result.components[0],result.components[0]
 ]}));
 await assert.rejects(async()=>teacherDraftReviewExcel({...result,entries:[
  {...result.entries[0],values:{...result.entries[0].values,extra:1}},
  ...result.entries.slice(1)
 ]}));
 await assert.rejects(async()=>teacherDraftReviewExcel({...result,entries:[
  {...result.entries[0],isAbsent:true,totalObtained:0},
  ...result.entries.slice(1)
 ]}));
 const absent={...result,entries:[
  {...result.entries[0],isAbsent:true,values:null,totalObtained:0},
  ...result.entries.slice(1)
 ]};
 const absentExcel=teacherDraftReviewExcel(absent);
 assert.equal(absentExcel.count,3);
 assert.match(new TextDecoder().decode(await absentExcel.blob.arrayBuffer()),/Yes/);
 await assert.rejects(async()=>teacherDraftReviewExcel({...result,entries:[
  {...result.entries[0],totalObtained:999},...result.entries.slice(1)
 ]}));
}
const html=readFileSync(new URL('./teacher-draft-review.html',import.meta.url),'utf8');
const ui=readFileSync(new URL('./teacher-draft-review-console.mjs',import.meta.url),'utf8');
const schoolAdminHtml=readFileSync(new URL('./school-admin.html',import.meta.url),'utf8');
const index=readFileSync(new URL('./index.html',import.meta.url),'utf8');
assert.match(html,/read-only/);
assert.match(html,/id="reviewRows"/);
assert.match(ui,/loadSchoolAdminTeacherDraftReview/);
assert.match(ui,/enforceSchoolIdle/);
assert.match(html,/id="exportDraft"/);
assert.match(ui,/teacherDraftReviewExcel/);
assert.match(ui,/fresh.revision!==revision/);
assert.match(ui,/await loadSchoolAdminTeacherDraftReview/);
assert.match(ui,/\$\('schoolId'\)\.disabled=true/);
assert.match(ui,/\$\('schoolId'\)\.value\.trim\(\)!==id/);
assert.doesNotMatch(ui,/\.(?:setDoc|updateDoc|addDoc|deleteDoc|runTransaction)\s*\(/);
assert.match(schoolAdminHtml,/teacher-draft-review\.html/);
assert.match(index,/data-required-role="school_admin"[^>]*href="\.\/teacher-draft-review\.html"/);
console.log('PASS School Admin read-only Teacher Draft review: two-role scope, class roster, active assignment, settings and revision recheck');
