import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const html=readFileSync('v47/admin.html','utf8'),js=readFileSync('v47/admin-console.mjs','utf8');
assert.match(html,/admin-console\.mjs/);assert.match(html,/Development only/);assert.match(js,/smss-exam-portal-v47/);assert.match(js,/onboardSchool/);assert.match(js,/setSchoolActive/);assert.match(js,/getDocs/);assert.doesNotMatch(js,/localStorage|sessionStorage/);assert.match(js,/mutating=true;button\.disabled=true/);
assert.match(js,/\$\('register'\)\.onclick=async/);assert.match(js,/if\(mutating\|\|signingIn\|\|signingOut\)return/);assert.match(js,/await onboardSchool/);
assert.match(js,/finally\{mutating=false;\$\('register'\)\.disabled=false/);
assert.match(js,/if\(mutating\)\{status\('Wait for school update/);
console.log('V47 admin console static checks passed');
