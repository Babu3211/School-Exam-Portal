import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const start=html.indexOf('async function loadAttendanceStudentsForDay(){');
const end=html.indexOf('\nfunction attendanceCurrentRows()',start);
assert.ok(start>=0&&end>start,'Attendance student selection function exists');
const fn=html.slice(start,end);
for(const msg of ['Select a valid Nepali (BS) date and class.','Select a subject.','Attendance already exists for this date, class and subject.','Student list could not load: ']){
 assert.ok(fn.includes(msg),'English attendance message missing: '+msg);
}
assert.ok(fn.includes('canonicalStudentClass(x.className)===canonicalStudentClass(key.className)'),'Historical class matching preserved');
assert.ok(fn.includes('renderAttendanceStudents(existing?.students||[])'),'Historical saved attendance preserved');
for(const mutation of ['setDoc(', 'updateDoc(', 'addDoc(', 'deleteDoc('])assert.ok(!fn.includes(mutation),'Student selection must not write data');
console.log('V46 Attendance student selection English messages and historical data matching verified structurally.');
