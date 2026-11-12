import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const start=html.indexOf('function renderAttendanceStudents(saved=[]){');
const end=html.indexOf('\nfunction attendanceSetToday()',start);
assert.ok(start>=0&&end>start,'Attendance student renderer must exist');
const source=html.slice(start,end);
for(const [code,label] of [['present','Present'],['absent','Absent'],['leave','Leave']]){
 assert.ok(source.includes('value="'+code+'"'),'Stored attendance status code must remain '+code);
 assert.ok(source.includes('>'+label+'</option>'),'English status label must appear for '+code);
}
assert.ok(source.includes('placeholder="Remarks"'),'English remarks placeholder required');
assert.ok(source.includes('No active students found in this class.'),'English empty class message required');
assert.ok(source.includes('canonicalStudentClass(x.class??x.className??\'\')===canonicalStudentClass(cl)'),'Legacy class matching must remain');
console.log('V46 Attendance English status labels preserve saved codes.');
