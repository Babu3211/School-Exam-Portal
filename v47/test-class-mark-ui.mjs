import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('./marks-entry.html',import.meta.url),'utf8');
const js=readFileSync(new URL('./marks-entry-console.mjs',import.meta.url),'utf8');
for(const id of ['classSaveArea','loadClassMarks','classMarkRows','classMarkCount','saveClassMarks'])assert.ok(html.includes('id="'+id+'"'),'Missing full-class UI: '+id);
for(const snippet of [
 "import {loadCompleteClassRoster} from './complete-class-roster.mjs'",
 "import {saveVerifiedSmallClassMarks} from './verified-small-class-mark-save.mjs'",
 "roster.count>3?'Save blocked",
 "if(classMarkRoster.length>3)",
 "classMarkRoster.map(student=>",
 "theory:row?.querySelector",
 "practical:row?.querySelector",
 "if(!auth?.currentUser?.uid||auth.currentUser.uid!==actor.uid)",
 "invalidateClassMarks();status('Atomic class marks saved:"
])assert.ok(js.includes(snippet),'Missing full-class mark safeguard: '+snippet);
assert.ok(html.includes('An incomplete class cannot be saved'),'Incomplete-class warning missing');
console.log('V47 full-class marks UI contract passed');
