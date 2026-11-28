import assert from 'node:assert/strict';
import {loadAssignedLegacyMarks,loadAdminLegacyMarks} from './assigned-legacy-marks.mjs';
const schoolId='300160003',uid='teacher1',classId='9',subjectId='math',term='1st',root='schools/'+schoolId,actor={schoolId,uid,role:'teacher',active:true};
const mark={schoolId,class:'9',term,termKey:'first',academicYear:'2083',subjectId,subject:'Mathematics',examId:'exam1',studentId:'s1',isAbsent:false,scores:[{name:'Participation',fullMarks:3,obtained:0},{name:'Practical/Project',fullMarks:16,obtained:15}],totalObtained:15,totalFullMarks:19};
let active=true,role='teacher',rows=[mark],stale=false;
const doc=(id,d)=>({id,exists:()=>true,data:()=>d});
const api={doc:(_,...p)=>p.join('/'),collection:(_,...p)=>p.join('/'),query:(path,...filters)=>({path,filters}),where:(...p)=>p,limit:n=>n,
 getDocFromServer:async p=>{
  if(p===root)return doc(schoolId,{id:schoolId,active:true});
  if(p===root+'/members/'+uid)return doc(uid,{schoolId,uid,role,active:true});
  if(p===root+'/teacher_assignments/'+schoolId+':'+uid+':9:math')return doc('a',{schoolId,uid,classId,subjectId,active});
  if(p===root+'/subjects/math')return doc('math',{schoolId,class:classId,name:'Mathematics',active:true});
  if(p===root+'/exams/exam1')return doc('exam1',{schoolId,class:classId,term,termKey:'first',academicYear:'2083'});
  if(p===root+'/students/s1')return doc('s1',{schoolId,name:'Synthetic Student'});
  throw Error('Unexpected read');
 },
 getDocsFromServer:async q=>{assert.equal(q.path,root+'/marks');assert.deepEqual(q.filters,[['class','==',classId],['term','==',term],['subjectId','==',subjectId],3001]);return {docs:rows.map((r,i)=>doc('m'+i,r))}}};
const args={db:{},api,actor,schoolId,classId,subjectId,term,assertCurrent:()=>{if(stale)throw Error('Stale')}};
const a=await loadAssignedLegacyMarks(args);assert.equal(a.rows.length,1);assert.equal(a.rows[0].scores[0].obtained,0);assert.equal(a.rows[0].totalObtained,15);assert.equal(a.publicationAllowed,false);
active=false;await assert.rejects(loadAssignedLegacyMarks(args),/inactive/);active=true;
rows=[{...mark,schoolId:'99999'}];await assert.rejects(loadAssignedLegacyMarks(args),/Foreign/);
rows=[mark,mark];await assert.rejects(loadAssignedLegacyMarks(args),/Duplicate original student/);rows=[mark];
role='viewer';await assert.rejects(loadAssignedLegacyMarks(args),/role changed/);role='teacher';
stale=true;await assert.rejects(loadAssignedLegacyMarks(args),/Stale/);
console.log('PASS assigned migrated marks: exact original scores, zero preserved, exam identity, tenant and assignment guards');

stale=false;role='school_admin';const adminArgs={...args,actor:{...actor,role:'school_admin'}};
active=false; // An Admin needs no teacher assignment; the subject still must be active.
assert.equal((await loadAdminLegacyMarks(adminArgs)).rows[0].totalObtained,15);
await assert.rejects(loadAdminLegacyMarks(args),/session changed/);
role='viewer';await assert.rejects(loadAdminLegacyMarks(adminArgs),/role changed/);
role='school_admin';rows=[{...mark,schoolId:'99999'}];await assert.rejects(loadAdminLegacyMarks(adminArgs),/Foreign/);
rows=[mark];
console.log('PASS Admin original marks reader: active same-school Admin, no teacher-duty bypass for teachers, foreign data denied');
