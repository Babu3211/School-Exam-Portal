import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const rules=readFileSync(new URL('./firestore.rules',import.meta.url),'utf8');
for(const fragment of [
 "rules_version = '2';","match /schools/{sid}","match /members/{uid}",
 "match /students/{id}","match /marks/{id}","match /attendance/{id}",
 "match /v47_super_admins/{uid}","match /{document=**}",
 "activeMember(sid)","request.resource.data.uid == uid",
 "subject_assignments","component_marks","iemisCode"
]) assert.ok(rules.includes(fragment),'Missing '+fragment);
for(const fragment of ['match /schools/{sid}','match /students/{id}','match /{document=**}','service cloud.firestore']) {
 assert.equal(rules.split(fragment).length-1,1,'Duplicated '+fragment);
}
assert.equal((rules.match(/\{/g)||[]).length,(rules.match(/\}/g)||[]).length,'Unbalanced braces');
assert.ok(rules.trimEnd().endsWith('}'),'Unexpected trailing rules');
assert.ok(!rules.includes('allow read, write: if true'),'Public access forbidden');
assert.ok(!rules.includes("matches('^[0-9]{5,20}\n"),'Truncated IEMIS validation');
console.log('V47 static rules structure checks passed (emulator compilation still required)');
