import assert from 'node:assert/strict';
import {auditGrade9ModelReference as audit} from '../cdc-grade9-model-reference-audit.mjs';
import {grade9SocialOriginalBank} from '../cdc-grade9-social-original-practice.mjs';
import {grade9EnvironmentOriginalBank} from '../cdc-grade9-environment-original-practice.mjs';
import {grade9ScienceOriginalBank} from '../cdc-grade9-science-original-practice.mjs';
const social='Social Studies',env='Environmental Science',science='Science and Technology';
const s=audit({grade:9,subject:social,questions:grade9SocialOriginalBank({grade:9,subject:social}).questions});
assert.deepEqual(s.unitMarks,[5,5,8,6,11,11,9,9,6,5]);
assert.deepEqual(s.cognitiveMarks,[28,25,22]);
assert.equal(s.modelCount,24);assert.ok(s.missingAtLeast>0);
assert.equal(s.slots.find(x=>x.historicUnit===7).currentUnit,8);
assert.equal(s.slots.find(x=>x.historicUnit===8).currentUnit,7);
assert.equal(s.groups[0].missing,1);
const e=audit({grade:9,subject:env,questions:grade9EnvironmentOriginalBank({grade:9,subject:env}).questions});
assert.equal(e.olderModelConflict,true);assert.equal(e.missingAtLeast,22);
assert.deepEqual(e.groups.map(g=>[g.required,g.marks]),[[11,1],[8,5],[3,8]]);
const a=audit({grade:9,subject:science,questions:grade9ScienceOriginalBank({grade:9,subject:science}).questions});
assert.equal(a.modelCount,40);assert.ok(a.limitations.some(x=>x.includes('74')));
assert.equal(a.missingAtLeast,0,'Aggregate quantities do not prove unit or cognitive matching');
for(const subject of ['Nepali','English','Mathematics',social,env,science]){
 const r=audit({grade:9,subject});
 assert.equal(r.fullMarks,75);assert.equal(r.currentCdcExactApproved,false);assert.equal(r.readyForLive,false);
}
assert.equal(audit({grade:8,subject:social}),null);
assert.equal(audit({grade:9,subject:'Optional Mathematics'}),null);
console.log('PASS six Grade 9 reference comparisons, visual social transcription, conflicting environment models, bank gaps and no false CDC approval');
