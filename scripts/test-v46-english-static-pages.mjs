import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const page=(name)=>{const start=html.indexOf('if(p==="'+name+'")h=');assert.ok(start>=0,name+' page exists');const end=html.indexOf('if(p===',start+6);return html.slice(start,end<0?undefined:end);};
for(const name of ['exams','marks','attendance','assessment-settings','marks-ledger','results']){
 const markup=page(name);
 // Stored values, legacy parsers and Devanagari numeral support are intentionally excluded.
 const visible=markup.replace(/value="[^"]*"/g,'').replace(/pattern="[^"]*"/g,'');
 assert.ok(!/[\u0900-\u097F]/.test(visible),name+' contains Nepali in static visible markup');
}
for(const name of ['exams','marks','attendance','assessment-settings','marks-ledger','results']){
 assert.ok(page(name).includes('Class'),name+' must have an English class label');
}
assert.ok(html.includes('function subjectEnglishLabel(value)'));
assert.ok(html.includes('function classEnglishLabel(value)'));
assert.ok(html.includes("if(/प्रथम|पहिलो|first"),'Legacy Nepali exam parsing retained');
console.log('V46 English static page audit passed.');
