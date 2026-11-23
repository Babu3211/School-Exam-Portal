// Live Firebase Emulator integration, not a mock. This exercise performs a
// 1,500-student school-admin DRAFT transaction through real Firestore Rules.
// It NEVER writes official marks, results or any production project.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import * as api from 'firebase/firestore';
import {saveVerifiedCompleteClassDraft} from './save-verified-class-draft.mjs';
import {verifyStoredCompleteClassDraft} from './restore-complete-class-draft.mjs';
const rules=readFileSync(new URL('./firestore.rules',import.meta.url),'utf8');
const projectId='smss-v47-class-draft-integration';
const env=await initializeTestEnvironment({
 projectId,firestore:{rules,host:'127.0.0.1',port:8187}
});
const schoolId='12345678',otherSchool='87654321',uid='admin_'+schoolId,
      classId='9',subjectId='computer',examId='final',settingsId='9_computer_final';
const actor={uid,schoolId,role:'school_admin',active:true};
const settings={id:settingsId,schoolId,classId,subjectId,examId,active:true,
 components:[{key:'internal',name:'Internal',fullMarks:4},
 {key:'practical',name:'Practical',fullMarks:36},
 {key:'term',name:'Term',fullMarks:10}]};
const ids=Array.from({length:1500},(_,i)=>'s'+String(i+1).padStart(4,'0'));
const marks=ids.map(studentId=>({studentId,values:{internal:4,practical:36,term:10}}));
const target=(db,sid=schoolId)=>api.doc(db,'schools',sid,'class_mark_drafts',settingsId);
try{
 await env.withSecurityRulesDisabled(async context=>{
  const seedDb=context.firestore();
  await api.setDoc(api.doc(seedDb,'schools',schoolId),{
   id:schoolId,name:'Emulator School',iemisCode:schoolId,active:true
  });
  await api.setDoc(api.doc(seedDb,'schools',otherSchool),{
   id:otherSchool,name:'Other School',iemisCode:otherSchool,active:true
  });
  for(const [user,role] of [[uid,'school_admin'],['viewer_'+schoolId,'viewer'],['teacher_'+schoolId,'teacher']]){
   await api.setDoc(api.doc(seedDb,'schools',schoolId,'members',user),{uid:user,schoolId,role,active:true});
  }
  await api.setDoc(api.doc(seedDb,'schools',otherSchool,'members','admin_'+otherSchool),{
   uid:'admin_'+otherSchool,schoolId:otherSchool,role:'school_admin',active:true
  });
  await api.setDoc(api.doc(seedDb,'schools',schoolId,'subjects',subjectId),{
   schoolId,class:classId,name:'Computer',active:true
  });
  await api.setDoc(api.doc(seedDb,'schools',schoolId,'mark_settings',settingsId),settings);
  for(let start=0;start<ids.length;start+=400){
   const batch=api.writeBatch(seedDb);
   for(const studentId of ids.slice(start,start+400)){
    batch.set(api.doc(seedDb,'schools',schoolId,'students',studentId),{
     name:'Student '+studentId,schoolId,class:classId,active:true
    });
   }
   await batch.commit();
  }
 });
 const db=env.authenticatedContext(uid).firestore();
 const auth={currentUser:{uid}};
 const context={db,api,auth,actor,schoolId,classId,subjectId,examId,drafts:marks};
 const first=await saveVerifiedCompleteClassDraft(context);
 assert.equal(first.savedDraft,true);
 assert.equal(first.rosterCount,1500);
 assert.equal(first.revision,1);
 assert.equal(first.officialMarksWritten,false);
 assert.equal(first.publicationAllowed,false);
 const stored=(await api.getDoc(target(db))).data();
 assert.equal(stored.entries.length,1500);
 assert.equal(stored.revision,1);
 const verified=verifyStoredCompleteClassDraft({
  schoolId,classId,subjectId,examId,settings:{...settings,settingsId},
  expectedStudentIds:ids,stored
 });
 assert.equal(verified.rosterCount,1500);
 assert.equal(verified.entries[0].totalObtained,50);
 const viewer=env.authenticatedContext('viewer_'+schoolId).firestore();
 const teacher=env.authenticatedContext('teacher_'+schoolId).firestore();
 const outsider=env.authenticatedContext('admin_'+otherSchool).firestore();
 await assertFails(api.getDoc(target(viewer)));
 await assertFails(api.getDoc(target(teacher)));
 await assertFails(api.getDoc(target(outsider)));
 await assertFails(api.getDocs(api.collection(viewer,'schools',schoolId,'class_mark_drafts')));
 const latest=await saveVerifiedCompleteClassDraft({...context,expectedRevision:1});
 assert.equal(latest.revision,2);
 await assert.rejects(saveVerifiedCompleteClassDraft({...context,expectedRevision:1}),/another session|changed/i);
 const updated=(await api.getDoc(target(db))).data();
 assert.equal(updated.revision,2);
 assert.equal(updated.entries.length,1500);
 // A Viewer cannot write any draft, and administrators cannot bypass tenant scope.
 await assertFails(api.setDoc(target(viewer),updated));
 await assertFails(api.setDoc(target(outsider),{...updated,schoolId:otherSchool}));
 await assertFails(api.updateDoc(target(db),{state:'published'}));
 await assertFails(api.deleteDoc(target(db)));
 const [raw,components]=await Promise.all([
  api.getDocs(api.collection(db,'schools',schoolId,'marks')),
  api.getDocs(api.collection(db,'schools',schoolId,'component_marks'))
 ]);
 assert.equal(raw.size,0,'No official raw marks may be written');
 assert.equal(components.size,0,'No official component marks may be written');
 console.log('PASS Firestore emulator: 1500-student real draft transaction, revision CAS, school privacy, zero official writes');
}finally{await env.cleanup();}
