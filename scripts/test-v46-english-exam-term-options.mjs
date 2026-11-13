import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const match=html.match(/<select id="examTerm" required>([\s\S]*?)<\/select>/);
assert.ok(match,'Exam term selector must exist');
const options=[...match[1].matchAll(/<option value="([^"]+)">([^<]+)<\/option>/g)].map(x=>({key:x[1],label:x[2]}));
assert.deepEqual(options,[
 {key:'first',label:'First Term'},
 {key:'second',label:'Second Term'},
 {key:'third',label:'Third Term'},
 {key:'annual',label:'Annual Exam'},
 {key:'half-yearly',label:'Half Yearly'},
 {key:'internal',label:'Internal'},
 {key:'other',label:'Other'}
],'Exam term labels must remain English while preserving persisted term keys');
console.log('V46 English exam term dropdown compatibility regression passed.');
