import assert from 'node:assert/strict';import {neError,neRegistryIssue} from './nepali-feedback.mjs';import {readFileSync} from 'node:fs';
assert.match(neError({code:'auth/invalid-credential'}),/इमेल वा पासवर्ड/);assert.match(neError({code:'permission-denied'}),/अनुमति/);assert.doesNotMatch(neError({message:'secret technical detail'}),/secret/);assert.match(neRegistryIssue('Document ID is not a valid IEMIS number'),/मान्य IEMIS/);
for(const page of ['admin.html','admin-console.html','index.html']){const html=readFileSync(new URL('./'+page,import.meta.url),'utf8');assert.match(html,/Login<\/button>/);assert.match(html,/विद्यालय/)}
for(const page of ['marks-preview.html','ledger-exceptions.html','teacher-assigned-class.html','report-preview.html']){
 const html=readFileSync(new URL('./'+page,import.meta.url),'utf8');
 assert.match(html,/परीक्षण/);
 assert.match(html,/आधिकारिक/);
 assert.match(html,/<button[^>]*>[^<]*[A-Za-z][^<]*<\/button>/);
}
const report=readFileSync(new URL('./report-preview-console.mjs',import.meta.url),'utf8');
assert.match(report,/import \{neError\} from '\.\/nepali-feedback\.mjs'/);
assert.doesNotMatch(report,/status\(error\.message\)/);
console.log('PASS V47 Nepali feedback, auxiliary non-official warnings and English controls');
