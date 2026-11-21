import assert from 'node:assert/strict';
import {EXAM_TERMS,validateExamTerm} from './term-catalog.mjs';
import {validateMarkEntry,markEntryId} from './marks-service.mjs';
import {validateCompleteClassMarks} from './class-mark-completeness.mjs';
import {schoolDocumentPath} from './school-paths.mjs';
assert.deepEqual(EXAM_TERMS,['weekly','monthly','1st','2nd','3rd','final']);
const markPaths=new Set();
for(const term of EXAM_TERMS){
 assert.equal(validateExamTerm(term),term);
 const entry={studentId:'student_1',subjectId:'math',class:'9',term,theory:30,practical:10};
 assert.equal(validateMarkEntry(entry).term,term);
 assert.equal(markEntryId(entry),`${term}:student_1:math`);
 const schoolA=schoolDocumentPath('12345678','marks',markEntryId(entry));
 const schoolB=schoolDocumentPath('87654321','marks',markEntryId(entry));
 assert.notEqual(schoolA,schoolB,'Marks must be isolated by school');
 assert.ok(!markPaths.has(schoolA),'Distinct exam terms must not overwrite marks');
 markPaths.add(schoolA);
 const full={schoolId:'12345678',classId:'9',term,subjectId:'math',expectedStudentIds:['student_1','student_2']};
 assert.equal(validateCompleteClassMarks({...full,entries:[entry,{...entry,studentId:'student_2'}]}).count,2);
 assert.throws(()=>validateCompleteClassMarks({...full,entries:[entry]}),/Cannot save: 1 students/);
 assert.throws(()=>validateCompleteClassMarks({...full,entries:[entry,{...entry,studentId:'student_2',term:'1st'===term?'2nd':'1st'}]}),/Mixed class, term or subject/);
}
assert.equal(markPaths.size,EXAM_TERMS.length);
for(const term of ['',null,'third','3rd term','annual','Weekly'])assert.throws(()=>validateExamTerm(term),/Unsupported exam term/);
console.log('V47 six exam term validation checks passed');
