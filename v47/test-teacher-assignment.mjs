import assert from 'node:assert/strict';
import {assignmentRecord,assignmentKey} from './teacher-assignment.mjs';
const args={schoolId:'12345678',uid:'teacher1',classId:'9',subjectId:'computer'};
assert.equal(assignmentKey(args),'12345678:teacher1:9:computer');
assert.equal(assignmentRecord(args).active,false);
for(const classId of ['ECD','LKG','UKG',...Array.from({length:12},(_,i)=>String(i+1))]){
 assert.equal(assignmentRecord({...args,classId}).classId,classId);
}
assert.throws(()=>assignmentRecord({...args,classId:'13'}));
assert.equal(assignmentRecord({...args,uid:'u'}).uid,'u');
assert.equal(assignmentRecord({...args,uid:'u'.repeat(128)}).uid,'u'.repeat(128));
assert.throws(()=>assignmentRecord({...args,uid:'u'.repeat(129)}),TypeError);
assert.throws(()=>assignmentRecord({...args,uid:'../other'}),TypeError);
assert.throws(()=>assignmentRecord({...args,schoolId:'../87654321'}));
console.log('V47 assignment validation tests passed');
