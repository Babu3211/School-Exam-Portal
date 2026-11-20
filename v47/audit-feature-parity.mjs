import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=dirname(fileURLToPath(import.meta.url));
const read=p=>readFileSync(resolve(root,p),'utf8');
const has=p=>existsSync(resolve(root,p));
const html=read('index.html'), rules=read('firestore.rules'), hosting=JSON.parse(read('firebase.json'));
const block=name=>rules.split('match /'+name+'/{id} {')[1]?.split('match /')[0]??'';
const rawMarks=block('marks'),computerMarks=block('component_marks');
const writable=section=>[...section.matchAll(/allow\\s+([^:;]+):\\s*if\\s+([^;]+);/g)].some(m=>m[1].split(',').some(p=>['write','create','update','delete'].includes(p.trim()))&&m[2].trim()!=='false');
const checks=[
 ['01','V47 landing is integrated portal',!/development hub|independent prototypes|development only/i.test(html)],
 ['02','Super Admin UI exists',has('admin.html')],
 ['03','School Admin UI exists',has('school-admin.html')],
 ['04','Student management UI exists',has('students.html')],
 ['05','Attendance UI exists',has('attendance.html')],
 ['06','Exam management UI exists',has('exams.html')],
 ['07','Marks entry UI exists',has('marks-entry.html')],
 ['08','Computer marks UI exists',has('computer-marks.html')],
 ['09','Academic records UI exists',has('records.html')],
 ['10','Teacher assignment UI exists',has('teacher-assignments.html')],
 ['11','Official grade ledger UI exists',has('grade-ledger.html')],
 ['12','Official grade sheet UI exists',has('grade-sheet.html')],
 ['13','Hosting output has index',typeof hosting.hosting?.public==='string'&&has(hosting.hosting.public+'/index.html')],
 ['14','Marks writes enabled',writable(rawMarks)],
 ['15','Computer marks writes enabled',writable(computerMarks)]
];
let blockers=0;
for(const [id,label,pass] of checks){console.log((pass?'PRESENT':'BLOCKED')+' '+id+' '+label);if(!pass)blockers++;}
console.log('V47 readiness audit: '+(checks.length-blockers)+' present, '+blockers+' blocked out of '+checks.length);
if(blockers)process.exitCode=1;
