import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const rules=readFileSync(new URL('./firestore.rules',import.meta.url),'utf8');
const emulatorConfig=JSON.parse(readFileSync(new URL('./firebase.emulator.json',import.meta.url),'utf8'));
assert.equal(emulatorConfig.firestore?.rules,'firestore.rules','The V47 emulator rules file must resolve relative to v47/firebase.emulator.json');
assert.equal(readFileSync(new URL(emulatorConfig.firestore.rules,import.meta.url),'utf8'),rules,'The V47 emulator must use isolated V47 rules, never V46 production rules');
for(const fragment of [
 "rules_version = '2';","match /schools/{sid}","match /members/{uid}",
 "match /students/{id}","match /marks/{id}","match /attendance/{id}",
 "match /v47_super_admins/{uid}","match /{document=**}",
 "activeMember(sid)","request.resource.data.uid == uid",
 "subject_assignments","component_marks","iemisCode",
 "request.resource.data.active == false","allow delete: if false;"
]) assert.ok(rules.includes(fragment),'Missing '+fragment);
for(const fragment of ['match /schools/{sid}','match /students/{id}','match /{document=**}','service cloud.firestore']) {
 assert.equal(rules.split(fragment).length-1,1,'Duplicated '+fragment);
}
assert.equal((rules.match(/\{/g)||[]).length,(rules.match(/\}/g)||[]).length,'Unbalanced braces');
assert.ok(rules.trimEnd().endsWith('}'),'Unexpected trailing rules');
assert.ok(!rules.includes('allow read, write: if true'),'Public access forbidden');
assert.ok(!rules.includes("matches('^[0-9]{5,20}\n"),'Truncated IEMIS validation');
console.log('V47 static rules structure checks passed (emulator compilation still required)');
