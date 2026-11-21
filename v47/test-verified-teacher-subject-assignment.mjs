import assert from 'node:assert/strict';
import {verifyTeacherSubjectAssignment} from './verified-teacher-subject-assignment.mjs';
const actor={uid:'teacher1',role:'teacher',active:true,schoolId:'12345'};
let current={schoolId:'12345',uid:'teacher1',classId:'9',subjectId:'math',active:true};
let exists=true,reads=0,revalidations=0;
const api={doc:(_db,...parts)=>parts.join('/'),getDoc:async path=>{reads++;assert.equal(path,'schools/12345/teacher_assignments/12345:teacher1:9:math');return {exists:()=>exists,data:()=>current}}};
const base={db:{},api,actor,schoolId:'12345',classId:'9',subjectId:'math',revalidate:async()=>{revalidations++}};
const result=await verifyTeacherSubjectAssignment(base);
assert.equal(result.verified,true);
assert.equal(result.writeAuthorized,false);
assert.equal(result.publicationAllowed,false);
assert.equal(reads,1);
assert.equal(revalidations,2);
exists=false;
await assert.rejects(()=>verifyTeacherSubjectAssignment(base),/no verified assignment/);
exists=true;
for(const bad of [
 {...current,active:false},
 {...current,schoolId:'98765'},
 {...current,uid:'other'},
 {...current,classId:'10'},
 {...current,subjectId:'science'}
]){current=bad;await assert.rejects(()=>verifyTeacherSubjectAssignment(base),/inactive or mismatched/)}
current={schoolId:'12345',uid:'teacher1',classId:'9',subjectId:'math',active:true};
for(const badActor of [
 {...actor,role:'viewer'},
 {...actor,role:'school_admin'},
 {...actor,active:false},
 {...actor,schoolId:'98765'}
])await assert.rejects(()=>verifyTeacherSubjectAssignment({...base,actor:badActor}),/Active school teacher/);
await assert.rejects(()=>verifyTeacherSubjectAssignment({...base,schoolId:'98765'}));
await assert.rejects(()=>verifyTeacherSubjectAssignment({...base,classId:'13'}));
await assert.rejects(()=>verifyTeacherSubjectAssignment({...base,subjectId:'../marks'}));
await assert.rejects(()=>verifyTeacherSubjectAssignment({...base,revalidate:async()=>{throw new Error('revoked')}}),/revoked/);
let changed={...actor};
await assert.rejects(()=>verifyTeacherSubjectAssignment({...base,actor:changed,revalidate:async()=>{changed.active=false}}),/Teacher session changed/);
console.log('V47 tenant teacher assignment verification is read-only and fail-closed');
