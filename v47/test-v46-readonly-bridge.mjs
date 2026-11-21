import assert from 'node:assert/strict';
import {createV46ReadOnlyBridge} from './v46-readonly-bridge.mjs';
const schoolId='12345678',uid='teacher123';
const auth={currentUser:{uid}};
const calls=[];
const firestoreApi={
 doc:(_db,...path)=>{calls.push(['doc',...path]);return path},
 collection:(_db,...path)=>{calls.push(['collection',...path]);return path},
 getDoc:async path=>({exists:()=>true,data:()=>path.length===2?{id:schoolId,active:true}:{uid,schoolId,role:'viewer',active:true},path}),
 getDocs:async path=>({docs:[],path})
};
const bridge=await createV46ReadOnlyBridge({schoolId,auth,db:{},firestoreApi});
assert.equal(bridge.role,'viewer');
for(const [method,collection] of Object.entries({listStudents:'students',listStaff:'staff',listSubjects:'subjects',listExams:'exams',listAttendance:'attendance',listMarks:'marks'})){
 assert.deepEqual((await bridge[method]()).path,['schools',schoolId,collection]);
}
assert.deepEqual((await bridge.getStudent('stu1')).path,['schools',schoolId,'students','stu1']);
assert.deepEqual((await bridge.getStaff('staff1')).path,['schools',schoolId,'staff','staff1']);
assert.deepEqual((await bridge.getSchoolSettings('default')).path,['schools',schoolId,'school_settings','default']);
assert.equal(Object.isFrozen(bridge),true);
assert.equal(Object.hasOwn(bridge,'saveMarks'),false);
assert.equal(Object.hasOwn(bridge,'deleteStudent'),false);
assert.ok(calls.every(([kind,...path])=>path[0]==='schools'&&path[1]===schoolId));
await assert.rejects(createV46ReadOnlyBridge({schoolId,auth:{currentUser:null},db:{},firestoreApi}),/Authenticated V47/);
auth.currentUser={uid:'anotherUser'};
await assert.rejects(bridge.listStudents(),/Authentication changed/);
console.log('V46 read-only V47 bridge tests passed');
