import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isActiveEnrolledStudent} from './student-enrollment-status.mjs';

assert.equal(isActiveEnrolledStudent({id:'legacy1',schoolId:'12345',class:'9'}),true,
 'Legacy V46 student without active field must be included');
assert.equal(isActiveEnrolledStudent({id:'s1',active:true}),true);
for(const active of [false,null,0,1,'true','false',{},[]]){
 assert.equal(isActiveEnrolledStudent({id:'s2',active}),false,
  'Only true or omitted active status is supported');
}
for(const record of [null,undefined,false,[],42,'student']){
 assert.equal(isActiveEnrolledStudent(record),false);
}
const consoleSource=readFileSync(new URL('./marks-entry-console.mjs',import.meta.url),'utf8');
assert.match(consoleSource,/import \{isActiveEnrolledStudent\} from '\.\/student-enrollment-status\.mjs'/);
for(const [description,source] of [
 ['initial roster',/roster\.students\.some\(student=>!isActiveEnrolledStudent\(student\)\)/],
 ['rechecked roster',/latestRoster\.students\.some\(student=>!isActiveEnrolledStudent\(student\)\)/],
 ['Excel import roster',/roster\.students\.some\(s=>!isActiveEnrolledStudent\(s\)\)/],
 ['review verification roster',/roster\.students\.some\(student=>!isActiveEnrolledStudent\(student\)\)/]
])assert.match(consoleSource,source,description);
console.log('V47 student enrollment contract: legacy omitted active is allowed; false/malformed statuses are rejected');
