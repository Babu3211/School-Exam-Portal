import assert from 'node:assert/strict';
import {iemisLedger} from '../iemis-ledger.js';
import {renderV46TenantLedger} from './iemis-v46-ledger-adapter.mjs';
const schoolId='test_school_001',examId='term_1';
const students=[{id:'s1',schoolId,nameEnglish:'Test Student'}];
const subjects=['English'];
const records=[{studentId:'s1',schoolId,examId,subject:'English',scores:[]}];
for(const classNo of [1,2,3,4,5,6,7,8,9,10])for(const mode of ['number','grade','entry'])for(const term of ['1st','2nd','3rd','final']){
 const args={schoolId,schoolName:'School',schoolCode:'001',classNo,term,mode,subjects,students,records,examId};
 const actual=renderV46TenantLedger(args);
 const expected=iemisLedger({mode,classNo,annual:term==='final',subjects,students,records,examId,schoolName:'School',schoolCode:'001'});
 assert.deepEqual(actual,expected);
}
const args={schoolId,schoolName:'School',classNo:6,term:'final',subjects,students,records,examId};
assert.throws(()=>renderV46TenantLedger({...args,schoolId:'other_school'}),/Cross-school/);
assert.throws(()=>renderV46TenantLedger({...args,records:[{...records[0],schoolId:'other_school'}]}),/Cross-school/);
assert.throws(()=>renderV46TenantLedger({...args,records:[{...records[0],studentId:'foreign'}]}),/Foreign student/);
assert.throws(()=>renderV46TenantLedger({...args,students:[...students,...students]}),/Duplicate student/);
assert.throws(()=>renderV46TenantLedger({...args,term:'weekly'}),/Unsupported/);
assert.throws(()=>renderV46TenantLedger({...args,mode:'unknown'}),/Invalid ledger mode/);
console.log('V47 tenant-scoped V46 IEMIS renderer parity passed for 120 class/mode/term cases and isolation');
