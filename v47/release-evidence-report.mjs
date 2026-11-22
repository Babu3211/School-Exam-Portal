import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
const root=dirname(fileURLToPath(import.meta.url));
const read=(name)=>readFileSync(join(root,name),'utf8');
const hub=read('index.html'),marks=read('marks-entry.html'),rules=read('firestore.rules'),hosting=JSON.parse(read('firebase.json'));
const checks=[
 ['V46 dashboard parity',!/development workspace|independent prototypes|Development Hub/i.test(hub),'V47 dashboard explicitly remains a development workspace'],
 ['Official marks save',!/Save\/Publish unavailable|Save\/Publish is disabled|Individual Save disabled/i.test(marks),'Marks page disables official Save/Publish'],
 ['CDC/IEMIS official grading',!/NOT verified CDC\/IEMIS|NOT a CDC\/IEMIS result/i.test(marks),'Marks page disclaims CDC/IEMIS verification'],
 ['Hosting target',hosting.hosting?.public==='dist','V47 Hosting must point at dist'],
 ['School-scoped security rules',/function activeMember\(sid\)/.test(rules)&&/function canRead\(sid\)/.test(rules),'School membership and scoped read helpers must exist']
];
const students=read('students.html'),attendance=read('attendance.html'),admin=read('admin.html'),schoolAdmin=read('school-admin.html'),exams=read('exams.html'),reports=read('report-preview.html'),manifest=JSON.parse(read('manifest.webmanifest'));
checks.push(
 ['Student entry exists',/Save Student/.test(students),'Student entry form not found'],
 ['Student Excel preview',/Excel Preview/.test(students),'V46-compatible student Excel preview not found'],
 ['Attendance school scope',/school-scoped attendance/i.test(attendance),'Attendance school-scope evidence missing'],
 ['Attendance atomic save',!/failure can leave earlier chunks saved/i.test(attendance),'Partial attendance saves are explicitly possible'],
 ['Super Admin school registration',/Register inactive school and Admin/.test(admin),'Super Admin registration form missing'],
 ['IEMIS school identity',/IEMIS Code \(must match School ID\)/.test(admin),'IEMIS school ID validation UI missing'],
 ['Teacher and Viewer roles',/value="teacher"/.test(schoolAdmin)&&/value="viewer"/.test(schoolAdmin),'Teacher/Viewer management missing'],
 ['All required exam terms', ['Weekly','Monthly','1st','2nd','3rd','Final'].every(x=>exams.includes(x)),'One or more exam terms missing'],
 ['Official grade sheet',!/Official grade sheets, printing and publication are disabled/i.test(reports),'Official grade sheet/print still disabled'],
 ['Production PWA identity',!/Development|Dev/.test(manifest.name+' '+manifest.short_name),'PWA manifest still development-branded']
);
// A green static check is only a presence indicator, never proof of working behavior.
const attendanceJs=read('attendance-console.mjs');
checks.push(
 ['Attendance defaults to Nepal date',/\$\('date'\)\.value=nepalGregorianDate\(\)/.test(attendanceJs),'Attendance default date is not initialized'],
 ['Attendance teacher assignment gate',/saveAssignedTeacherAttendance/.test(attendanceJs),'Assigned teacher attendance service not connected'],
 ['Attendance partial-save warning',/partial.save|chunks of 10/i.test(attendance),'Partial-save risk must be disclosed'],
 ['Viewer attendance read-only',/Viewer is read-only/.test(attendance),'Viewer read-only disclosure missing'],
 ['Student roll number optional',/Roll Number \(optional\)/.test(students),'Student roll number is unexpectedly required'],
 ['ECD and Classes 11–12', ['ECD','11','12'].every(x=>students.includes('value="'+x+'"')),'Student class options incomplete']
);
const blocked=checks.filter(([,pass])=>!pass);
const report={project:'SMSS V47',branch:'smss-v47-multischool-work',productionReady:false,checks:checks.map(([name,pass,reason])=>({name,status:pass?'STATIC_CHECK_OK':'BLOCKED',reason:pass?'Static evidence only; not a runtime test':reason})),blockingCount:blocked.length};
console.log(JSON.stringify(report,null,2));
// A zero-blocker static scan cannot certify the live portal, Firestore
// publication, emulator behavior, or V46 feature parity. Fail closed until
// independently verified runtime evidence and release approval exist.
if(!report.productionReady)process.exitCode=1;
