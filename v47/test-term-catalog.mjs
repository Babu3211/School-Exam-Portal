import assert from 'node:assert/strict';
import {EXAM_TERMS,validateExamTerm} from './term-catalog.mjs';
import {validateMarkEntry,markEntryId} from './marks-service.mjs';
import {validateCompleteClassMarks} from './class-mark-completeness.mjs';
assert.deepEqual(EXAM_TERMS,['weekly','monthly','1st','2nd','3rd','final']);
for(const term of EXAM_TERMS){
 assert.equal(validateExamTerm(term),term);
 const entry={studentId:'student_1',subjectId:'math',class:'9',term,theory:30,practical:10};
 assert.equal(validateMarkEntry(entry).term,term);
 assert.equal(markEntryId(entry),`${term}:student_1:math`);
 const full={schoolId:'school-a',classId:'9',term,subjectId:'math',expectedStudentIds:['student_1','student_2']};
 assert.equal(validateCompleteClassMarks({...full,entries:[entry,{...entry,studentId:'student_2'}]}).count,2);
 assert.throws(()=>validateCompleteClassMarks({...full,entries:[entry]}),/Cannot save: 1 students/);
 assert.throws(()=>validateCompleteClassMarks({...full,entries:[entry,{...entry,studentId:'student_2',term:'1st'===term?'2nd':'1st'}]}),/Mixed class, term or subject/);
}
for(const term of ['',null,'third','3rd term','annual','Weekly'])assert.throws(()=>validateExamTerm(term),/Unsupported exam term/);
console.log('V47 six exam term validation checks passed');
