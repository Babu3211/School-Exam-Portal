import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL(name,import.meta.url),'utf8');
const rules=read('firestore.rules');
for(const collection of ['marks','component_marks']){
 const start=rules.indexOf('match /'+collection+'/{id} {');
 assert(start>=0,'Missing '+collection+' Firestore rule');
 const section=rules.slice(start,rules.indexOf('\n      }',start));
 const writes=[...section.matchAll(/allow\\s+([^:;]+):\\s*if\\s+([^;]+);/g)]
  .filter(m=>m[1].split(',').some(p=>['write','create','update','delete'].includes(p.trim())));
 assert(writes.length>0,'Missing explicit write deny for '+collection);
 assert(writes.every(m=>m[2].trim()==='false'),'Unsafe '+collection+' writes enabled before class publication audit');
}
const page=read('marks-entry.html');
assert(/id="saveClassMarks"\\s+disabled/.test(page),'Unverified class Save button enabled');
assert(/id="save"\\s+disabled/.test(page),'Unverified individual Save button enabled');
const service=read('class-mark-save.mjs');
assert(/complete\\.count>3/.test(service),'Small-class limit unexpectedly removed');
console.log('PASS V47 production marks safety guard');
