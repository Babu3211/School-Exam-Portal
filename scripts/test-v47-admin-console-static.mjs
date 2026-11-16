import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const html=readFileSync('v47/admin.html','utf8'),js=readFileSync('v47/admin-console.mjs','utf8');
assert.match(html,/admin-console\.mjs/);assert.match(html,/Development only/);assert.match(js,/smss-exam-portal-v47/);assert.match(js,/onboardSchool/);assert.match(js,/setSchoolActive/);assert.match(js,/getDocs/);assert.doesNotMatch(js,/localStorage|sessionStorage/);console.log('V47 admin console static checks passed');
