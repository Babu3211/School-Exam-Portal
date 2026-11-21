import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const rules=readFileSync('v47/firestore.rules','utf8');
assert.equal((rules.match(/match \/component_marks\/\{id\}/g)||[]).length,1);
assert.equal((rules.match(/match \/marks\/\{id\}/g)||[]).length,1);
assert.equal((rules.match(/rules_version = '2';/g)||[]).length,1);
for(const collection of ['component_marks','marks']){
 const start=rules.indexOf('match /'+collection+'/{id} {');
 assert.ok(start>=0,'Missing '+collection+' match');
 const block=rules.slice(start).split(/\n\s*(?:match \/|function )/)[0];
 const clauses=[...block.matchAll(/allow\s+([^:;]+):\s*if\s*([^;]+);/g)];
 const writeClauses=clauses.filter(m=>m[1].split(',').some(p=>['write','create','update','delete'].includes(p.trim())));
 assert.ok(writeClauses.length,'Explicit deny required for '+collection);
 const denied=new Set();
 for(const clause of writeClauses){
  assert.equal(clause[2].trim(),'false','Writable '+collection+' permission: '+clause[0]);
  for(const permission of clause[1].split(',').map(p=>p.trim()))denied.add(permission);
 }
 assert.ok(denied.has('write')||['create','update','delete'].every(p=>denied.has(p)),collection+' must deny all writes');
}
const generic=rules.slice(rules.indexOf('match /{collection}/{id}'));
assert.doesNotMatch(generic,/['"](?:component_marks|marks)['"]/, 'Generic wildcard must not bypass mark write denial');
assert.match(rules,/match \/\{document=\*\*\} \{ allow read, write: if false; \}/);
console.log('V47 Computer and raw mark write denial checks passed');
