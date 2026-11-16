import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// Check the V47-only rules. V46 root rules intentionally remain unchanged.
const rules=readFileSync(new URL('../v47/firestore.rules',import.meta.url),'utf8');
for(const name of ['students','staff','classes','subjects','exams','marks','attendance']){
 assert.doesNotMatch(rules,new RegExp(String.raw`match\s+/${name}/\{[^}]+\}`),'Unscoped V47 collection: '+name);
 assert.match(rules,new RegExp("'"+name+"'"),'Missing scoped collection: '+name);
}
assert.match(rules,/match \/schools\/\{schoolId\}/);
assert.match(rules,/function member\(schoolId\)/);
assert.match(rules,/match \/\{document=\*\*\} \{ allow read, write: if false; \}/);
assert.doesNotMatch(rules,/['\"]user_roles['\"]/);
console.log('V47 school isolation gate passed (structural only; emulator tests required)');
