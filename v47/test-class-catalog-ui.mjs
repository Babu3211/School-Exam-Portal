import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SCHOOL_CLASSES,validSchoolClass} from './class-catalog.mjs';
import {validateStudent} from './student-validation.mjs';
import {validateAttendance} from './attendance-service.mjs';
import {validateSchoolSubject} from './subject-validation.mjs';
assert.deepEqual(SCHOOL_CLASSES,['ECD','LKG','UKG',...Array.from({length:12},(_,i)=>String(i+1))]);
for(const cls of SCHOOL_CLASSES){
 assert.equal(validSchoolClass(cls),true);
 assert.equal(validateStudent({name:'Test Student',class:cls}).class,cls);
 assert.equal(validateAttendance({date:'2026-11-18',studentId:'student_1',class:cls,present:true}).class,cls);
 assert.equal(validateSchoolSubject({id:'subject_1',name:'English',class:cls,creditHour:4,theoryFullMarks:60,practicalFullMarks:40}).class,cls);
}
for(const name of ['students.html','attendance.html','marks-entry.html','subjects.html','marks-preview.html','assignments.html']){
 const html=readFileSync(new URL('./'+name,import.meta.url),'utf8');
 assert.match(html,/LKG/);assert.match(html,/UKG/);assert.match(html,/ECD/);assert.match(html,/<option(?:\s+[^>]*)?>12<\/option>/);
}
console.log('V47 class catalog and six screen options validated');
