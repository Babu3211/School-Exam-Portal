import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment, assertFails, assertSucceeds} from '@firebase/rules-unit-testing';
import {doc, getDoc, setDoc, updateDoc, deleteDoc} from 'firebase/firestore';

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
  await assertSucceeds(setDoc(schoolDoc('admin-a','school-a','marks','mark-1'),{schoolId:'school-a',score:20}));
  await assertFails(setDoc(schoolDoc('admin-a','school-a','marks','missing-scope'),{score:20}));
  await assertFails(setDoc(schoolDoc('admin-a','school-a','marks','wrong-scope'),{schoolId:'school-b',score:20}));
  await assertFails(updateDoc(schoolDoc('admin-a','school-a','marks','mark-1'),{schoolId:'school-b'}));
  await assertFails(setDoc(schoolDoc('viewer-a','school-a','attendance','day-1'),{schoolId:'school-a'}));
  await assertSucceeds(setDoc(schoolDoc('admin-a','school-a','attendance','day-1'),{schoolId:'school-a'}));
  await assertFails(setDoc(schoolDoc('admin-a','school-a','attendance','day-2'),{date:'2083-08-01'}));
  await assertFails(updateDoc(schoolDoc('admin-a','school-a','attendance','day-1'),{schoolId:'school-b'}));
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
  await assertFails(deleteDoc(schoolDoc('admin-a','school-a','teacher_assignments','school-a:teacher-a:9:math')));
  await assertSucceeds(updateDoc(schoolDoc('admin-a','school-a','members','teacher-a'),{active:false}));
  await assertSucceeds(updateDoc(schoolDoc('admin-a','school-a','teacher_assignments','school-a:teacher-a:9:math'),{active:false}));
  await assertFails(updateDoc(schoolDoc('admin-a','school-a','teacher_assignments','school-a:teacher-a:9:math'),{active:true}));
  await assertSucceeds(updateDoc(schoolDoc('admin-a','school-a','members','teacher-a'),{active:true}));
  await assertSucceeds(updateDoc(schoolDoc('admin-a','school-a','teacher_assignments','school-a:teacher-a:9:math'),{active:true}));

  console.log('V47 emulator isolation and role checks passed');
} finally {await env.cleanup();}
