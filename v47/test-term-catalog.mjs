import assert from 'node:assert/strict';
import {EXAM_TERMS,validateExamTerm} from './term-catalog.mjs';
import {validateMarkEntry,markEntryId} from './marks-service.mjs';
assert.deepEqual(EXAM_TERMS,['weekly','monthly','1st','2nd','3rd','final']);
for(const term of EXAM_TERMS){
 assert.equal(validateExamTerm(term),term);
 const entry={studentId:'student_1',subjectId:'math',class:'9',term,theory:30,practical:10};
 assert.equal(validateMarkEntry(entry).term,term);
 assert.equal(markEntryId(entry),`${term}:student_1:math`);
}
for(const term of ['',null,'third','3rd term','annual','Weekly'])assert.throws(()=>validateExamTerm(term),/Unsupported exam term/);
console.log('V47 six exam term validation checks passed');
