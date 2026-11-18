import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const rules=readFileSync(new URL('../v47/firestore.rules',import.meta.url),'utf8');
for(const name of ['students','staff','classes','subjects','exams','marks','attendance']){
 assert.doesNotMatch(rules,new RegExp('^\\s{0,4}match /'+name+'/\\{','m'),'Unscoped collection '+name);
}
for(const name of ['students','marks','attendance','exams']){
 assert.equal(rules.split('match /'+name+'/{id}').length-1,1,'Duplicate or missing scoped '+name);
}
for(const token of ['match /schools/{sid}','function activeMember(sid)','function memberRole(sid, role)','function immutableSchool(sid)','match /{document=**} { allow read, write: if false; }']){
 assert.ok(rules.includes(token),'Missing '+token);
}
assert.ok(rules.includes("id.matches('^[A-Za-z0-9_-]{1,128}$')"),'Malformed student ID regex');
assert.equal(rules.split('match /{document=**}').length-1,1,'Duplicate catch-all');
assert.ok(rules.trimEnd().endsWith('}'),'Rules missing closing brace');
assert.ok(!rules.includes('\n})\n'),'Malformed duplicate rules tail');
console.log('V47 structural school isolation checks passed; emulator tests still required');
