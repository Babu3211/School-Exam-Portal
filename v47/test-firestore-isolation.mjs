import assert from 'node:assert/strict';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,getDoc,setDoc,updateDoc,deleteDoc,getDocs,collection} from 'firebase/firestore';

const env=await initializeTestEnvironment({
  projectId:'smss-v47-isolation-test',
  firestore:{host:'127.0.0.1',port:8187,rules:undefined}
});
const db=(uid)=>env.authenticatedContext(uid).firestore();
const anon=env.unauthenticatedContext().firestore();
const school=(id)=>`schools/${id}`;
const student=(sid,id)=>`schools/${sid}/students/${id}`;
const member=(sid,uid)=>`schools/${sid}/members/${uid}`;
try {
  await env.withSecurityRulesDisabled(async ctx=>{
    const admin=ctx.firestore();
    await setDoc(doc(admin,'v47_super_admins/root'),{active:true});
    for(const sid of ['schoolA','schoolB']){
      await setDoc(doc(admin,school(sid)),{id:sid,name:sid,active:true});
      await setDoc(doc(admin,student(sid,'s1')),{name:'Example Student',class:'6',schoolId:sid});
    }
    await setDoc(doc(admin,school('inactiveSchool')),{id:'inactiveSchool',name:'Inactive School',active:false});
    await setDoc(doc(admin,student('inactiveSchool','s1')),{name:'Hidden Student',class:'6',schoolId:'inactiveSchool'});
    for(const [sid,uid,role] of [['schoolA','adminA','school_admin'],['schoolA','teacherA','teacher'],['schoolA','viewerA','viewer'],['schoolB','adminB','school_admin'],['schoolA','unknownA','unknown_role'],['inactiveSchool','inactiveUser','teacher']]){
      await setDoc(doc(admin,member(sid,uid)),{uid,schoolId:sid,role,active:true});
    }
  });
  await assertFails(getDoc(doc(anon,student('schoolA','s1'))));
  await assertFails(getDoc(doc(db('viewerA'),student('schoolB','s1'))));
  await assertSucceeds(getDoc(doc(db('viewerA'),student('schoolA','s1'))));
  await assertFails(getDoc(doc(db('unknownA'),student('schoolA','s1'))));
  await assertFails(getDoc(doc(db('teacherA'),member('schoolA','adminA'))));
  await assertSucceeds(getDoc(doc(db('teacherA'),member('schoolA','teacherA'))));
  await assertFails(getDocs(collection(db('teacherA'),'schools/schoolA/members')));
  await assertFails(getDoc(doc(db('inactiveUser'),student('inactiveSchool','s1'))));
  await assertSucceeds(getDoc(doc(db('root'),student('inactiveSchool','s1'))));
  await assertFails(setDoc(doc(db('viewerA'),student('schoolA','s2')),{name:'Forbidden'}));
  await assertFails(updateDoc(doc(db('viewerA'),student('schoolA','s1')),{name:'Forbidden'}));
  await assertFails(deleteDoc(doc(db('viewerA'),student('schoolA','s1'))));
  await assertSucceeds(setDoc(doc(db('adminA'),student('schoolA','s2')),{name:'Allowed',class:'6',schoolId:'schoolA'}));
  await assertFails(setDoc(doc(db('adminA'),student('schoolB','s2')),{name:'Forbidden'}));
  await assertFails(setDoc(doc(db('teacherA'),student('schoolA','s3')),{name:'Not yet assigned'}));
  await assertSucceeds(setDoc(doc(db('adminA'),'schools/schoolA/subjects/math'),{schoolId:'schoolA',name:'Mathematics',class:'6',active:true}));
  await assertSucceeds(setDoc(doc(db('adminA'),'schools/schoolA/subject_assignments/s1:math'),{schoolId:'schoolA',studentId:'s1',subjectId:'math',class:'6'}));
  await assertSucceeds(setDoc(doc(db('adminA'),'schools/schoolA/students/s9'),{name:'Computer Student',class:'9',schoolId:'schoolA'}));
  await assertSucceeds(setDoc(doc(db('adminA'),'schools/schoolA/subjects/computer'),{schoolId:'schoolA',name:'Computer',class:'9',active:true}));
  await assertSucceeds(setDoc(doc(db('adminA'),'schools/schoolA/subject_assignments/s9:computer'),{schoolId:'schoolA',studentId:'s9',subjectId:'computer',class:'9'}));
  await assertSucceeds(getDoc(doc(db('teacherA'),'schools/schoolA/subject_assignments/s1:math')));
  await assertFails(setDoc(doc(db('teacherA'),'schools/schoolA/subject_assignments/a2'),{uid:'teacherA'}));
  await assertFails(getDoc(doc(db('adminB'),'schools/schoolA/subject_assignments/s1:math')));
  await assertSucceeds(setDoc(doc(db('adminA'),'schools/schoolA/component_marks/final:s9:computer'),{schoolId:'schoolA',studentId:'s9',subjectId:'computer',class:'9',term:'final',scores:{component_a:4,component_b:36,component_c:10}}));
  await assertFails(setDoc(doc(db('viewerA'),'schools/schoolA/component_marks/c2'),{score:10}));
  await assertFails(setDoc(doc(db('teacherA'),'schools/schoolA/component_marks/c3'),{score:10}));
  await assertFails(setDoc(doc(db('adminB'),'schools/schoolA/component_marks/c4'),{score:10}));
  await assertFails(setDoc(doc(db('teacherA'),'schools/schoolB/marks/m1'),{score:10}));
  await assertFails(setDoc(doc(db('viewerA'),'schools/schoolA/marks/final:s1:math'),{score:10}));
  await assertSucceeds(setDoc(doc(db('adminA'),'schools/schoolA/marks/final:s1:math'),{schoolId:'schoolA',studentId:'s1',subjectId:'math',class:'6',term:'final',theory:10,practical:0}));
  await assertFails(deleteDoc(doc(db('adminA'),'schools/schoolA/marks/final:s1:math')));
  await assertFails(setDoc(doc(db('adminA'),member('schoolA','attacker')),{uid:'attacker',schoolId:'schoolA',role:'school_admin',active:true}));
  await assertFails(setDoc(doc(db('root'),member('schoolA','forged')),{uid:'different',schoolId:'schoolA',role:'viewer',active:true}));
  await assertFails(setDoc(doc(db('root'),member('schoolA','forged2')),{uid:'forged2',schoolId:'schoolB',role:'viewer',active:true}));
  await assertFails(setDoc(doc(db('root'),member('schoolA','forged3')),{uid:'forged3',schoolId:'schoolA',role:'super_admin',active:true}));
  await assertFails(setDoc(doc(db('viewerA'),'v47_super_admins/viewerA'),{active:true}));
  await assertFails(getDoc(doc(db('viewerA'),'v47_super_admins/root')));
  await assertFails(getDoc(doc(db('root'),'v47_super_admins/root')));
  await assertFails(setDoc(doc(db('root'),'v47_super_admins/attacker'),{active:true}));
  await assertSucceeds(getDocs(collection(db('root'),'schools')));
  await assertFails(getDocs(collection(db('viewerA'),'schools')));
  await assertFails(getDocs(collection(db('teacherA'),'schools')));
  await assertSucceeds(getDocs(collection(db('adminA'),'schools/schoolA/students')));
  await assertFails(getDocs(collection(db('adminA'),'schools/schoolB/students')));
  await assertSucceeds(setDoc(doc(db('root'),school('schoolC')),{id:'schoolC',name:'School C',active:false}));
  await assertFails(setDoc(doc(db('root'),school('schoolD')),{id:'schoolD',name:'School D',active:true}));
  await assertFails(setDoc(doc(db('root'),school('schoolE')),{id:'schoolE',name:'School E',iemisCode:'bad',active:false}));
  await assertSucceeds(setDoc(doc(db('root'),school('schoolF')),{id:'schoolF',name:'School F',iemisCode:'123456789',active:false}));
  await assertSucceeds(setDoc(doc(db('root'),member('schoolF','firstAdmin')),{uid:'firstAdmin',schoolId:'schoolF',role:'school_admin',active:true}));
  await assertFails(getDoc(doc(db('firstAdmin'),student('schoolF','s1'))));
  await assertSucceeds(updateDoc(doc(db('root'),school('schoolF')),{active:true}));
  await assertSucceeds(setDoc(doc(db('firstAdmin'),student('schoolF','s1')),{name:'First Student',class:'6',schoolId:'schoolF'}));
  // Ten production-critical isolation and lifecycle assertions.
  await assertFails(getDoc(doc(anon,school('schoolA')))); // 1
  await assertFails(getDoc(doc(db('viewerA'),school('schoolB')))); // 2
  await assertSucceeds(getDoc(doc(db('adminA'),school('schoolA')))); // 3
  await assertFails(deleteDoc(doc(db('adminA'),student('schoolA','s1')))); // 4
  await assertFails(deleteDoc(doc(db('root'),student('schoolA','s1')))); // 5
  await assertFails(updateDoc(doc(db('teacherA'),student('schoolA','s1')),{name:'No'})); // 6
  await assertFails(setDoc(doc(db('viewerA'),'schools/schoolA/attendance/2026-11-18_s1'),{schoolId:'schoolA',studentId:'s1',class:'6',date:'2026-11-18',present:true})); // 7
  await assertFails(setDoc(doc(db('adminB'),'schools/schoolA/attendance/2026-11-18_s1'),{schoolId:'schoolA',studentId:'s1',class:'6',date:'2026-11-18',present:true})); // 8
  await assertSucceeds(setDoc(doc(db('adminA'),'schools/schoolA/attendance/2026-11-18_s1'),{schoolId:'schoolA',studentId:'s1',class:'6',date:'2026-11-18',present:true})); // 9
  await assertFails(deleteDoc(doc(db('root'),'schools/schoolA/attendance/2026-11-18_s1'))); // 10
  // Read isolation must also cover exam records, not only student profiles.
  await assertSucceeds(getDoc(doc(db('viewerA'),'schools/schoolA/attendance/2026-11-18_s1')));
  await assertFails(getDoc(doc(db('adminB'),'schools/schoolA/attendance/2026-11-18_s1')));
  await assertFails(getDocs(collection(db('adminB'),'schools/schoolA/attendance')));
  await assertFails(getDoc(doc(db('viewerA'),'schools/schoolB/students/s1')));
  await assertFails(getDocs(collection(db('viewerA'),'schools/schoolB/students')));
  await assertFails(getDoc(doc(db('adminB'),'schools/schoolA/component_marks/final:s9:computer')));
  await assertFails(getDocs(collection(db('adminB'),'schools/schoolA/component_marks')));
  await assertFails(getDoc(doc(db('adminB'),'schools/schoolA/marks/final:s1:math')));
  await assertFails(getDocs(collection(db('adminB'),'schools/schoolA/marks')));
  await assertFails(updateDoc(doc(db('viewerA'),'schools/schoolA/attendance/2026-11-18_s1'),{present:false}));
  await assertFails(deleteDoc(doc(db('viewerA'),'schools/schoolA/attendance/2026-11-18_s1')));
  await assertFails(updateDoc(doc(db('adminB'),'schools/schoolA/attendance/2026-11-18_s1'),{present:false}));

  await assertFails(deleteDoc(doc(db('root'),school('schoolA'))));
  await assertFails(setDoc(doc(db('root'),school('schoolG')),{id:'schoolG',name:'School G',iemisCode:123456,active:false}));
  await assertFails(updateDoc(doc(db('adminA'),school('schoolA')),{active:false}));
  await assertFails(updateDoc(doc(db('root'),school('schoolA')),{name:'Tampered'}));
  await assertFails(updateDoc(doc(db('root'),school('schoolA')),{iemisCode:'999999'}));
  await assertFails(setDoc(doc(db('root'),school('schoolA')),{id:'schoolA',name:'Replaced',active:false}));
  console.log('V47 Firestore emulator isolation tests passed');
} finally {await env.cleanup();}
