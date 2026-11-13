import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
for(const [name,next,cache,success] of [
 ['loadStaff','seedInitialStaff20','cachedStaff','renderStaff()'],
 ['loadExams','renderExams','cachedExams','renderExams()']
]){
 const start=html.indexOf('async function '+name+'(');
 const end=html.indexOf('\n'+(next==='renderExams'?'function ':'async function ')+next+'(',start);
 assert.ok(start>=0&&end>start,name+' loader must exist');
 const source=html.slice(start,end);
 assert.ok(source.includes(success),name+' must render fresh results');
 assert.match(source,new RegExp(cache+'=\\[\\];'),name+' must discard stale cache on failed reload');
 assert.match(source,/catch\s*\(error\)/,name+' must report Firestore errors');
}
console.log('V46 Staff and Exam failed-reload cache safety regression passed.');
