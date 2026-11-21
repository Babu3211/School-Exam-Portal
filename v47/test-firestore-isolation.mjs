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
    for(const sid of ['12345678','87654321']){
      await setDoc(doc(admin,school(sid)),{id:sid,name:'Example School',iemisCode:sid,active:true});
      await setDoc(doc(admin,student(sid,'s1')),{name:'Example Student',class:'6',schoolId:sid});
    }
    await setDoc(doc(admin,school('11223344')),{id:'11223344',name:'Inactive School',iemisCode:'11223344',active:false});
    await setDoc(doc(admin,student('11223344','s1')),{name:'Hidden Student',class:'6',schoolId:'11223344'});
    for(const [sid,uid,role] of [['12345678','adminA','school_admin'],['12345678','teacherA','teacher'],['12345678','viewerA','viewer'],['87654321','adminB','school_admin'],['12345678','unknownA','unknown_role'],['11223344','inactiveUser','teacher']]){
      await setDoc(doc(admin,member(sid,uid)),{uid,schoolId:sid,role,active:true});
    }
  });
  await assertFails(getDoc(doc(anon,student('12345678','s1'))));
  await assertFails(getDoc(doc(db('viewerA'),student('87654321','s1'))));
  await assertSucceeds(getDoc(doc(db('viewerA'),student('12345678','s1'))));
  await assertFails(getDoc(doc(db('unknownA'),student('12345678','s1'))));
  await assertFails(getDoc(doc(db('teacherA'),member('12345678','adminA'))));
  await assertSucceeds(getDoc(doc(db('teacherA'),member('12345678','teacherA'))));
  await assertFails(getDocs(collection(db('teacherA'),'schools/12345678/members')));
  await assertFails(getDoc(doc(db('inactiveUser'),student('11223344','s1'))));
  await assertSucceeds(getDoc(doc(db('root'),student('11223344','s1'))));
  await assertFails(setDoc(doc(db('viewerA'),student('12345678','s2')),{name:'Forbidden'}));
  await assertFails(updateDoc(doc(db('viewerA'),student('12345678','s1')),{name:'Forbidden'}));
  await assertFails(deleteDoc(doc(db('viewerA'),student('12345678','s1'))));
  await assertSucceeds(setDoc(doc(db('adminA'),student('12345678','s2')),{name:'Allowed',class:'6',schoolId:'12345678'}));
  await assertFails(setDoc(doc(db('adminA'),student('87654321','s2')),{name:'Forbidden'}));
  await assertFails(setDoc(doc(db('teacherA'),student('12345678','s3')),{name:'Not yet assigned'}));
  await assertSucceeds(setDoc(doc(db('adminA'),'schools/12345678/subjects/math'),{schoolId:'12345678',name:'Mathematics',class:'6',active:true}));
  await assertSucceeds(setDoc(doc(db('adminA'),'schools/12345678/subject_assignments/s1:math'),{schoolId:'12345678',studentId:'s1',subjectId:'math',class:'6'}));
  await assertSucceeds(setDoc(doc(db('adminA'),'schools/12345678/students/s9'),{name:'Computer Student',class:'9',schoolId:'12345678'}));
  await assertSucceeds(setDoc(doc(db('adminA'),'schools/12345678/subjects/computer'),{schoolId:'12345678',name:'Computer',class:'9',active:true}));
  await assertSucceeds(setDoc(doc(db('adminA'),'schools/12345678/subject_assignments/s9:computer'),{schoolId:'12345678',studentId:'s9',subjectId:'computer',class:'9'}));
  await assertSucceeds(getDoc(doc(db('teacherA'),'schools/12345678/subject_assignments/s1:math')));
  await assertFails(setDoc(doc(db('teacherA'),'schools/12345678/subject_assignments/a2'),{uid:'teacherA'}));
  await assertFails(getDoc(doc(db('adminB'),'schools/12345678/subject_assignments/s1:math')));
  await assertFails(setDoc(doc(db('adminA'),'schools/12345678/component_marks/final:s9:computer'),{schoolId:'12345678',studentId:'s9',subjectId:'computer',class:'9',term:'final',scores:{component_a:4,component_b:36,component_c:10}}));
  await assertFails(setDoc(doc(db('viewerA'),'schools/12345678/component_marks/c2'),{score:10}));
  await assertFails(setDoc(doc(db('teacherA'),'schools/12345678/component_marks/c3'),{score:10}));
  await assertFails(setDoc(doc(db('adminB'),'schools/12345678/component_marks/c4'),{score:10}));
  await assertFails(setDoc(doc(db('teacherA'),'schools/87654321/marks/m1'),{score:10}));
  await assertFails(setDoc(doc(db('viewerA'),'schools/12345678/marks/final:s1:math'),{score:10}));
  await assertFails(setDoc(doc(db('adminA'),'schools/12345678/marks/final:s1:math'),{schoolId:'12345678',studentId:'s1',subjectId:'math',class:'6',term:'final',theory:10,practical:0}));
  await assertFails(deleteDoc(doc(db('adminA'),'schools/12345678/marks/final:s1:math')));
  await assertFails(setDoc(doc(db('adminA'),member('12345678','attacker')),{uid:'attacker',schoolId:'12345678',role:'school_admin',active:true}));
  await assertFails(setDoc(doc(db('root'),member('12345678','forged')),{uid:'different',schoolId:'12345678',role:'viewer',active:true}));
  await assertFails(setDoc(doc(db('root'),member('12345678','forged2')),{uid:'forged2',schoolId:'87654321',role:'viewer',active:true}));
  await assertFails(setDoc(doc(db('root'),member('12345678','forged3')),{uid:'forged3',schoolId:'12345678',role:'super_admin',active:true}));
  await assertFails(setDoc(doc(db('viewerA'),'v47_super_admins/viewerA'),{active:true}));
  await assertFails(getDoc(doc(db('viewerA'),'v47_super_admins/root')));
  await assertFails(getDoc(doc(db('root'),'v47_super_admins/root')));
  await assertFails(setDoc(doc(db('root'),'v47_super_admins/attacker'),{active:true}));
  await assertSucceeds(getDocs(collection(db('root'),'schools')));
  await assertFails(getDocs(collection(db('viewerA'),'schools')));
  await assertFails(getDocs(collection(db('teacherA'),'schools')));
  await assertSucceeds(getDocs(collection(db('adminA'),'schools/12345678/students')));
  await assertFails(getDocs(collection(db('adminA'),'schools/87654321/students')));
  await assertSucceeds(setDoc(doc(db('root'),school('22334455')),{id:'22334455',name:'School C',active:false}));
  await assertFails(setDoc(doc(db('root'),school('33445566')),{id:'33445566',name:'School D',active:true}));
  await assertFails(setDoc(doc(db('root'),school('44556677')),{id:'44556677',name:'School E',iemisCode:'bad',active:false}));
  await assertSucceeds(setDoc(doc(db('root'),school('55667788')),{id:'55667788',name:'School F',iemisCode:'123456789',active:false}));
  await assertSucceeds(setDoc(doc(db('root'),member('55667788','firstAdmin')),{uid:'firstAdmin',schoolId:'55667788',role:'school_admin',active:true}));
  await assertFails(getDoc(doc(db('firstAdmin'),student('55667788','s1'))));
  await assertSucceeds(updateDoc(doc(db('root'),school('55667788')),{active:true}));
  await assertSucceeds(setDoc(doc(db('firstAdmin'),student('55667788','s1')),{name:'First Student',class:'6',schoolId:'55667788'}));
  // Ten production-critical isolation and lifecycle assertions.
  await assertFails(getDoc(doc(anon,school('12345678')))); // 1
  await assertFails(getDoc(doc(db('viewerA'),school('87654321')))); // 2
  await assertSucceeds(getDoc(doc(db('adminA'),school('12345678')))); // 3
  await assertFails(deleteDoc(doc(db('adminA'),student('12345678','s1')))); // 4
  await assertFails(deleteDoc(doc(db('root'),student('12345678','s1')))); // 5
  await assertFails(updateDoc(doc(db('teacherA'),student('12345678','s1')),{name:'No'})); // 6
  await assertFails(setDoc(doc(db('viewerA'),'schools/12345678/attendance/2026-11-18_s1'),{schoolId:'12345678',studentId:'s1',class:'6',date:'2026-11-18',present:true})); // 7
  await assertFails(setDoc(doc(db('adminB'),'schools/12345678/attendance/2026-11-18_s1'),{schoolId:'12345678',studentId:'s1',class:'6',date:'2026-11-18',present:true})); // 8
  await assertSucceeds(setDoc(doc(db('adminA'),'schools/12345678/attendance/2026-11-18_s1'),{schoolId:'12345678',studentId:'s1',class:'6',date:'2026-11-18',present:true})); // 9
  await assertFails(deleteDoc(doc(db('root'),'schools/12345678/attendance/2026-11-18_s1'))); // 10
  // Read isolation must also cover exam records, not only student profiles.
  await assertSucceeds(getDoc(doc(db('viewerA'),'schools/12345678/attendance/2026-11-18_s1')));
  await assertFails(getDoc(doc(db('adminB'),'schools/12345678/attendance/2026-11-18_s1')));
  await assertFails(getDocs(collection(db('adminB'),'schools/12345678/attendance')));
  await assertFails(getDoc(doc(db('viewerA'),'schools/87654321/students/s1')));
  await assertFails(getDocs(collection(db('viewerA'),'schools/87654321/students')));
  await assertFails(getDoc(doc(db('adminB'),'schools/12345678/component_marks/final:s9:computer')));
  await assertFails(getDocs(collection(db('adminB'),'schools/12345678/component_marks')));
  await assertFails(getDoc(doc(db('adminB'),'schools/12345678/marks/final:s1:math')));
  await assertFails(getDocs(collection(db('adminB'),'schools/12345678/marks')));
  await assertFails(updateDoc(doc(db('viewerA'),'schools/12345678/attendance/2026-11-18_s1'),{present:false}));
  await assertFails(deleteDoc(doc(db('viewerA'),'schools/12345678/attendance/2026-11-18_s1')));
  await assertFails(updateDoc(doc(db('adminB'),'schools/12345678/attendance/2026-11-18_s1'),{present:false}));

  await assertFails(deleteDoc(doc(db('root'),school('12345678'))));
  await assertFails(setDoc(doc(db('root'),school('schoolG')),{id:'schoolG',name:'School G',iemisCode:123456,active:false}));
  await assertFails(updateDoc(doc(db('adminA'),school('12345678')),{active:false}));
  await assertFails(updateDoc(doc(db('root'),school('12345678')),{name:'Tampered'}));
  await assertFails(updateDoc(doc(db('root'),school('12345678')),{iemisCode:'999999'}));
  await assertFails(setDoc(doc(db('root'),school('12345678')),{id:'12345678',name:'Replaced',active:false}));
  console.log('V47 Firestore emulator isolation tests passed');
} finally {await env.cleanup();}
