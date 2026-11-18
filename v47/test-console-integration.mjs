import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('./'+name,import.meta.url),'utf8');
for(const file of ['students-console.mjs','school-admin-console.mjs']){
 const source=read(file);
 assert.match(source,/import \{verifySchoolSession\} from '\.\/verified-school-session\.mjs'/);
 assert.match(source,/await verifySchoolSession\(/);
 assert.match(source,/auth\.currentUser\?\.uid!==uid/);
 assert.doesNotMatch(source,/memberDoc\.data\(\)\.role/);
}
assert.match(read('student-service.mjs'),/\{\.\.\.student,schoolId\}/);
console.log('V47 real console membership integration contract passed');
