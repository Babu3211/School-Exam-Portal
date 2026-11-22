import assert from 'node:assert/strict';
import {createSubjectAssignment} from './assignment-create-service.mjs';
const schoolId='123456789',actor={uid:'admin_1',role:'school_admin',active:true,schoolId};
const docs=new Map([
 ['schools/'+schoolId+'/students/student_1',{schoolId,class:'9',name:'Student'}],
 ['schools/'+schoolId+'/subjects/subject_1',{schoolId,class:'9',active:true,name:'Computer'}]
]);
const writes=[];
const api={
 doc:(_db,...parts)=>parts.join('/'),
 runTransaction:async(_db,callback)=>callback({
  get:async path=>({exists:()=>docs.has(path),data:()=>docs.get(path)}),
  set:(path,data)=>writes.push({path,data})
 })
};
const input={studentId:'student_1',subjectId:'subject_1',class:'9'};
const create=(changes={})=>createSubjectAssignment({db:{},api,actor,schoolId,input,...changes});
const saved=await create();
assert.equal(saved.studentId,input.studentId);
assert.equal(writes.length,1);
assert.equal(writes[0].data.schoolId,schoolId,'Assignment must be tenant scoped');
writes.length=0;
docs.set('schools/'+schoolId+'/students/student_1',{schoolId:'987654321',class:'9'});
await assert.rejects(create(),/Student missing or wrong class/);
assert.equal(writes.length,0);
docs.set('schools/'+schoolId+'/students/student_1',{schoolId,class:'9'});
docs.set('schools/'+schoolId+'/subjects/subject_1',{schoolId:'987654321',class:'9',active:true});
await assert.rejects(create(),/Subject missing/);
assert.equal(writes.length,0);
docs.set('schools/'+schoolId+'/subjects/subject_1',{schoolId,class:'9',active:true});
await assert.rejects(create({actor:{...actor,uid:''}}),/UID required/);
await assert.rejects(create({actor:{...actor,role:'viewer'}}),/School Admin required/);
assert.equal(writes.length,0);
console.log('PASS: assignment transaction enforces tenant and verified actor identity');
