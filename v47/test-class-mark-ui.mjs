import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('./marks-entry.html',import.meta.url),'utf8');
const js=readFileSync(new URL('./marks-entry-console.mjs',import.meta.url),'utf8');
import {EXAM_TERMS} from './term-catalog.mjs';
const termOptions=[...html.matchAll(/<option value="([^"]+)">[^<]*<\/option>/g)].map(match=>match[1]);
assert.deepEqual(termOptions,EXAM_TERMS,'Marks Entry dropdown must expose every supported exam term exactly once');
const examsHtml=readFileSync(new URL('./exams.html',import.meta.url),'utf8');
const examsJs=readFileSync(new URL('./exams-console.mjs',import.meta.url),'utf8');
const examOptions=[...examsHtml.matchAll(/<option value="([^"]+)">[^<]*<\/option>/g)].map(match=>match[1]);
assert.deepEqual(examOptions,EXAM_TERMS,'Exam Management dropdown must expose all six terms');
assert.ok(examsJs.includes("import {EXAM_TERMS} from './term-catalog.mjs'"),'Exam Management must share term catalog');
assert.ok(examsJs.includes('EXAM_TERMS.includes(doc.id)'),'Exam Management must list all configured terms');

for(const id of ['classSaveArea','loadClassMarks','classMarkRows','classMarkCount','saveClassMarks'])assert.ok(html.includes('id="'+id+'"'),'Missing full-class UI: '+id);
for(const snippet of [
 "import {loadCompleteClassRoster} from './complete-class-roster.mjs'",
 "classMarkRoster.map(student=>",
 "theory:row?.querySelector",
 "practical:row?.querySelector",
 "if(!auth?.currentUser?.uid||auth.currentUser.uid!==actor.uid)",
])assert.ok(js.includes(snippet),'Missing full-class mark safeguard: '+snippet);
assert.ok(js.includes("classMarkRoster=[...roster.students].sort("),'Class mark rows must be alphabetically sorted');
assert.ok(js.includes('for(const student of classMarkRoster)'),'Rendered rows must use sorted roster');
assert.ok(js.includes('document.createDocumentFragment()'),'Large class roster must use batched DOM rendering');
assert.ok(js.includes('fragment.append(row)')&&js.includes('body.append(fragment)'),'Class rows must be appended in one batch');
assert.ok(html.includes('An incomplete class cannot be saved'),'Incomplete-class warning missing');
assert.ok(html.includes('Save/Publish unavailable — development'),'Save button must disclose unavailability');
assert.ok(js.includes("$('saveClassMarks').disabled=true"),'Save button must always remain disabled');
assert.ok(!js.includes('saveVerifiedSmallClassMarks'),'Marks editor must not invoke blocked Firestore writes');
assert.ok(html.includes('Individual Save disabled'),'Legacy individual mark button must be disabled');
assert.ok(js.includes("$('save').disabled=true"),'Legacy individual mark save must remain disabled');
assert.ok(!js.includes('createSchoolMarkOnly'),'Legacy mark create must not be invoked by class editor');
for(const id of ['inspectClassMarks','draftCheckResult'])assert.ok(html.includes('id="'+id+'"'),'Missing large-class draft checker: '+id);
for(const snippet of [
 "import {inspectClassMarkDraft} from './class-mark-draft-inspector.mjs'",
 "$('inspectClassMarks').onclick=()=>",
 "for(const input of $('classMarkRows').querySelectorAll('input'))input.disabled=value"
])assert.ok(js.includes(snippet),'Missing draft validation or row lock: '+snippet);
assert.ok(js.includes("if(row.schoolId!==schoolId||row.class!==schoolClass)throw new Error('Cross-school"),'Marks selector must reject foreign records');
assert.ok(js.includes("({...doc.data(),id:doc.id})"),'Document ID must override payload ID');
assert.ok(js.includes("Authentication changed; sign in again"),'Roster load must check authenticated user');
assert.ok(js.includes("$('schoolClass').onchange=()=>{invalidateClassMarks();"),'Class change must invalidate old roster, draft and inspection');
assert.ok(js.includes("$('draftCheckResult').textContent='';$('inspectClassMarks').disabled=true;"),'Invalidation must clear draft and disable inspection');
assert.ok(js.includes("subjectId=$('subjectId').value,uid=actor.uid,selectedSchoolId=schoolId"),'Roster load must capture original user and school');
assert.ok(js.includes("if(auth?.currentUser?.uid!==uid||actor?.uid!==uid||schoolId!==selectedSchoolId||actor?.schoolId!==selectedSchoolId)throw new Error('Authentication or school changed during roster load')"),'Roster completion must recheck user and school identity');
assert.ok(js.includes("const attempt=epoch,schoolClass=$('schoolClass').value,uid=actor.uid,selectedSchoolId=schoolId"),'Options load must bind its school and user identity');
assert.ok(js.includes("if(auth?.currentUser?.uid!==uid||actor.uid!==uid||schoolId!==selectedSchoolId)throw new Error('Authentication changed during options load')"),'Paginated options must recheck session after each fetch');
assert.ok(js.includes("if(auth?.currentUser?.uid!==uid||actor?.uid!==uid||schoolId!==selectedSchoolId)throw new Error('Authentication changed during options load')"),'Options must recheck session before populating selectors');
assert.ok(js.includes("$('classMarkRows').addEventListener('input',event=>"),'Draft inspection must be invalidated on edited marks');
assert.ok(js.includes("Draft changed. Inspect again before saving."),'Old draft inspection must not appear current after edits');
assert.ok(js.includes('rosterRequest++;classMarkRoster=[]'),'Session reset and draft invalidation must revoke stale roster requests');
assert.ok(js.includes('invalidateClassMarks();const request=rosterRequest;lock(true)'),'Roster load must capture its invalidation token');
assert.ok(js.includes('if(request!==rosterRequest||attempt!==epoch||classId!=='),'Stale roster responses must not render after selection changes');
assert.ok(js.includes('if(request===rosterRequest&&attempt===epoch){invalidateClassMarks();lock(false);'),'Current roster failures must unlock editor without clearing a newer request');
assert.ok(js.includes('finally{if(request===rosterRequest&&attempt===epoch)lock(false)}'),'Old roster requests must not unlock a newer load');
console.log('V47 full-class marks UI contract passed');
