import assert from 'node:assert/strict';
import {grade9ScienceSchoolReferenceBank as bank,planScienceSchoolReference as plan} from '../cdc-grade9-science-school-reference.mjs';
import {buildGrade9ReferencePreview,referencePreviewTopics} from '../cdc-grade9-reference-preview.mjs';
const grade=9,subject='Science and Technology',p=bank({grade,subject});
assert.equal(p.questions.length,80);
assert.equal(new Set(p.questions.map(q=>q.variantFamily)).size,40);
assert.equal(p.units[2].unitTitleEn,'Mushroom');
assert.equal(p.units[18].unitTitleEn,'Materials used in Agriculture');
const selectedTopicIds=referencePreviewTopics({grade,subject,questions:p.questions});
for(const language of ['ne','en','both']){
 const args={grade,subject,fullMarks:75,durationMinutes:180,language,questions:p.questions,selectedTopicIds,rng:()=>.32};
 const a=plan(args),b=plan({...args,previousSignature:a.signature});
 assert.equal(a.ready,true,a.reason);assert.equal(b.ready,true,b.reason);assert.notEqual(a.signature,b.signature);
 assert.equal(a.paper.questions.length,40);assert.equal(a.paper.questions.reduce((n,q)=>n+q.marks,0),75);assert.equal(a.currentCdcExactApproved,false);
 assert.equal(plan({...args,selectedTopicIds:selectedTopicIds.slice(0,18)}).ready,false);
 assert.equal(plan({...args,questions:p.questions.map(q=>({...q,marks:9}))}).ready,false);
 const preview=buildGrade9ReferencePreview(args);assert.equal(preview.ready,true);assert.match(preview.text,language==='ne'?/BESS २०७९ school annual reference/:/BESS 2079 school annual reference/);assert.match(preview.text,language==='ne'?/\[१\]/:/\[1\]/);
}
console.log('PASS 80 real science bilingual variants, 40 questions, exact BESS school unit weights and cognitive category counts; no current CDC approval');

const mapped=p.questions.map(q=>({...q,topicId:'school-topic-'+q.unitCode}));
const mappedIds=referencePreviewTopics({grade,subject,questions:mapped});
const mappedArgs={grade,subject,fullMarks:75,durationMinutes:180,language:'both',questions:mapped,selectedTopicIds:mappedIds,rng:()=>.32};
assert.equal(buildGrade9ReferencePreview(mappedArgs).ready,true);
assert.equal(plan({...mappedArgs,questions:mapped.map(q=>({...q,questionText:'tampered'}))}).ready,false);
assert.throws(()=>plan({...mappedArgs,questions:mapped.map(q=>({...q,topicId:mappedIds[0]})),selectedTopicIds:[mappedIds[0]]}),/crosses unit/);
console.log('PASS school curriculum topic remapping without accepting modified question content');
