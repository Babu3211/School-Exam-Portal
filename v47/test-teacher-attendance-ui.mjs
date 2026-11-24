import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const js=readFileSync(new URL('./attendance-console.mjs',import.meta.url),'utf8');
const html=readFileSync(new URL('./attendance.html',import.meta.url),'utf8');
for(const token of [
 "import {saveAssignedTeacherAttendance} from './teacher-attendance-service.mjs'",
 "actor={role:session.role,active:true,schoolId:selectedSchool,uid}",
 "actor.role==='teacher'?await saveAssignedTeacherAttendance",
 "if(!['school_admin','teacher'].includes(actor?.role))",
 "if(canSelectRoster()){const select=document.createElement('select')",
 "teacherDuty.classId===$('schoolClass').value",
 "await saveTeacherClassAttendance({db,api,actor:selected,schoolId:sid,entries",
 "if(actor?.role!=='school_admin')throw new Error('School Admin required')"
])assert.ok(js.includes(token),'Missing teacher attendance UI contract: '+token);
assert.ok(js.includes("Present/Absent मात्र सच्याउन मिल्छ"),'Teacher correction confirmation missing');
assert.ok(js.includes("assertSession:()=>{if(auth?.currentUser?.uid!==uid"),'Teacher correction must check live session');
assert.ok(html.includes("may create or correct one student's Present/Absent"),'Assigned teacher correction notice missing');
assert.ok(js.includes("auth.currentUser.uid!==actor.uid"),'Authentication change protection missing');
for(const id of ['schoolClass','date','studentId','present'])assert.ok(js.includes("$('"+id+"').disabled=true"),'Save-time field lock missing: '+id);
assert.ok(html.includes('active class attendance assignment'),'Teacher UI warning missing');
assert.ok(html.includes('Viewer is read-only'),'Viewer UI warning missing');
assert.ok(html.includes('id="verifiedSave"'),'Complete class action must be visible');
assert.ok(html.includes('Neither button is atomic for more than 10 students'),'Do not misrepresent large-class atomicity');
assert.ok(js.includes("rosterSelections.clear();renderRoster();reset()"),'Date change must discard previous day selections');
assert.ok(js.includes("AttendancePostSaveReviewError"),'Post-commit roster uncertainty must require review');
assert.ok(js.includes("if(result.rosterReverified!==true)"),'Complete save UI must require verified final roster');
assert.ok(html.includes('Changing the date clears old attendance selections.'),'Date-reset instructions missing');
assert.ok(html.includes('acknowledged commits are not rolled back'),'Never promise atomic rollback');

for(const contract of [
 "import {saveAuthoritativeClassAttendance} from './verified-class-attendance-save.mjs'",
 "$('verifiedSave').onclick=async()=>",
 "const wasLoadingRoster=rosterBusy,moreRosterPages=!$('rosterNext').disabled",
 "rosterStudents.every(student=>rosterSelections.has(student.id))",
 "await saveAuthoritativeClassAttendance({db,api,actor,schoolId:selectedSchool,classId,date,entries,",
 "assertSession:()=>{",
 "attendanceReviewRequired=true;attendanceReviewInProgress=false;"
])assert.ok(js.includes(contract),'Complete-class attendance UI guard missing: '+contract);
console.log('V47 teacher and verified full-class attendance UI contract passed');
