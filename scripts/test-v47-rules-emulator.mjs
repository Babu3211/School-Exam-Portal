import assert from 'node:assert/strict';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {readFileSync} from 'node:fs';
const projectId='v47-isolation-test';
const env=await initializeTestEnvironment({projectId,firestore:{rules:readFileSync('v47/firestore.rules','utf8'),host:'127.0.0.1',port:8081}});
try{
 await env.withSecurityRulesDisabled(async ctx=>{
  const db=ctx.firestore();
  await db.doc('v47_super_admins/super1').set({active:true});
  await db.doc('schools/school_001').set({name:'A'});
  await db.doc('schools/school_002').set({name:'B'});
  await db.doc('schools/school_001/members/adminA').set({uid:'adminA',schoolId:'school_001',role:'school_admin',active:true});
  await db.doc('schools/school_001/members/viewerA').set({uid:'viewerA',schoolId:'school_001',role:'viewer',active:true});
  await db.doc('schools/school_001/students/s1').set({name:'A Student'});
  await db.doc('schools/school_002/students/s2').set({name:'B Student'});
 });
 const admin=env.authenticatedContext('adminA').firestore();
 const viewer=env.authenticatedContext('viewerA').firestore();
 const superDb=env.authenticatedContext('super1').firestore();
 const outsider=env.authenticatedContext('outsider').firestore();
 await assertSucceeds(admin.doc('schools/school_001/students/s1').get());
 await assertFails(admin.doc('schools/school_002/students/s2').get());
 await assertSucceeds(admin.doc('schools/school_001/students/new').set({name:'N'}));
 await assertSucceeds(viewer.doc('schools/school_001/students/s1').get());
 await assertFails(viewer.doc('schools/school_001/students/new').set({name:'N'}));
 await assertFails(viewer.doc('schools/school_002/students/s2').get());
 await assertFails(outsider.doc('schools/school_001/students/s1').get());
 await assertSucceeds(superDb.doc('schools/school_002/students/s2').get());
 await assertFails(admin.doc('students/legacy').get());
 await assertFails(admin.doc('schools/school_002/members/another').set({uid:'another',schoolId:'school_002',role:'viewer',active:true}));
 console.log('V47 cross-school emulator access tests passed');
}finally{await env.cleanup();}
