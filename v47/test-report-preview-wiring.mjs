import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('./',import.meta.url);
const page=readFileSync(new URL('report-preview.html',root),'utf8');
const controller=readFileSync(new URL('report-preview-console.mjs',root),'utf8');
const hub=readFileSync(new URL('index.html',root),'utf8');
assert.match(hub,/href="\.\/report-preview\.html"/);
assert.match(page,/src="\.\/report-preview-console\.mjs"/);
for(const id of ['config','connect','schoolId','email','password','login','logout','report','school','counts','message'])
 assert.match(page,new RegExp('id="'+id+'"'));
assert.match(controller,/createV46ReadOnlyBridge\(/);
assert.match(controller,/bridge\.loadExamReportRows\(\)/);
assert.match(controller,/rows\.publicationAllowed!==false\|\|rows\.complete!==false/);
assert.match(controller,/authSdk\.inMemoryPersistence/);
assert.match(controller,/config\.projectId!=='smss-exam-portal-v47'/);
assert.doesNotMatch(controller,/\b(?:setDoc|addDoc|updateDoc|deleteDoc|writeBatch)\s*\(/);
assert.doesNotMatch(page,/\b(?:Save marks|Publish results|Print grade sheet)\b/i);
console.log('V47 read-only report preview wiring tests passed');
