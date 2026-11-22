import assert from 'node:assert/strict';
import {requireV47FirebaseProjectId,V47_FIREBASE_PROJECT_ID} from '../src/v47/isolated-project-guard.mjs';
assert.equal(V47_FIREBASE_PROJECT_ID,'smss-exam-portal-v47');
assert.equal(requireV47FirebaseProjectId('smss-exam-portal-v47'),'smss-exam-portal-v47');
for(const invalid of [undefined,null,'',' ','exam-portal-smss-95016','smss-exam-portal-v46','smss-exam-portal-v47-test','other-company-project','smss-exam-portal-v47 ','SMSS-EXAM-PORTAL-V47']){
 assert.throws(()=>requireV47FirebaseProjectId(invalid),/project|PROJECT_ID/,'Must reject unexpected Firebase project: '+String(invalid));
}
console.log('V47 trusted runtime Firebase project is exact-match isolated; V46 and arbitrary project IDs denied');
