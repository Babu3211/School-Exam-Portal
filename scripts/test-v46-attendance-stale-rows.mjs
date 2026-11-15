import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const start=html.indexOf('async function loadAttendanceStudentsForDay(){');
const end=html.indexOf('\nfunction attendanceCurrentRows()',start);
assert.ok(start>=0&&end>start,'Attendance student selector exists');
const fn=html.slice(start,end);
for(const condition of ['!key.date||!key.className','key.type==="subject"&&!key.subject']){
 const i=fn.indexOf('if('+condition+'){');
 assert.ok(i>=0,'Validation condition retained: '+condition);
 const block=fn.slice(i,fn.indexOf('return}',i)+7);
 assert.ok(block.includes('body.innerHTML=""'),'Invalid selection must clear previous students');
 assert.ok(block.includes('updateAttendanceCounts()'),'Invalid selection must reset attendance counts');
}
assert.ok(fn.includes('renderAttendanceStudents(existing?.students||[])'),'Valid selection must still show saved records');
console.log('V46 Attendance invalid selection clears stale student rows.');
