import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const rules=readFileSync(new URL('../v47/firestore.rules',import.meta.url),'utf8');
for(const name of ['students','staff','classes','subjects','exams','marks','attendance']){
 assert.ok(!rules.includes('match /'+name+'/{id}',0) || rules.indexOf('match /'+name+'/{id}')>rules.indexOf('match /schools/{sid}'),'Unscoped '+name);
}
for(const name of ['students','marks','attendance','exams','teacher_assignments']){
 assert.equal(rules.split('match /'+name+'/{id}').length-1,1,'Duplicate/missing scoped '+name);
}
for(const token of ['match /schools/{sid}','function activeMember(sid)','function memberRole(sid, role)','function immutableSchool(sid)','match /{document=**} { allow read, write: if false; }',"id.matches('^[A-Za-z0-9_-]{1,128}$')","request.resource.data.uid.matches('^[A-Za-z0-9_-]{1,128}$')","request.resource.data.subjectId.matches('^[A-Za-z0-9_-]{1,128}$')"]){
 assert.ok(rules.includes(token),'Missing or truncated '+token);
}
assert.equal(rules.split('function validStudent()').length-1,1,'Duplicate student validator');
assert.equal(rules.split('match /{document=**}').length-1,1,'Duplicate catch-all');
assert.ok(rules.trimEnd().endsWith('}'),'Rules missing closing brace');
assert.ok(!rules.includes('}\n})'),'Malformed duplicate tail');
console.log('V47 structural school isolation checks passed; emulator tests still required');
