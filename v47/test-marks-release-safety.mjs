import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const root=new URL('./',import.meta.url);
const read=name=>readFileSync(new URL(name,root),'utf8');
const rules=read('firestore.rules');
const html=read('marks-entry.html');
const gate=read('release-readiness-gate.mjs');
function matchBlock(name){
 const start=rules.indexOf('match /'+name+'/{id} {');
 assert(start>=0,'Missing Firestore rule '+name);
 const body=rules.slice(start).match(/^match \/[^\n]+\{([\s\S]*?)\n      \}/);
 assert(body,'Cannot parse rule '+name);
 return body[1];
}
for(const name of ['marks','component_marks']){
 const block=matchBlock(name);
 const permissions=[...block.matchAll(/allow\s+([^:;]+):\s*if\s+([^;]+);/g)];
 assert(permissions.some(m=>m[1].split(',').map(x=>x.trim()).includes('create')&&m[2].trim()==='false'),name+' create must be denied');
 assert(permissions.some(m=>m[1].split(',').map(x=>x.trim()).includes('update')&&m[2].trim()==='false'),name+' update must be denied');
 assert(permissions.some(m=>m[1].split(',').map(x=>x.trim()).includes('delete')&&m[2].trim()==='false'),name+' delete must be denied');
 assert(permissions.filter(m=>m[1].split(',').some(x=>['write','create','update','delete'].includes(x.trim()))).every(m=>m[2].trim()==='false'),name+' must not have a second write grant');
}
assert.match(html,/id="saveClassMarks" disabled/,'Class Save UI must stay disabled');
assert.match(html,/id="save" disabled/,'Individual Save UI must stay disabled');
assert.match(gate,/Firestore marks writes are disabled/,'Release gate must flag blocked marks');
assert.match(gate,/process\.exitCode\s*=\s*1/,'Release gate must fail closed');
console.log('V47 release safety contract: marks writes denied and UI publication disabled');

assert.match(gate,/Spark-only deployment/);
assert.match(gate,/Independent live V47 two-school acceptance/);
assert.match(gate,/not client write grants/);

// Exercise the actual gate, not just a matching comment or an accidental crash.
const release=spawnSync(process.execPath,[new URL('./release-readiness-gate.mjs',root).pathname],{encoding:'utf8'});
assert.equal(release.status,1);
for(const reason of ['V47 PRODUCTION RELEASE BLOCKED','Legacy direct mark service remains limited to three students','full-class Draft and trusted publication implementation do not constitute an approved live publication runtime','Firestore marks writes are disabled by design','Computer component direct writes are denied by design','Spark-only deployment','Independent live V47 two-school acceptance'])assert.ok(release.stderr.includes(reason),'Missing deliberate release blocker: '+reason);
console.log('PASS deliberate runtime release refusal and current diagnostic messages');
