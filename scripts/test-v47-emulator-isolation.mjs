import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment, assertFails, assertSucceeds} from '@firebase/rules-unit-testing';
import {doc, getDoc, setDoc, updateDoc, deleteDoc} from 'firebase/firestore';

const env=await initializeTestEnvironment({
  projectId:'smss-v47-isolation-test',
  firestore:{rules:await readFile('v47/firestore.rules','utf8'),host:'127.0.0.1',port:8080}
});
const db=uid=>env.authenticatedContext(uid).firestore();
const school=(sid,collection,id)=>doc(db('unused'),'schools',sid,collection,id);
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
  });
  const valid={name:'Student Two',class:'9',schoolId:'school-a'};
  await assertSucceeds(getDoc(schoolDoc('admin-a','school-a','students','student-1')));
  await assertFails(getDoc(schoolDoc('admin-a','school-b','students','student-1')));
  await assertFails(getDoc(schoolDoc('viewer-a','school-b','students','student-1')));
  await assertSucceeds(getDoc(schoolDoc('viewer-a','school-a','students','student-1')));
  await assertFails(setDoc(schoolDoc('viewer-a','school-a','students','student-2'),valid));
  await assertFails(setDoc(schoolDoc('teacher-a','school-a','students','student-2'),valid));
  await assertSucceeds(setDoc(schoolDoc('admin-a','school-a','students','student-2'),valid));
  await assertFails(setDoc(schoolDoc('admin-a','school-a','students','student-3'),{...valid,schoolId:'school-b'}));
  await assertFails(setDoc(schoolDoc('admin-a','school-a','students','student-4'),{name:'X',class:'9',schoolId:'school-a'}));
  await assertFails(updateDoc(schoolDoc('admin-a','school-a','students','student-2'),{schoolId:'school-b'}));
  await assertFails(deleteDoc(schoolDoc('admin-a','school-a','students','student-2')));
  await assertSucceeds(getDoc(schoolDoc('super-a','school-b','students','student-1')));
  await assertFails(getDoc(schoolDoc('outsider','school-a','students','student-1')));
  console.log('V47 emulator isolation and role checks passed');
} finally {await env.cleanup();}
