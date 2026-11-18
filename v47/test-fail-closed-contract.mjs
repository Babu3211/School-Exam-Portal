import assert from 'node:assert/strict';
import {roleCapabilities} from './role-capabilities.mjs';
import {validateTeacherWrite} from './teacher-write-contract.mjs';
import {planTenantQuery} from './tenant-query-plan.mjs';
import {selectTenantSession} from './tenant-session.mjs';
for(const role of ['viewer','teacher']){
 const c=roleCapabilities(role);
 assert.equal(c.marksWrite,false);
 assert.equal(c.attendanceWrite,false);
 assert.equal(c.delete,false);
}
assert.equal(roleCapabilities('school_admin').marksWrite,true);
for(const bad of [{},{'../../evil':20},{theory:Infinity},{theory:-1},{theory:101}]){
 assert.throws(()=>validateTeacherWrite({schoolId:'school_A',studentId:'student_1',className:'10',subject:'Science',marks:bad}));
}
for(const collection of ['audit_logs','members','teachers','question_papers','results']){
 assert.throws(()=>planTenantQuery({schoolId:'school_A',collection}),TypeError);
}
assert.equal(planTenantQuery({schoolId:'school_A',collection:'students',limit:500}).limit,100);
const s=selectTenantSession([{schoolId:'school_A',role:'teacher',active:true}],'school_A');
assert.equal(s.authorization,'unverified-client-selection');
console.log('V47 fail-closed contract tests passed');
