import assert from 'node:assert/strict';import {neError,neRegistryIssue} from './nepali-feedback.mjs';import {readFileSync} from 'node:fs';
assert.match(neError({code:'auth/invalid-credential'}),/इमेल वा पासवर्ड/);assert.match(neError({code:'permission-denied'}),/अनुमति/);assert.doesNotMatch(neError({message:'secret technical detail'}),/secret/);assert.match(neRegistryIssue('Document ID is not a valid IEMIS number'),/मान्य IEMIS/);
assert.match(neError(Error('School ID must be an IEMIS number string (5–20 digits)')), /५–२० अङ्क/);
assert.match(neError(Error('Membership unavailable')), /सक्रिय सदस्यता/);
assert.match(neError(Error('School unavailable')), /विद्यालय उपलब्ध छैन/);
assert.match(neError(Error('Authentication changed during verification')), /फेरि लगइन/);
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

assert.match(neError({code:'smss/incomplete-legacy-grid',reportCounts:{students:22,subjects:8,records:22,expected:176}}),/176 अभिलेख/);
assert.doesNotMatch(neError({code:'smss/incomplete-legacy-grid',reportCounts:{students:'private',subjects:8,records:22,expected:176}}),/private/);
assert.match(neError(Error('No matching records for selected exam')),/अङ्क अभिलेख भेटिएनन्/);
