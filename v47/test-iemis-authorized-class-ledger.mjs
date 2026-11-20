import assert from 'node:assert/strict';
import {iemisEntrySchema,iemisEntryValues} from '../iemis-entry.js';
import {renderAuthorizedV46ClassGradeLedger} from './iemis-authorized-class-ledger.mjs';
import {renderCompleteV46TenantGradeLedger} from './iemis-v46-ledger-adapter.mjs';
const schoolId='test_school_001',examId='exam_1',students=[{id:'s1',schoolId,name:'First Student'},{id:'s2',schoolId,name:'Second Student'}],subjects=['English','Nepali'];
for(const classNo of [1,2,3,4,5,6,7,8,9,10])for(const term of ['1st','2nd','3rd','final']){
 const records=students.flatMap(student=>subjects.map(subject=>{
  const schema=iemisEntrySchema(classNo,term==='final'?'annual':term==='1st'?'first':term==='2nd'?'second':'third',subject);
  const values=Object.fromEntries(schema.filter(c=>!c.readonly).map(c=>[c.key,c.key==='count'?'10':c.key==='obtained'?'36':String(c.max)]));
  return {...iemisEntryValues(schema,{values,isAbsent:false,incompatible:false}),schoolId,examId,studentId:student.id,subject};
 }));
 const args={schoolId,schoolName:'Test School',classNo,term,examId,students,subjects,records};
 assert.deepEqual(renderAuthorizedV46ClassGradeLedger(args),renderCompleteV46TenantGradeLedger(args));
 assert.throws(()=>renderAuthorizedV46ClassGradeLedger({...args,records:records.slice(1)}),/Complete class component marks required/);
 assert.throws(()=>renderAuthorizedV46ClassGradeLedger({...args,records:[records[0],records[0],...records.slice(2)]}),/duplicate class component record/);
 assert.throws(()=>renderAuthorizedV46ClassGradeLedger({...args,records:records.map((r,i)=>i===0?{...r,schoolId:'another_school'}:r)}),/not compatible/);
 assert.throws(()=>renderAuthorizedV46ClassGradeLedger({...args,records:records.map((r,i)=>i===0?{...r,scores:undefined,theory:35,practical:15}:r)}),/not compatible/);
 assert.throws(()=>renderAuthorizedV46ClassGradeLedger({...args,students:students.map((s,i)=>i===0?{...s,schoolId:'another_school'}:s)}),/cross-school/);
}
console.log('V47 authorized class-wide IEMIS ledger: 40 class/term cases, complete 2-student 2-subject snapshots, and fail-closed security checks passed');
