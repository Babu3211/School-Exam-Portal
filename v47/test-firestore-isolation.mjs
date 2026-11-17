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
      await setDoc(doc(admin,student(sid,'s1')),{name:'Example Student',class:'6'});
    }
    await setDoc(doc(admin,school('inactiveSchool')),{id:'inactiveSchool',name:'Inactive School',active:false});
    await setDoc(doc(admin,student('inactiveSchool','s1')),{name:'Hidden Student'});
    for(const [sid,uid,role] of [['schoolA','adminA','school_admin'],['schoolA','teacherA','teacher'],['schoolA','viewerA','viewer'],['schoolB','adminB','school_admin'],['schoolA','unknownA','unknown_role'],['inactiveSchool','inactiveUser','teacher']]){
      await setDoc(doc(admin,member(sid,uid)),{uid,schoolId:sid,role,active:true});
    }
  });
  await assertFails(getDoc(doc(anon,student('schoolA','s1'))));
  await assertFails(getDoc(doc(db('viewerA'),student('schoolB','s1'))));
  await assertSucceeds(getDoc(doc(db('viewerA'),student('schoolA','s1'))));
  await assertFails(getDoc(doc(db('unknownA'),student('schoolA','s1'))));
  await assertFails(getDoc(doc(db('inactiveUser'),student('inactiveSchool','s1'))));
  await assertSucceeds(getDoc(doc(db('root'),student('inactiveSchool','s1'))));
  await assertFails(setDoc(doc(db('viewerA'),student('schoolA','s2')),{name:'Forbidden'}));
  await assertFails(updateDoc(doc(db('viewerA'),student('schoolA','s1')),{name:'Forbidden'}));
  await assertFails(deleteDoc(doc(db('viewerA'),student('schoolA','s1'))));
  await assertSucceeds(setDoc(doc(db('adminA'),student('schoolA','s2')),{name:'Allowed',class:'6'}));
  await assertFails(setDoc(doc(db('adminA'),student('schoolB','s2')),{name:'Forbidden'}));
  await assertFails(setDoc(doc(db('teacherA'),student('schoolA','s3')),{name:'Not yet assigned'}));
  await assertSucceeds(setDoc(doc(db('adminA'),'schools/schoolA/subject_assignments/a1'),{uid:'teacherA',classId:'9',subjectId:'computer'}));
  await assertSucceeds(getDoc(doc(db('teacherA'),'schools/schoolA/subject_assignments/a1')));
  await assertFails(setDoc(doc(db('teacherA'),'schools/schoolA/subject_assignments/a2'),{uid:'teacherA'}));
  await assertFails(getDoc(doc(db('adminB'),'schools/schoolA/subject_assignments/a1')));
  await assertSucceeds(setDoc(doc(db('adminA'),'schools/schoolA/component_marks/c1'),{score:10}));
  await assertFails(setDoc(doc(db('viewerA'),'schools/schoolA/component_marks/c2'),{score:10}));
  await assertFails(setDoc(doc(db('teacherA'),'schools/schoolA/component_marks/c3'),{score:10}));
  await assertFails(setDoc(doc(db('adminB'),'schools/schoolA/component_marks/c4'),{score:10}));
  await assertFails(setDoc(doc(db('teacherA'),'schools/schoolB/marks/m1'),{score:10}));
  await assertFails(setDoc(doc(db('viewerA'),'schools/schoolA/marks/m1'),{score:10}));
  await assertSucceeds(setDoc(doc(db('adminA'),'schools/schoolA/marks/m1'),{score:10}));
  await assertFails(deleteDoc(doc(db('adminA'),'schools/schoolA/marks/m1')));
  await assertFails(setDoc(doc(db('adminA'),member('schoolA','attacker')),{uid:'attacker',schoolId:'schoolA',role:'school_admin',active:true}));
  await assertFails(setDoc(doc(db('root'),member('schoolA','forged')),{uid:'different',schoolId:'schoolA',role:'viewer',active:true}));
  await assertFails(setDoc(doc(db('root'),member('schoolA','forged2')),{uid:'forged2',schoolId:'schoolB',role:'viewer',active:true}));
  await assertFails(setDoc(doc(db('root'),member('schoolA','forged3')),{uid:'forged3',schoolId:'schoolA',role:'super_admin',active:true}));
  await assertFails(setDoc(doc(db('viewerA'),'v47_super_admins/viewerA'),{active:true}));
  await assertSucceeds(getDocs(collection(db('root'),'schools')));
  await assertFails(getDocs(collection(db('viewerA'),'schools')));
  await assertSucceeds(setDoc(doc(db('root'),school('schoolC')),{id:'schoolC',name:'School C',active:false}));
  await assertFails(setDoc(doc(db('root'),school('schoolD')),{id:'schoolD',name:'School D',active:true}));
  await assertFails(setDoc(doc(db('root'),school('schoolE')),{id:'schoolE',name:'School E',iemisCode:'bad',active:false}));
  await assertSucceeds(setDoc(doc(db('root'),school('schoolF')),{id:'schoolF',name:'School F',iemisCode:'123456789',active:false}));
  await assertSucceeds(setDoc(doc(db('root'),member('schoolF','firstAdmin')),{uid:'firstAdmin',schoolId:'schoolF',role:'school_admin',active:true}));
  await assertFails(getDoc(doc(db('firstAdmin'),student('schoolF','s1'))));
  await assertSucceeds(updateDoc(doc(db('root'),school('schoolF')),{active:true}));
  await assertSucceeds(setDoc(doc(db('firstAdmin'),student('schoolF','s1')),{name:'First Student'}));
  // Ten production-critical isolation and lifecycle assertions.
  await assertFails(getDoc(doc(anon,school('schoolA')))); // 1
  await assertFails(getDoc(doc(db('viewerA'),school('schoolB')))); // 2
  await assertSucceeds(getDoc(doc(db('adminA'),school('schoolA')))); // 3
  await assertFails(deleteDoc(doc(db('adminA'),student('schoolA','s1')))); // 4
  await assertFails(deleteDoc(doc(db('root'),student('schoolA','s1')))); // 5
  await assertFails(updateDoc(doc(db('teacherA'),student('schoolA','s1')),{name:'No'})); // 6
  await assertFails(setDoc(doc(db('viewerA'),'schools/schoolA/attendance/a1'),{present:true})); // 7
  await assertFails(setDoc(doc(db('adminB'),'schools/schoolA/attendance/a1'),{present:true})); // 8
  await assertSucceeds(setDoc(doc(db('adminA'),'schools/schoolA/attendance/a1'),{present:true})); // 9
  await assertFails(deleteDoc(doc(db('root'),'schools/schoolA/attendance/a1'))); // 10
  await assertFails(deleteDoc(doc(db('root'),school('schoolA'))));
  await assertFails(setDoc(doc(db('root'),school('schoolG')),{id:'schoolG',name:'School G',iemisCode:123456,active:false}));
  await assertFails(updateDoc(doc(db('adminA'),school('schoolA')),{active:false}));
  console.log('V47 Firestore emulator isolation tests passed');
} finally {await env.cleanup();}
