import assert from 'node:assert/strict';
import {getNepali2078Reference,checkNepali2078GroupedDraft} from '../cdc-grade9-nepali-model-2078.mjs';
import {auditGrade9ModelReference} from '../cdc-grade9-model-reference-audit.mjs';
const r=getNepali2078Reference();
assert.deepEqual(r.areaMarks,[6,3,15,9,4,4,4,12,4,7,7]);
assert.deepEqual(r.slots.map(s=>s.marks),[2,2,2,1,2,3,4,2,2,4,4,5,4,4,4,8,4,4,7,7]);
assert.deepEqual(r.slots.filter(s=>s.offered>1).map(s=>[s.number,s.offered,s.answerCount]),[[13,2,1],[14,2,1],[16,3,2],[18,2,1],[19,2,1],[20,3,1]]);
assert.equal(r.currentCdcExactApproved,false);
const paper={gradeNumber:9,fullMarks:75,durationMinutes:180,groups:r.slots.map(s=>({number:s.number,skill:s.skill,cognitiveLevel:s.cognitiveLevel,answerCount:s.answerCount,marks:s.marks,choices:Array.from({length:s.offered},(_,i)=>({id:s.number+'-'+i,text:'Synthetic test prompt '+s.number+'-'+i,answer:'Synthetic answer',marks:s.marksPerChoice,components:s.componentMarks?.map((marks,j)=>({text:'component '+j,answer:'answer',marks}))}))}))};
assert.deepEqual(checkNepali2078GroupedDraft(paper),{referenceStructureMatched:true,fullMarks:75,groupCount:20,currentCdcExactApproved:false,teacherReviewRequired:true});
for(const mutate of [p=>p.groups[5].marks=2,p=>p.groups[12].choices.pop(),p=>p.groups[15].answerCount=3,p=>p.groups[19].choices[1].id=p.groups[19].choices[0].id,p=>p.groups[0].choices[0].components[0].marks=1,p=>p.groups[9].choices[0].answer='',p=>p.groups.reverse()]){
 const bad=structuredClone(paper);mutate(bad);assert.throws(()=>checkNepali2078GroupedDraft(bad),/Nepali reference mismatch/);
}
const audit=auditGrade9ModelReference({grade:9,subject:'Nepali'});
assert.equal(audit.modelCount,20);
assert.equal(audit.areas.length,11);
assert.equal(audit.currentCdcExactApproved,false);
console.log('PASS visually checked Grade9 Nepali reference: 20 groups, 75 marks, optional choices, component counts and no current-grid approval');
