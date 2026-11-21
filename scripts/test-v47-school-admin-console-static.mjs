import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';const html=readFileSync('v47/school-admin.html','utf8'),js=readFileSync('v47/school-admin-console.mjs','utf8');assert.match(html,/school-admin-console\.mjs/);assert.match(js,/smss-exam-portal-v47/);assert.match(js,/getSchoolDetails/);assert.match(js,/addSchoolMember/);assert.match(js,/session.role!=='school_admin'/);assert.doesNotMatch(js,/localStorage|sessionStorage/);assert.match(js,/verifySchoolSession/);
assert.match(js,/schoolId!==selectedSchool/);
assert.match(js,/loginAuth\.currentUser\?\.uid!==uid/);
assert.match(js,/if\(busy\)return;try\{const session=requireCurrentAdmin\(\)/);
assert.match(js,/busy=true;\$\('add'\)\.disabled=true/);
assert.match(js,/finally\{busy=false;\$\('add'\)\.disabled=false/);
console.log('V47 school admin console static checks passed');
