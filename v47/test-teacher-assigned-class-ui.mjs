import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ui=readFileSync(new URL('./teacher-assigned-class-console.mjs',import.meta.url),'utf8');
const html=readFileSync(new URL('./teacher-assigned-class.html',import.meta.url),'utf8');
const hub=readFileSync(new URL('./index.html',import.meta.url),'utf8');
const indexes=JSON.parse(readFileSync(new URL('./firestore.indexes.json',import.meta.url),'utf8'));
assert.ok(indexes.indexes.some(index=>index.collectionGroup==='teacher_assignments'&&index.fields[0]?.fieldPath==='uid'&&index.fields[1]?.fieldPath==='__name__'));
assert.match(hub,/href="\.\/teacher-assigned-class\.html"/);
assert.match(html,/Development-only teacher workspace/);
assert.match(html,/id="students"/);
assert.match(html,/id="loadAssignments"/);
assert.match(html,/id="loadAttendance" disabled/);
assert.match(html,/<select id="subjectId">/);
const firebaseClient=readFileSync(new URL('./school-firebase-client.mjs',import.meta.url),'utf8');
assert.match(ui,/connectSchoolFirebase/);
assert.match(firebaseClient,/V47_FIREBASE_CONFIG\.projectId!=='smss-exam-portal-v47'/);
assert.match(firebaseClient,/browserSessionPersistence/);
assert.match(firebaseClient,/IDLE_LIMIT=60\*60\*1000/);
assert.match(ui,/authSdk\.onAuthStateChanged\(auth,user=>/);
assert.match(ui,/if\(actor&&user\?\.uid!==actor\.uid\)\{clear\(\)/);
assert.match(ui,/\['login','logout','load','loadAttendance','loadAssignments','classId','subjectId','schoolId','email','password'\]/);
assert.match(ui,/School selection changed/);
assert.match(ui,/selectionEpoch\+\+/);
assert.match(ui,/selection!==selectionEpoch/);
assert.match(ui,/if\(!busy\)lock\(false\)/);
assert.equal((ui.match(/finally\{lock\(false\)\}/g)||[]).length,1);
assert.ok((ui.match(/finally\{if\(request===epoch\)lock\(false\)\}/g)||[]).length>=4);
assert.match(ui,/\$\('schoolId'\)\.disabled=!!actor/);
assert.doesNotMatch(ui,/textContent='';epoch\+\+\}\);/);
assert.match(ui,/session\.role!=='teacher'/);
assert.match(ui,/verifyTeacherSubjectAssignment/);
assert.match(ui,/loadCompleteClassRoster/);
assert.match(ui,/verifyTeacherAttendanceDuty/);
assert.match(ui,/\$\('loadAttendance'\)\.onclick=async/);
assert.equal((ui.match(/await verifyTeacherAttendanceDuty/g)||[]).length,2);
assert.match(ui,/await revalidate\(\)/);
assert.ok((ui.match(/await verifyTeacherSubjectAssignment/g)||[]).length>=4,'Teacher Draft must reverify assignment');
assert.match(ui,/api\.where\('uid','==',uid\)/);
const emulator=readFileSync(new URL('../scripts/test-v47-emulator-isolation.mjs',import.meta.url),'utf8');
assert.match(emulator,/await assertSucceeds\(getDocs\(ownAssignments\)\)/);
assert.match(emulator,/await assertFails\(getDocs\(query\(collection\(db\('teacher-a'\)/);
assert.match(emulator,/where\('uid','==','other-teacher'\)/);
assert.match(ui,/data\.uid!==uid\|\|data\.schoolId!==id/);
assert.match(ui,/data\.active!==true\|\|data\.classId!==classId/);
assert.match(ui,/api\.startAfter\(cursor\)/);
assert.match(ui,/snap\.docs\.length>100/);
assert.match(ui,/pages>20/);
assert.match(ui,/document\.id!==id\+':'\+uid\+':'\+data\.classId\+':'\+data\.subjectId/);
assert.match(ui,/pagination stalled/);
assert.match(ui,/Select a verified subject/);
assert.match(ui,/\$\('load'\)\.disabled=true/);
assert.match(ui,/for\(const subjectId of subjects\)/);
assert.match(ui,/data\.subjectId==='attendance'\)continue/);
assert.match(ui,/name:subject\.subjectName/);
assert.match(ui,/option\.textContent=subject\.name/);
assert.match(ui,/student\.name\?\?student\.id/);
assert.doesNotMatch(ui,/setDoc\(|addDoc\(|updateDoc\(|deleteDoc\(|runTransaction\(|writeBatch\(/);
assert.match(ui,/const failedEpoch=epoch;try\{await authSdk\.signOut\(auth\)\}catch\{\}if\(epoch===failedEpoch\)\{lock\(false\)/);
for(const id of ['teacherDraftArea','draftTerm','loadTeacherDraft','inspectTeacherDraft',
 'saveTeacherDraft','teacherDraftRows','teacherDraftHeader','teacherDraftStatus'])
 assert.match(html,new RegExp('id="'+id+'"'),'Missing teacher marks Draft element '+id);
for(const term of ['weekly','monthly','1st','2nd','3rd','final'])
 assert.match(html,new RegExp('<option value="'+term+'">'),'Teacher draft missing term '+term);
for(const name of ['saveVerifiedTeacherClassDraft','verifyStoredTeacherClassDraft',
 'discoverVerifiedSubjectExamSettings','inspectConfiguredClassMarks',
 'verifyTeacherSubjectAssignment','loadCompleteClassRoster','enforceSchoolIdle'])
 assert.ok(ui.includes(name),'Teacher draft requires '+name);
assert.match(ui,/draftInspected=false/);
assert.match(ui,/if\(saved\.rosterReverified!==true\)/);
assert.match(ui,/TeacherDraftPostSaveReviewError/);
assert.match(ui,/clearTeacherDraft\(\)/);
assert.match(ui,/draftEpoch\+\+/);
assert.doesNotMatch(ui,/\b(?:setDoc|addDoc|updateDoc|deleteDoc|runTransaction|writeBatch)\s*\(/,
 'Browser teacher page must use verified service, not direct writes');
console.log('PASS V47 Teacher roster and assigned complete-class draft UI: verified subject, session and non-official saves');
