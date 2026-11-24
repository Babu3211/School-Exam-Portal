import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('./marks-entry.html',import.meta.url),'utf8');
const js=readFileSync(new URL('./marks-entry-console.mjs',import.meta.url),'utf8');
import {EXAM_TERMS} from './term-catalog.mjs';
const marksTermSelect=html.match(/<select id="term">([\s\S]*?)<\/select>/)?.[1];
assert.ok(marksTermSelect,"Marks Entry term selector must exist");
const termOptions=[...marksTermSelect.matchAll(/<option value="([^"]+)">[^<]*<\/option>/g)].map(match=>match[1]);
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
 "for(const component of classMarkSettings.components)",
 "row.querySelectorAll('input[data-field]')",
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
 "$('inspectClassMarks').onclick=async()=>",
 "for(const input of $('classMarkRows').querySelectorAll('input'))input.disabled=value"
])assert.ok(js.includes(snippet),'Missing draft validation or row lock: '+snippet);
assert.ok(js.includes("for(const row of page)if(row.schoolId!==selectedSchoolId||row.class!==schoolClass)throw new Error('Cross-school"),'Marks selector must reject foreign records');
assert.ok(js.includes("({...doc.data(),id:doc.id})"),'Document ID must override payload ID');
assert.ok(js.includes("if(!auth?.currentUser?.uid||auth.currentUser.uid!==actor.uid){status('प्रमाणीकरण परिवर्तन भयो। फेरि लगइन गर्नुहोस्।');return}"),'Roster load must check authenticated user and stop');
assert.ok(js.includes("$('schoolClass').onchange=()=>{optionRequest++;invalidateClassMarks();"),'Class change must invalidate old roster, draft and inspection');
assert.ok(js.includes("$('draftCheckResult').textContent='';$('inspectClassMarks').disabled=true;"),'Invalidation must clear draft and disable inspection');
assert.ok(js.includes("subjectId=$('subjectId').value,uid=actor.uid,selectedSchoolId=schoolId"),'Roster load must capture original user and school');
assert.ok(js.includes("if(auth?.currentUser?.uid!==uid||actor?.uid!==uid||schoolId!==selectedSchoolId||actor?.schoolId!==selectedSchoolId)throw new Error('Authentication or school changed during roster load')"),'Roster completion must recheck user and school identity');
assert.ok(js.includes("const request=++optionRequest,attempt=epoch,schoolClass=$('schoolClass').value,uid=actor.uid,selectedSchoolId=schoolId"),'Options load must bind its school and user identity');
assert.ok(js.includes("if(auth?.currentUser?.uid!==uid||actor.uid!==uid||schoolId!==selectedSchoolId)throw new Error('Authentication changed during options load')"),'Paginated options must recheck session after each fetch');
assert.ok(js.includes("if(request!==optionRequest||attempt!==epoch||schoolClass!==$('schoolClass').value||auth?.currentUser?.uid!==uid||actor?.uid!==uid||schoolId!==selectedSchoolId)throw new Error('Options selection changed during load')"),'Options must recheck session before populating selectors');
assert.ok(js.includes("$('classMarkRows').addEventListener('input',event=>"),'Draft inspection must be invalidated on edited marks');
assert.ok(js.includes("Draft changed. Inspect again before saving."),'Old draft inspection must not appear current after edits');
assert.ok(js.includes('rosterRequest++;classMarkRoster=[]'),'Session reset and draft invalidation must revoke stale roster requests');
assert.ok(js.includes('invalidateClassMarks();const request=rosterRequest;lock(true)'),'Roster load must capture its invalidation token');
assert.ok(js.includes('if(request!==rosterRequest||attempt!==epoch||classId!=='),'Stale roster responses must not render after selection changes');
assert.ok(js.includes('if(request===rosterRequest&&attempt===epoch){invalidateClassMarks();lock(false);'),'Current roster failures must unlock editor without clearing a newer request');
assert.ok(js.includes('finally{if(request===rosterRequest&&attempt===epoch)lock(false)}'),'Old roster requests must not unlock a newer load');
assert.ok(js.includes('function reset(){')&&js.includes('optionRequest++;rosterRequest++'),'Reset must invalidate option loads');
assert.ok(js.includes("if(request!==optionRequest||attempt!==epoch||schoolClass!=="),'Old paginated options must be ignored');
assert.ok(js.includes("if(request===optionRequest&&attempt===epoch)lock(false)"),'Old option loads must not unlock newer loads');
assert.ok(js.includes("$('schoolClass').onchange=()=>{optionRequest++;invalidateClassMarks();"),'Class change must revoke pending options');
assert.ok(js.includes("api.collection(db,'schools',selectedSchoolId,collection)"),'Paginated selectors must query the captured school, not mutable current school');
assert.ok(js.includes("if(request!==optionRequest||attempt!==epoch||schoolClass!==$('schoolClass').value||auth?.currentUser?.uid!==uid"),'Selectors must recheck class, session and request token before rendering');
assert.ok(js.includes("for(const row of page)if(row.schoolId!==selectedSchoolId||row.class!==schoolClass)"),'Each selector page must validate records against the captured school and class');
assert.ok(js.includes("if(rendered.length!==expected.size)throw new Error('Class roster changed"),'Missing class rows must fail closed');
assert.ok(js.includes("if(!expected.has(id)||seen.has(id))throw new Error('Unexpected or duplicate student"),'Duplicate or foreign rendered students must fail closed');
assert.ok(js.includes("inputs.length!==1)throw new Error('Component fields changed; reload')"),'Each configured component must appear exactly once for each student');
assert.ok(js.includes("row.querySelectorAll('input[data-field]').length!==classMarkSettings.components.length"),'No unconfigured component input may appear');
assert.ok(js.includes("for(const component of classMarkSettings.components)"),'Computer and all other subjects must use configured Examination Settings components');
assert.ok(js.includes("if(saved.rosterReverified!==true)"),'UI must not claim confirmed Draft without post-commit verification');
assert.ok(js.includes("ClassDraftPostSaveReviewError"),'UI must distinguish acknowledged Draft commits from uncertain final checks');
assert.ok(js.includes("classDraftRevision=null;"),'Unknown Draft state must disable a blind retry');
assert.ok(html.includes('saved revision before retrying'),'Draft post-save instructions missing');
console.log('V47 full-class marks UI contract passed');
