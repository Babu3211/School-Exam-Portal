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
assert.ok(html.includes('Individual Save disabled'),'Legacy individual mark button must be disabled');
assert.ok(js.includes("$('save').disabled=true"),'Legacy individual mark save must remain disabled');
assert.ok(!js.includes('createSchoolMarkOnly'),'Legacy mark create must not be invoked by class editor');
for(const id of ['inspectClassMarks','draftCheckResult'])assert.ok(html.includes('id="'+id+'"'),'Missing large-class draft checker: '+id);
for(const snippet of [
 "import {inspectClassMarkDraft} from './class-mark-draft-inspector.mjs'",
 "$('inspectClassMarks').onclick=()=>",
 "inspection=inspectClassMarkDraft(",
 "if(!inspection.ready){status('Save blocked:",
 "for(const input of $('classMarkRows').querySelectorAll('input'))input.disabled=value"
])assert.ok(js.includes(snippet),'Missing draft validation or row lock: '+snippet);
assert.ok(js.includes("if(row.schoolId!==schoolId||row.class!==schoolClass)throw new Error('Cross-school"),'Marks selector must reject foreign records');
assert.ok(js.includes("({...doc.data(),id:doc.id})"),'Document ID must override payload ID');
assert.ok(js.includes("Authentication changed; sign in again"),'Roster load must check authenticated user');
console.log('V47 full-class marks UI contract passed');
