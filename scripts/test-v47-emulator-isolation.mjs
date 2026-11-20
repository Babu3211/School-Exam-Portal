import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment, assertFails as firebaseAssertFails, assertSucceeds as firebaseAssertSucceeds} from '@firebase/rules-unit-testing';
import {doc, getDoc, setDoc, updateDoc, deleteDoc} from 'firebase/firestore';

// Include the originating test line on failure; Firestore permission-denied logs alone are ambiguous.
let assertionNumber=0;
async function checkedAssertion(assertion,operation,expected){
 const number=++assertionNumber;
 const callsite=new Error().stack?.split('\n')[2]?.trim()||'unknown callsite';
 try{return await assertion(operation)}
 catch(error){
  console.error('V47 EMULATOR ASSERTION FAILED #'+number+' expected='+expected+' at '+callsite);
  console.error('Cause: '+(error?.message||String(error)));
  throw error;
 }
}
const assertFails=operation=>checkedAssertion(firebaseAssertFails,operation,'DENIED');
const assertSucceeds=operation=>checkedAssertion(firebaseAssertSucceeds,operation,'ALLOWED');

const env=await initializeTestEnvironment({
  projectId:'smss-v47-isolation-test',
  firestore:{rules:await readFile('v47/firestore.rules','utf8'),host:'127.0.0.1',port:8080}
});
const db=uid=>env.authenticatedContext(uid).firestore();
const schoolDoc=(uid,sid,collection,id)=>doc(db(uid),'schools',sid,collection,id);
try {
  await env.withSecurityRulesDisabled(async ctx=>{
    const root=ctx.firestore();
    for(const sid of ['school-a','school-b']){
      await setDoc(doc(root,'schools',sid),{id:sid,name:'School '+sid,active:true});
      await setDoc(doc(root,'schools',sid,'students','student-1'),{name:'Student One',class:'9',schoolId:sid});
    }
    for(const [sid,uid,role] of [
      ['school-a','admin-a','school_admin'],['school-b','admin-b','school_admin'],
      ['school-a','viewer-a','viewer'],['school-a','teacher-a','teacher']
    ]) await setDoc(doc(root,'schools',sid,'members',uid),{uid,schoolId:sid,role,active:true});
    await setDoc(doc(root,'schools','school-a','subjects','math'),{schoolId:'school-a',class:'9',name:'Mathematics',active:true});
    await setDoc(doc(root,'schools','school-a','subject_assignments','student-2:math'),{schoolId:'school-a',studentId:'student-2',subjectId:'math',class:'9'});
    await setDoc(doc(root,'v47_super_admins','super-a'),{active:true});
    await setDoc(doc(root,'v47_super_admins','disabled-super'),{active:false});
    await setDoc(doc(root,'schools','school-disabled'),{id:'school-disabled',name:'Disabled School',active:false});
    await setDoc(doc(root,'schools','school-disabled','members','disabled-school-admin'),{uid:'disabled-school-admin',schoolId:'school-disabled',role:'school_admin',active:true});
    await setDoc(doc(root,'schools','school-disabled','students','student-1'),{name:'Inactive School Student',class:'9',schoolId:'school-disabled'});
    await setDoc(doc(root,'schools','school-a','members','inactive-viewer'),{uid:'inactive-viewer',schoolId:'school-a',role:'viewer',active:false});
  });
  const valid={name:'Student Two',class:'9',schoolId:'school-a'};
  await assertSucceeds(getDoc(schoolDoc('admin-a','school-a','students','student-1')));
  await assertFails(getDoc(schoolDoc('admin-a','school-b','students','student-1')));
  await assertFails(getDoc(schoolDoc('viewer-a','school-b','students','student-1')));
  await assertFails(getDoc(schoolDoc('teacher-a','school-b','students','student-1')));
  await assertFails(getDoc(schoolDoc('admin-b','school-a','students','student-1')));
  await assertSucceeds(getDoc(schoolDoc('teacher-a','school-a','students','student-1')));
  await assertSucceeds(getDoc(schoolDoc('viewer-a','school-a','students','student-1')));
  await assertFails(setDoc(schoolDoc('viewer-a','school-a','students','student-2'),valid));
  await assertFails(setDoc(schoolDoc('teacher-a','school-a','students','student-2'),valid));
  await assertSucceeds(setDoc(schoolDoc('admin-a','school-a','students','student-2'),valid));
  await assertSucceeds(setDoc(schoolDoc('admin-a','school-a','students','s'.repeat(128)),valid));
  await assertFails(setDoc(schoolDoc('admin-a','school-a','students','s'.repeat(129)),valid));
  await assertFails(setDoc(schoolDoc('admin-a','school-a','students','student-3'),{...valid,schoolId:'school-b'}));
  await assertFails(setDoc(schoolDoc('admin-a','school-a','students','student-missing-scope'),{name:'Student Missing',class:'9'}));
  await assertFails(setDoc(schoolDoc('admin-a','school-a','students','student-4'),{name:'X',class:'9',schoolId:'school-a'}));
  await assertFails(updateDoc(schoolDoc('admin-a','school-a','students','student-2'),{schoolId:'school-b'}));
  await assertFails(deleteDoc(schoolDoc('admin-a','school-a','students','student-2')));
  await assertFails(setDoc(schoolDoc('viewer-a','school-a','marks','mark-1'),{schoolId:'school-a',score:20}));
  await assertFails(setDoc(schoolDoc('teacher-a','school-a','marks','mark-1'),{schoolId:'school-a',score:20}));
  // Subject assignment creation must reject malformed IDs, types and unrecognized fields.
  // Use a genuinely NEW document. An existing assignment denies updates
  // regardless of payload, which would make all negative cases false positives.
  const validSubjectAssignment={schoolId:'school-a',studentId:'student-1',subjectId:'math',class:'9'};
  for(const [id,patch] of [
    ['student-1:math:extra',{}],
    ['student-1:math',{active:'yes'}],
    ['student-1:math',{class:'99'}],
    ['student-1:math',{studentId:'student/2'}],
    ['student-1:math',{subjectId:'math/extra'}],
    ['student-1:math',{untrusted:true}],
    ['student-1:math',{schoolId:'school-b'}],
    ['student-1:math',{active:null}]
  ]){
    await assertFails(setDoc(schoolDoc('admin-a','school-a','subject_assignments',id),{...validSubjectAssignment,...patch}));
  }
  await assertSucceeds(setDoc(schoolDoc('admin-a','school-a','subject_assignments','student-1:math'),validSubjectAssignment));
  const adminRawMark={schoolId:'school-a',studentId:'student-2',subjectId:'math',class:'9',term:'1st',theory:20,practical:10};
  await assertFails(setDoc(schoolDoc('admin-a','school-a','marks','1st:student-2:math'),adminRawMark));

  // Regression: raw mark rules must reject inactive, mismatched or foreign assignments.
  await env.withSecurityRulesDisabled(async ctx=>{
    await updateDoc(doc(ctx.firestore(),'schools','school-a','subject_assignments','student-2:math'),{active:false});
  });
  await assertFails(setDoc(schoolDoc('admin-a','school-a','marks','monthly:student-2:math'),{...adminRawMark,term:'monthly'}));
  await env.withSecurityRulesDisabled(async ctx=>{
    await updateDoc(doc(ctx.firestore(),'schools','school-a','subject_assignments','student-2:math'),{active:true,studentId:'student-1'});
  });
  await assertFails(setDoc(schoolDoc('admin-a','school-a','marks','monthly:student-2:math'),{...adminRawMark,term:'monthly'}));
  await env.withSecurityRulesDisabled(async ctx=>{
    await updateDoc(doc(ctx.firestore(),'schools','school-a','subject_assignments','student-2:math'),{studentId:'student-2',subjectId:'science'});
  });
  await assertFails(setDoc(schoolDoc('admin-a','school-a','marks','monthly:student-2:math'),{...adminRawMark,term:'monthly'}));
  await env.withSecurityRulesDisabled(async ctx=>{
    await updateDoc(doc(ctx.firestore(),'schools','school-a','subject_assignments','student-2:math'),{subjectId:'math',schoolId:'school-b'});
  });
  await assertFails(setDoc(schoolDoc('admin-a','school-a','marks','monthly:student-2:math'),{...adminRawMark,term:'monthly'}));
  await env.withSecurityRulesDisabled(async ctx=>{
    await updateDoc(doc(ctx.firestore(),'schools','school-a','subject_assignments','student-2:math'),{schoolId:'school-a'});
  });
  await assertFails(setDoc(schoolDoc('admin-a','school-a','marks','monthly:student-2:math'),{...adminRawMark,term:'monthly'}));

  // Computer component rules must also reject inactive subject/assignment.
  await env.withSecurityRulesDisabled(async ctx=>{
    const root=ctx.firestore();
    await setDoc(doc(root,'schools','school-a','subjects','computer'),{schoolId:'school-a',class:'9',name:'Computer',active:true});
    await setDoc(doc(root,'schools','school-a','subject_assignments','student-2:computer'),{schoolId:'school-a',studentId:'student-2',subjectId:'computer',class:'9',active:true});
  });
  const computerMark={schoolId:'school-a',studentId:'student-2',subjectId:'computer',class:'9',term:'weekly',scores:{component_a:4,component_b:36,component_c:10}};
  const computerRef=schoolDoc('admin-a','school-a','component_marks','weekly:student-2:computer');
  await env.withSecurityRulesDisabled(async ctx=>updateDoc(doc(ctx.firestore(),'schools','school-a','subjects','computer'),{active:false}));
  await assertFails(setDoc(computerRef,computerMark));
  await env.withSecurityRulesDisabled(async ctx=>{
    const root=ctx.firestore();
    await updateDoc(doc(root,'schools','school-a','subjects','computer'),{active:true});
    await updateDoc(doc(root,'schools','school-a','subject_assignments','student-2:computer'),{active:false});
  });
  await assertFails(setDoc(computerRef,computerMark));
  await env.withSecurityRulesDisabled(async ctx=>updateDoc(doc(ctx.firestore(),'schools','school-a','subject_assignments','student-2:computer'),{active:true}));
  await assertFails(setDoc(computerRef,computerMark));
  // Boundary and authorization checks for the Computer 4/36/10 scheme.
  await assertFails(setDoc(schoolDoc('viewer-a','school-a','component_marks','3rd:student-2:computer'),{...computerMark,term:'3rd'}));
  await assertFails(setDoc(schoolDoc('admin-a','school-b','component_marks','3rd:student-2:computer'),{...computerMark,term:'3rd',schoolId:'school-b'}));
  for(const [field,value] of [['component_a',5],['component_b',37],['component_c',11],['component_a',-1],['component_b',-1],['component_c',-1]]){
    const scores={...computerMark.scores,[field]:value};
    await assertFails(setDoc(schoolDoc('admin-a','school-a','component_marks','3rd:student-2:computer'),{...computerMark,term:'3rd',scores}));
  }
  // Seed an existing component mark with rules bypassed: update/delete denials
  // must be tested against a real document, not a missing-document error.
  await env.withSecurityRulesDisabled(async ctx=>{
    await setDoc(doc(ctx.firestore(),'schools','school-a','component_marks','weekly:student-2:computer'),computerMark);
  });
  await assertSucceeds(getDoc(computerRef));
  await assertSucceeds(getDoc(schoolDoc('viewer-a','school-a','component_marks','weekly:student-2:computer')));
  await assertFails(getDoc(schoolDoc('admin-b','school-a','component_marks','weekly:student-2:computer')));
  await assertFails(getDoc(schoolDoc('outsider','school-a','component_marks','weekly:student-2:computer')));
  await assertFails(updateDoc(computerRef,{scores:{component_a:0,component_b:0,component_c:0}}));
  await assertFails(deleteDoc(computerRef));
  // Computer must not bypass 4/36/10 validation through the two-field raw marks collection.
  const computerRaw={schoolId:'school-a',studentId:'student-2',subjectId:'computer',class:'9',term:'2nd',theory:20,practical:10};
  await assertFails(setDoc(schoolDoc('admin-a','school-a','marks','2nd:student-2:computer'),computerRaw));
  await assertFails(setDoc(schoolDoc('teacher-a','school-a','marks','2nd:student-2:computer'),computerRaw));
  // The three-component schema must never be accepted for a non-Computer subject.
  const mathComponent={...computerMark,subjectId:'math',term:'monthly'};
  await assertFails(setDoc(schoolDoc('admin-a','school-a','component_marks','monthly:student-2:math'),mathComponent));
  await assertFails(setDoc(schoolDoc('admin-a','school-a','marks','missing-scope'),{score:20}));
  await assertFails(setDoc(schoolDoc('admin-a','school-a','marks','wrong-scope'),{schoolId:'school-b',score:20}));
  // An existing legacy raw mark must remain immutable for every client role.
  await env.withSecurityRulesDisabled(async ctx=>{
    await setDoc(doc(ctx.firestore(),'schools','school-a','marks','1st:student-2:math'),adminRawMark);
  });
  await assertSucceeds(getDoc(schoolDoc('viewer-a','school-a','marks','1st:student-2:math')));
  await assertFails(getDoc(schoolDoc('admin-b','school-a','marks','1st:student-2:math')));
  await assertFails(getDoc(schoolDoc('outsider','school-a','marks','1st:student-2:math')));
  await assertFails(updateDoc(schoolDoc('admin-a','school-a','marks','1st:student-2:math'),{schoolId:'school-b'}));
  await assertFails(updateDoc(schoolDoc('admin-a','school-a','marks','1st:student-2:math'),{studentId:'student-2'}));
  await assertFails(updateDoc(schoolDoc('admin-a','school-a','marks','1st:student-2:math'),{studentId:'student-1'}));
  await assertFails(updateDoc(schoolDoc('admin-a','school-a','marks','1st:student-2:math'),{theory:101}));
  await assertFails(updateDoc(schoolDoc('admin-a','school-a','marks','1st:student-2:math'),{theory:25}));
  await assertFails(setDoc(schoolDoc('admin-a','school-a','marks','final:student-2:math'),{...adminRawMark,term:'final',theory:-1}));
  await assertFails(setDoc(schoolDoc('admin-a','school-a','marks','2nd:student-2:math'),{...adminRawMark,term:'2nd',extra:'forbidden'}));
  await assertFails(setDoc(schoolDoc('admin-a','school-a','marks','wrong-id'),adminRawMark));
  await assertFails(setDoc(schoolDoc('viewer-a','school-a','attendance','day-1'),{schoolId:'school-a'}));
  await assertSucceeds(setDoc(schoolDoc('admin-a','school-a','attendance','2083-08-01_student-2'),{schoolId:'school-a',studentId:'student-2',class:'9',date:'2083-08-01',present:true}));
  await assertFails(setDoc(schoolDoc('admin-a','school-a','attendance','day-2'),{date:'2083-08-01'}));
  await assertFails(updateDoc(schoolDoc('admin-a','school-a','attendance','2083-08-01_student-2'),{schoolId:'school-b'}));
  await assertFails(setDoc(schoolDoc('viewer-a','school-a','staff','staff-1'),{schoolId:'school-a'}));
  await assertSucceeds(setDoc(schoolDoc('admin-a','school-a','staff','staff-1'),{schoolId:'school-a'}));
  await assertFails(setDoc(schoolDoc('admin-a','school-a','staff','missing-scope'),{name:'Missing scope'}));
  await assertFails(setDoc(schoolDoc('admin-a','school-a','staff','wrong-scope'),{schoolId:'school-b'}));
  await assertFails(updateDoc(schoolDoc('admin-a','school-a','staff','staff-1'),{schoolId:'school-b'}));
  await assertFails(deleteDoc(schoolDoc('admin-a','school-a','staff','staff-1')));
  await assertFails(setDoc(schoolDoc('admin-a','school-b','students','student-3'),{...valid,schoolId:'school-b'}));
  await assertFails(setDoc(schoolDoc('admin-a','school-a','members','new-admin'),{uid:'new-admin',schoolId:'school-a',role:'school_admin',active:true}));
  await assertFails(setDoc(schoolDoc('admin-a','school-a','members','admin-a'),{uid:'admin-a',schoolId:'school-a',role:'school_admin',active:true}));
  await assertSucceeds(setDoc(schoolDoc('admin-a','school-a','members','new-viewer'),{uid:'new-viewer',schoolId:'school-a',role:'viewer',active:false}));
  await assertFails(updateDoc(schoolDoc('admin-a','school-a','members','new-viewer'),{role:'school_admin'}));
  await assertSucceeds(updateDoc(schoolDoc('admin-a','school-a','members','new-viewer'),{active:true}));
  await assertSucceeds(getDoc(schoolDoc('new-viewer','school-a','students','student-1')));
  await assertFails(setDoc(schoolDoc('new-viewer','school-a','students','new-viewer-write'),valid));
  await assertFails(updateDoc(schoolDoc('admin-a','school-a','members','new-viewer'),{schoolId:'school-b'}));
  await assertFails(updateDoc(schoolDoc('admin-a','school-a','members','new-viewer'),{uid:'admin-a'}));
  await assertFails(deleteDoc(schoolDoc('admin-a','school-a','members','new-viewer')));
  await assertFails(setDoc(schoolDoc('admin-a','school-b','members','forged-b'),{uid:'forged-b',schoolId:'school-b',role:'viewer',active:false}));
  await assertFails(setDoc(schoolDoc('viewer-a','school-a','members','forged'),{uid:'forged',schoolId:'school-a',role:'viewer',active:false}));
  await assertFails(setDoc(schoolDoc('admin-a','school-a','exams','1st'),{schoolId:'school-a',term:'final'}));
  await assertSucceeds(setDoc(schoolDoc('admin-a','school-a','exams','1st'),{schoolId:'school-a',term:'1st'}));

  // All six V47 exam terms must be writable by this school only.
  for(const term of ['weekly','monthly','2nd','3rd','final']){
    await assertSucceeds(setDoc(schoolDoc('admin-a','school-a','exams',term),{schoolId:'school-a',term}));
    await assertFails(setDoc(schoolDoc('viewer-a','school-a','exams',term),{schoolId:'school-a',term}));
    await assertFails(setDoc(schoolDoc('admin-a','school-b','exams',term),{schoolId:'school-b',term}));
  }
  await assertFails(setDoc(schoolDoc('admin-a','school-a','exams','midterm'),{schoolId:'school-a',term:'midterm'}));

  await assertFails(deleteDoc(schoolDoc('admin-a','school-a','exams','1st')));
  await assertSucceeds(getDoc(schoolDoc('super-a','school-b','students','student-1')));
  await assertFails(getDoc(schoolDoc('outsider','school-a','members','admin-a')));
  await assertFails(setDoc(doc(db('outsider'),'v47_super_admins','outsider'),{active:true}));
  await assertFails(getDoc(doc(db('super-a'),'v47_super_admins','super-a')));
  await assertFails(getDoc(schoolDoc('outsider','school-a','students','student-1')));
  await assertFails(getDoc(schoolDoc('inactive-viewer','school-a','students','student-1')));
  await assertFails(getDoc(schoolDoc('disabled-school-admin','school-disabled','students','student-1')));
  await assertFails(getDoc(schoolDoc('disabled-super','school-a','students','student-1')));
  await assertFails(setDoc(schoolDoc('inactive-viewer','school-a','students','inactive-write'),valid));
  await assertFails(setDoc(schoolDoc('disabled-school-admin','school-disabled','students','disabled-write'),{...valid,schoolId:'school-disabled'}));
  await assertFails(setDoc(schoolDoc('disabled-super','school-a','students','disabled-super-write'),valid));
  await assertFails(setDoc(doc(db('admin-a'),'schools','school-new'),{id:'school-new',name:'New School',active:false}));
  await assertFails(setDoc(doc(db('super-a'),'schools','school-bad'),{id:'school-bad',name:'New School',active:true}));
  await assertSucceeds(setDoc(doc(db('super-a'),'schools','school-new'),{id:'school-new',name:'New School',active:false}));
  await assertFails(deleteDoc(doc(db('super-a'),'schools','school-new')));
  await assertFails(updateDoc(doc(db('admin-a'),'schools','school-a'),{active:false}));
  await assertFails(setDoc(schoolDoc('admin-a','school-a','students','student-unknown-class'),{...valid,class:'99'}));
  await assertFails(setDoc(schoolDoc('admin-a','school-a','students','student-bad-roll'),{...valid,rollNo:100}));
  await assertFails(setDoc(schoolDoc('admin-a','school-a','students','student-extra-field'),{...valid,secret:'x'}));
  const teacherAssignment={schoolId:'school-a',uid:'teacher-a',classId:'9',subjectId:'math',active:false};
  await assertFails(setDoc(schoolDoc('teacher-a','school-a','teacher_assignments','school-a:teacher-a:9:math'),teacherAssignment));
  await assertFails(setDoc(schoolDoc('viewer-a','school-a','teacher_assignments','school-a:teacher-a:9:math'),teacherAssignment));
  await assertFails(setDoc(schoolDoc('admin-b','school-a','teacher_assignments','school-a:teacher-a:9:math'),teacherAssignment));
  await assertFails(setDoc(schoolDoc('admin-a','school-a','teacher_assignments','school-a:teacher-a:9:math'),{...teacherAssignment,schoolId:'school-b'}));
  await assertFails(setDoc(schoolDoc('admin-a','school-a','teacher_assignments','school-a:teacher-a:9:math'),{...teacherAssignment,active:true}));
  await assertFails(setDoc(schoolDoc('admin-a','school-a','teacher_assignments','forged-id'),teacherAssignment));
  await assertSucceeds(setDoc(schoolDoc('admin-a','school-a','teacher_assignments','school-a:teacher-a:9:math'),teacherAssignment));
  await assertSucceeds(getDoc(schoolDoc('teacher-a','school-a','teacher_assignments','school-a:teacher-a:9:math')));
  await assertFails(getDoc(schoolDoc('viewer-a','school-a','teacher_assignments','school-a:teacher-a:9:math')));
  await assertFails(getDoc(schoolDoc('admin-b','school-a','teacher_assignments','school-a:teacher-a:9:math')));
  await assertFails(updateDoc(schoolDoc('teacher-a','school-a','teacher_assignments','school-a:teacher-a:9:math'),{active:true}));
  await assertFails(updateDoc(schoolDoc('admin-a','school-a','teacher_assignments','school-a:teacher-a:9:math'),{uid:'admin-a'}));
  await assertSucceeds(updateDoc(schoolDoc('admin-a','school-a','teacher_assignments','school-a:teacher-a:9:math'),{active:true}));
  await env.withSecurityRulesDisabled(async ctx=>{
    await setDoc(doc(ctx.firestore(),'schools','school-a','subject_assignments','student-1:math'),{schoolId:'school-a',studentId:'student-1',subjectId:'math',class:'9'});
    await setDoc(doc(ctx.firestore(),'schools','school-a','subjects','math'),{schoolId:'school-a',class:'9',name:'Mathematics',active:true});
  });
  const assignedMark={schoolId:'school-a',studentId:'student-1',subjectId:'math',class:'9',term:'1st',theory:20,practical:10};
  await assertFails(setDoc(schoolDoc('teacher-a','school-a','marks','1st:student-1:math'),assignedMark));
  // A forged teacher assignment payload at the correct document path must not grant marks access.
  for(const patch of [{schoolId:'school-b'},{uid:'outsider'},{classId:'8'},{subjectId:'science'},{active:false}]){
    await env.withSecurityRulesDisabled(async ctx=>updateDoc(doc(ctx.firestore(),'schools','school-a','teacher_assignments','school-a:teacher-a:9:math'),patch));
    await assertFails(setDoc(schoolDoc('teacher-a','school-a','marks','3rd:student-1:math'),{...assignedMark,term:'3rd'}));
    await env.withSecurityRulesDisabled(async ctx=>updateDoc(doc(ctx.firestore(),'schools','school-a','teacher_assignments','school-a:teacher-a:9:math'),{...teacherAssignment,active:true}));
  }
  await assertFails(setDoc(schoolDoc('teacher-a','school-a','marks','3rd:student-1:math'),{...assignedMark,term:'3rd'}));
  await assertFails(setDoc(schoolDoc('teacher-a','school-a','marks','2nd:student-1:math'),{...assignedMark,term:'2nd',subjectId:'science'}));
  await assertFails(setDoc(schoolDoc('teacher-a','school-a','marks','2nd:student-1:math'),{...assignedMark,term:'2nd',schoolId:'school-b'}));
  await assertFails(setDoc(schoolDoc('teacher-a','school-a','marks','2nd:student-1:math'),{...assignedMark,term:'2nd',class:'8'}));
  await assertFails(setDoc(schoolDoc('teacher-a','school-a','marks','forged-id'),{...assignedMark,term:'2nd'}));
  await assertFails(updateDoc(schoolDoc('teacher-a','school-a','marks','1st:student-1:math'),{theory:99})); // Raw marks writes remain blocked for teachers
  await assertFails(deleteDoc(schoolDoc('teacher-a','school-a','marks','1st:student-1:math')));
  await assertFails(updateDoc(schoolDoc('admin-a','school-a','subjects','math'),{active:false}));
  await env.withSecurityRulesDisabled(async ctx=>updateDoc(doc(ctx.firestore(),'schools','school-a','subjects','math'),{active:false}));
  await assertFails(setDoc(schoolDoc('teacher-a','school-a','marks','2nd:student-1:math'),{...assignedMark,term:'2nd'}));
  await assertFails(updateDoc(schoolDoc('admin-a','school-a','subjects','math'),{active:true}));
  await env.withSecurityRulesDisabled(async ctx=>updateDoc(doc(ctx.firestore(),'schools','school-a','subjects','math'),{active:true}));
  await assertFails(setDoc(schoolDoc('teacher-a','school-a','marks','2nd:student-1:math'),{...assignedMark,term:'2nd',theory:101}));


  await assertFails(deleteDoc(schoolDoc('admin-a','school-a','teacher_assignments','school-a:teacher-a:9:math')));
  await assertSucceeds(updateDoc(schoolDoc('admin-a','school-a','members','teacher-a'),{active:false}));
  await assertSucceeds(updateDoc(schoolDoc('admin-a','school-a','teacher_assignments','school-a:teacher-a:9:math'),{active:false}));
  await assertFails(updateDoc(schoolDoc('admin-a','school-a','teacher_assignments','school-a:teacher-a:9:math'),{active:true}));
  await assertSucceeds(updateDoc(schoolDoc('admin-a','school-a','members','teacher-a'),{active:true}));
  await assertSucceeds(updateDoc(schoolDoc('admin-a','school-a','teacher_assignments','school-a:teacher-a:9:math'),{active:true}));

  const attendanceAssignment={schoolId:'school-a',uid:'teacher-a',classId:'9',subjectId:'attendance',active:false};
  await assertSucceeds(setDoc(schoolDoc('admin-a','school-a','teacher_assignments','school-a:teacher-a:9:attendance'),attendanceAssignment));
  await assertFails(setDoc(schoolDoc('teacher-a','school-a','attendance','2026-11-18_student-1'),{schoolId:'school-a',studentId:'student-1',class:'9',date:'2026-11-18',present:true}));
  await assertSucceeds(updateDoc(schoolDoc('admin-a','school-a','teacher_assignments','school-a:teacher-a:9:attendance'),{active:true}));
  await assertFails(setDoc(schoolDoc('teacher-a','school-a','attendance','2026-11-18_student-1'),{schoolId:'school-a',studentId:'student-1',class:'9',date:'2026-11-18',present:true,extra:'forbidden'}));
  const teacherAttendance={schoolId:'school-a',studentId:'student-1',class:'9',date:'2026-11-18',present:true};
  await assertSucceeds(setDoc(schoolDoc('teacher-a','school-a','attendance','2026-11-18_student-1'),teacherAttendance));
  await assertSucceeds(updateDoc(schoolDoc('teacher-a','school-a','attendance','2026-11-18_student-1'),{present:false})); // Active assignment authorizes attendance correction
  await assertFails(deleteDoc(schoolDoc('teacher-a','school-a','attendance','2026-11-18_student-1')));
  await assertFails(setDoc(schoolDoc('teacher-a','school-a','attendance','2026-11-19_student-1'),{...teacherAttendance,date:'2026-11-19',class:'8'}));
  await assertFails(setDoc(schoolDoc('teacher-a','school-a','attendance','2026-11-19_student-1'),{...teacherAttendance,date:'2026-11-19',schoolId:'school-b'}));
  await assertFails(setDoc(schoolDoc('teacher-a','school-a','attendance','wrong-id'),{...teacherAttendance,date:'2026-11-19'}));
  await assertFails(setDoc(schoolDoc('viewer-a','school-a','attendance','2026-11-19_student-1'),{...teacherAttendance,date:'2026-11-19'}));
  await assertFails(setDoc(schoolDoc('teacher-a','school-a','attendance','2026-11-19_student-1'),{...teacherAttendance,date:'2026-11-19',present:'yes'}));
  // Forged assignment data at a legitimate path must never authorize attendance.
  for(const patch of [{schoolId:'school-b'},{uid:'outsider'},{classId:'8'},{subjectId:'math'}]){
    await env.withSecurityRulesDisabled(async ctx=>updateDoc(doc(ctx.firestore(),'schools','school-a','teacher_assignments','school-a:teacher-a:9:attendance'),patch));
    await assertFails(setDoc(schoolDoc('teacher-a','school-a','attendance','2026-11-19_student-1'),{...teacherAttendance,date:'2026-11-19'}));
    await env.withSecurityRulesDisabled(async ctx=>updateDoc(doc(ctx.firestore(),'schools','school-a','teacher_assignments','school-a:teacher-a:9:attendance'),{schoolId:'school-a',uid:'teacher-a',classId:'9',subjectId:'attendance',active:true}));
  }
  await assertSucceeds(updateDoc(schoolDoc('admin-a','school-a','teacher_assignments','school-a:teacher-a:9:attendance'),{active:false}));
  await assertFails(setDoc(schoolDoc('teacher-a','school-a','attendance','2026-11-19_student-1'),{...teacherAttendance,date:'2026-11-19'}));
  await assertSucceeds(updateDoc(schoolDoc('admin-a','school-a','teacher_assignments','school-a:teacher-a:9:attendance'),{active:true}));
  await assertSucceeds(updateDoc(schoolDoc('admin-a','school-a','members','teacher-a'),{active:false}));
  await assertFails(setDoc(schoolDoc('teacher-a','school-a','attendance','2026-11-20_student-1'),{...teacherAttendance,date:'2026-11-20'}));
  await assertSucceeds(updateDoc(schoolDoc('admin-a','school-a','members','teacher-a'),{active:true}));

  console.log('V47 emulator isolation and role checks passed');
} finally {await env.cleanup();}
