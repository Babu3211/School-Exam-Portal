import assert from 'node:assert/strict';
import {iemisLedger,iemisSummary} from '../iemis-ledger.js';
import {iemisEntrySchema,iemisEntryValues} from '../iemis-entry.js';
import {renderV46TenantLedger,renderCompleteV46TenantGradeLedger} from './iemis-v46-ledger-adapter.mjs';
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
assert.throws(()=>renderV46TenantLedger({...args,schoolCode:123}),/Invalid school code/);
assert.throws(()=>renderV46TenantLedger({...args,schoolName:'x'.repeat(161)}),/Invalid school name/);
assert.throws(()=>renderV46TenantLedger({...args,subjects:[null]}),/Invalid subject roster/);
assert.throws(()=>renderV46TenantLedger({...args,records:[...records,{...records[0]}]}),/Duplicate student subject marks/);
assert.throws(()=>renderV46TenantLedger({...args,records:[...records,{...records[0],subject:'ENGLISH'}]}),/Duplicate student subject marks/);
assert.throws(()=>renderV46TenantLedger({...args,records:[{...records[0],subject:''}]}),/Record subject required/);
assert.throws(()=>renderV46TenantLedger({...args,records:[{...records[0],schoolId:undefined}]}),/Cross-school/);
assert.throws(()=>renderV46TenantLedger({...args,students:[{...students[0],schoolId:undefined}]}),/Cross-school/);
assert.throws(()=>renderV46TenantLedger({...args,records:[{...records[0],examId:'other_exam'}]}),/Foreign student or exam record/);
assert.throws(()=>renderV46TenantLedger({...args,students:[{...students[0],id:''}]}),/Student ID required/);
assert.throws(()=>renderV46TenantLedger({...args,schoolId:'../other_school'}),/Valid school scope required/);
assert.throws(()=>renderCompleteV46TenantGradeLedger(args),/Class marks incomplete/);
assert.throws(()=>renderCompleteV46TenantGradeLedger({...args,subjects:['English','Nepali']}),/Class marks incomplete/);
assert.throws(()=>renderCompleteV46TenantGradeLedger({...args,subjects:['English','ENGLISH']}),/duplicate subject roster/);
assert.throws(()=>renderCompleteV46TenantGradeLedger({...args,schoolId:'another_school'}),/Cross-school/);
// Complete primary-school IEMIS scores must unlock the actual V46 renderer, not a mock grade.
for(const classNo of [1,2,3,4,5])for(const [term,v46term] of [['1st','first'],['2nd','second'],['3rd','third'],['final','annual']]){
 const schema=iemisEntrySchema(classNo,v46term,'English');
 const values=Object.fromEntries(schema.filter(field=>!field.readonly).map(field=>[field.key,field.key==='count'?'10':field.key==='obtained'?'35':String(field.max)]));
 const record=iemisEntryValues(schema,values);
 assert.equal(iemisSummary(record,{annual:term==='final',primary:true}).complete,true);
 const completeArgs={...args,classNo,term,records:[{...record,schoolId,studentId:'s1',examId,subject:'English'}]};
 const actual=renderCompleteV46TenantGradeLedger(completeArgs);
 const expected=renderV46TenantLedger({...completeArgs,mode:'grade'});
 assert.deepEqual(actual,expected);
 assert.match(actual.body,/<tr>/);
}
console.log('V47 tenant-scoped V46 IEMIS renderer parity, complete primary-grade cases and isolation passed');
