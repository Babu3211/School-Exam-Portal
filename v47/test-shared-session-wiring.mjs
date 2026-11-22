import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=dirname(fileURLToPath(import.meta.url));
const read=name=>readFileSync(join(root,name),'utf8');
const client=read('school-firebase-client.mjs');
assert.match(client,/browserSessionPersistence/,'Shared session must persist across page navigation');
assert.match(client,/authStateReady\(\)/,'Auth must finish restoring before use');
assert.match(client,/smss-exam-portal-v47/,'V47 project isolation must be explicit');
assert.match(client,/startVerifiedSchoolActivity/,'New verified logins must reset idle clock');
assert.match(client,/enforceSchoolIdle/,'Shared idle enforcement required');
for(const name of ['dashboard-console.mjs','students-console.mjs','attendance-console.mjs','school-settings-console.mjs']){
 const code=read(name);
 assert.match(code,/connectSchoolFirebase/,'Shared client required: '+name);
 assert.match(code,/verifySchoolSession/,'Membership verification required: '+name);
 assert.doesNotMatch(code,/inMemoryPersistence/,'Per-page memory auth forbidden: '+name);
 assert.match(code,/startVerifiedSchoolActivity\(\)/,'Verified login must start idle clock: '+name);
}
for(const name of ['students-console.mjs','attendance-console.mjs','school-settings-console.mjs']){
 const code=read(name);
 assert.match(code,/requestedSchool/,'Dashboard school selection must be recognized: '+name);
 assert.match(code,/auth\.currentUser/,'Existing session must be checked: '+name);
}
const dashboard=read('dashboard-console.mjs');
assert.match(dashboard,/destination\.searchParams\.set\('schoolId',current\.schoolId\)/);
assert.match(dashboard,/MAX_IDLE_MS=60\*60\*1000/);
console.log('PASS: V47 shared school session wiring checks');
