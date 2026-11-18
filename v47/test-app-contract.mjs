import assert from 'node:assert/strict';
import {COLLECTIONS,schoolCollectionPath,schoolDocumentPath} from './school-paths.mjs';
import {validateStudent} from './student-validation.mjs';
import {validateMarkEntry,markEntryId} from './marks-service.mjs';
import {validateAttendance} from './attendance-service.mjs';
import {assignmentRecord,assignmentKey} from './teacher-assignment.mjs';

const sid='school-a';
for(const collection of ['students','staff','classes','subjects','subject_assignments','teacher_assignments','component_marks','exams','marks','attendance','mark_settings','school_settings','members']){
 assert.ok(COLLECTIONS.includes(collection),collection+' missing');
 assert.equal(schoolCollectionPath(sid,collection),'schools/'+sid+'/'+collection);
 assert.equal(schoolDocumentPath(sid,collection,'id_1'),'schools/'+sid+'/'+collection+'/id_1');
}
assert.deepEqual(validateStudent({name:'Student One',class:'9',rollNo:''}),{name:'Student One',class:'9'});
assert.equal(markEntryId({studentId:'student-1',subjectId:'math',class:'9',term:'1st',theory:20,practical:10}),'1st:student-1:math');
assert.deepEqual(validateAttendance({studentId:'student-1',class:'9',date:'2026-11-18',present:true}),{date:'2026-11-18',studentId:'student-1',class:'9',present:true});
assert.deepEqual(assignmentRecord({schoolId:sid,uid:'teacher-1',classId:'9',subjectId:'math'}),{schoolId:sid,uid:'teacher-1',classId:'9',subjectId:'math',active:false});
assert.equal(assignmentKey({schoolId:sid,uid:'teacher-1',classId:'9',subjectId:'math'}),'school-a:teacher-1:9:math');
for(const collection of ['unscoped','../marks',''])assert.throws(()=>schoolCollectionPath(sid,collection));
console.log('V47 app schema and school path contract checks passed');
