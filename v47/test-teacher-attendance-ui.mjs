import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const js=readFileSync(new URL('./attendance-console.mjs',import.meta.url),'utf8');
const html=readFileSync(new URL('./attendance.html',import.meta.url),'utf8');
for(const token of [
 "import {saveAssignedTeacherAttendance} from './teacher-attendance-service.mjs'",
 "actor={role:session.role,active:true,schoolId:selectedSchool,uid}",
 "actor.role==='teacher'?await saveAssignedTeacherAttendance",
 "if(!['school_admin','teacher'].includes(actor?.role))",
 "if(actor?.role==='school_admin'){const select=document.createElement('select')",
 "if(actor?.role!=='school_admin')throw new Error('School Admin required')"
])assert.ok(js.includes(token),'Missing teacher attendance UI contract: '+token);
assert.ok(js.includes("Teachers cannot edit or overwrite this record."),'Teacher save confirmation missing');
assert.ok(js.includes("auth.currentUser.uid!==actor.uid"),'Authentication change protection missing');
for(const id of ['schoolClass','date','studentId','present'])assert.ok(js.includes("$('"+id+"').disabled=true"),'Save-time field lock missing: '+id);
assert.ok(html.includes('active class attendance assignment'),'Teacher UI warning missing');
assert.ok(html.includes('Viewer is read-only'),'Viewer UI warning missing');
console.log('V47 teacher attendance browser wiring contract passed');
