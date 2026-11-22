import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root=new URL('./',import.meta.url);
const page=readFileSync(new URL('report-preview.html',root),'utf8');
const controller=readFileSync(new URL('report-preview-console.mjs',root),'utf8');
const hub=readFileSync(new URL('index.html',root),'utf8');

assert.match(hub,/href="\.\/report-preview\.html"/);
assert.match(page,/src="\.\/report-preview-console\.mjs"/);
for(const id of ['connect','schoolId','email','password','login','logout','report',
 'school','counts','message','audit','summaryExam','summaryClass','summaryAnnual',
 'summaryRun','summaryResult','summaryRows','coverageSection','coverageSubject',
 'coverageRun','coverageResult']){
 assert.match(page,new RegExp('id="'+id+'"'),'Report control missing: '+id);
}
assert.doesNotMatch(page,/id="config"/,'Shared Firebase app needs no pasted configuration');
assert.match(controller,/connectSchoolFirebase\(/);
assert.match(controller,/startVerifiedSchoolActivity\(/);
assert.match(controller,/enforceSchoolIdle\(/);
assert.match(controller,/createV46ReadOnlyBridge\(/);
assert.match(controller,/bridge\.loadExamReportRows\(\)/);
assert.match(controller,/previewV46MarkSummaries\(rows/);
assert.match(controller,/inspectClassMarkCoverage\(rows/);
assert.match(controller,/reportRows=\{\.\.\.rows,verifiedUid:credential\.user\.uid\}/);
assert.match(controller,/\$\('summaryRows'\)\.replaceChildren\(\)/);
assert.match(controller,/td\.textContent=value==null/);
assert.doesNotMatch(controller,/\.innerHTML\s*=/);
assert.match(controller,/function currentSession\(requestEpoch,uid\)/);
assert.match(controller,/requestEpoch===epoch&&auth\?\.currentUser\?\.uid===uid/);
assert.match(controller,/if\(!currentSession\(current,credential\.user\.uid\)\)return/);
assert.match(controller,/loginTask=\(async\(\)=>\{/);
assert.match(controller,/if\(loginTask\)\{try\{await loginTask\}catch\{/);
assert.match(controller,/if\(auth\)await authSdk\.signOut\(auth\)/);
assert.match(controller,/rows\.publicationAllowed!==false\|\|rows\.complete!==false/);
assert.match(controller,/withVerifiedReportSnapshot/);
assert.match(controller,/getDocFromServer\(ref\)/);
assert.match(controller,/verifySchoolSession\(/);
assert.match(controller,/authSdk\.onAuthStateChanged\(/);
assert.match(controller,/if\(freshSignIn&&signedUid&&auth\?\.currentUser\?\.uid===signedUid\)await authSdk\.signOut\(auth\)/);
assert.doesNotMatch(controller,/\b(?:setDoc|addDoc|updateDoc|deleteDoc|writeBatch)\s*\(/);
assert.doesNotMatch(page,/\b(?:Save marks|Publish results|Print grade sheet)\b/i);
console.log('V47 shared-session read-only report preview wiring tests passed');
