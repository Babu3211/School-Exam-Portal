import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const rules=readFileSync(new URL('./firestore.rules',import.meta.url),'utf8');
const legacy=['audit_logs','certificates','school_public_branding','school_gallery','user_roles','public_result_exams','public_result_lookup','public_results'];
for(const name of legacy){
 const start=rules.indexOf('match /'+name+'/{id} {');
 assert.ok(start>=0,'missing explicit legacy rule '+name);
 const end=rules.indexOf('\n      }',start);
 assert.ok(end>start,'missing end of rule '+name);
 const block=rules.slice(start,end);
 assert.match(block,/allow create, update, delete: if false;/,'legacy write access must stay blocked: '+name);
 assert.match(block,/allow get, list: if can(?:Admin|Read)\(sid\);/,'legacy read must be school-scoped: '+name);
 if(['audit_logs','user_roles','public_result_lookup'].includes(name))assert.match(block,/allow get, list: if canAdmin\(sid\);/,'sensitive legacy read must be admin only: '+name);
}
assert.match(rules,/match \/\{document=\*\*\} \{ allow read, write: if false; \}/);
console.log('PASS: eight V46 legacy collections have school-scoped, read-only rules (static check only)');
