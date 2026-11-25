import assert from 'node:assert/strict';
import {compareGrade9MathPrintedModel,getGrade9MathReference,assertGrade9MathReferencePaper,planGrade9MathReference as plan} from '../cdc-grade9-compulsory-math-grouped.mjs';
const grade=9,subject='Mathematics',r=getGrade9MathReference({grade,subject});
assert.deepEqual(r.areas.map(a=>a.items),[4,9,8,8,8,8,4]);
assert.deepEqual(r.areas.map(a=>a.groups),[1,3,3,3,3,2,1]);
assert.deepEqual(r.areas.map(a=>a.marks),[6,13,13,15,13,11,4]);
assert.equal(r.currentCdcExactApproved,false);
const topics=r.areas.map(a=>'topic-'+a.unitCode);
// Test-only constructed item splits: not actual questions or official model allocations.
const bank=r.areas.flatMap(a=>{
 const groups=Array.from({length:a.groups},()=>[]);
 let index=0;
 for(const [level,n] of Object.entries(a.itemsByLevel)){
  const total=a.marksByLevel[level];
  for(let i=0;i<n;i++)groups[index++%a.groups].push({cognitiveLevel:level,marks:Math.floor(total/n)+(i<total%n?1:0),textNe:'परीक्षण '+level+i,textEn:'Fixture '+level+i,answerNe:'उत्तर',answerEn:'Answer'});
 }
 return groups.flatMap((subquestions,i)=>[0,1].map(v=>({id:a.unitCode+'-'+i+'-'+v,unitCode:a.unitCode,gradeNumber:9,subject,topicId:'topic-'+a.unitCode,contextNe:'परीक्षण सन्दर्भ '+a.unitCode+' '+i+' '+v,contextEn:'Synthetic context '+a.unitCode+' '+i+' '+v,subquestions,status:'active',reviewStatus:'teacher_reviewed',reviewedBy:'fixture-only'})));
});
const args={grade,subject,questions:bank,selectedTopicIds:topics,rng:()=>.42};
const a=plan(args);assert.equal(a.ready,true,a.reason);assert.equal(a.paper.groups.length,16);assert.equal(a.itemCount,49);assert.equal(a.currentCdcExactApproved,false);
const b=plan({...args,previousSignature:a.signature,rng:()=>.61});assert.equal(b.ready,true,b.reason);assert.notEqual(b.signature,a.signature);
for(const mutate of [p=>p.groups.pop(),p=>p.groups[0].subquestions[0].marks++,p=>p.groups[0].subquestions.pop(),p=>p.groups[0].subquestions[0].cognitiveLevel='higher',p=>p.groups[0].contextEn='',p=>p.groups[0].reviewStatus='draft',p=>p.fullMarks=74]){
 const bad=structuredClone(a.paper);mutate(bad);assert.throws(()=>assertGrade9MathReferencePaper(bad),/reference mismatch/);
}
assert.equal(plan({...args,questions:bank.filter(q=>q.unitCode!=='7')}).ready,false);
assert.equal(plan({...args,selectedTopicIds:topics.slice(0,6)}).ready,false);
assert.throws(()=>plan({...args,subject:'Optional Mathematics'}),/reference mismatch/);
console.log('PASS Grade 9 compulsory math reference: 16 context groups,49 items,75 marks, all seven area cognitive item/mark totals, randomization and rejection');

const printed=compareGrade9MathPrintedModel();
assert.equal(printed.structureMatched,false); // Printed question marks sum to 74, despite 75-mark heading.
assert.deepEqual([printed.groupCount,printed.itemCount,printed.fullMarks],[16,49,74]);
assert.deepEqual(printed.cognitiveMarks,[11,19,30,14]);
assert.deepEqual(printed.differences,[{unitCode:'2',level:'higher',itemDelta:0,markDelta:-1},{unitCode:'4',level:'knowledge',itemDelta:-1,markDelta:-1},{unitCode:'4',level:'understanding',itemDelta:1,markDelta:1}]);
assert.equal(printed.withinPublishedCognitiveTolerance,true);
assert.equal(printed.exactCognitiveMatch,false);
assert.equal(printed.currentCdcExactApproved,false);
console.log('PASS printed Grade 9 compulsory math model metadata vs historical CDC chart; Arithmetic mark shortfall and Algebra difference reported, never auto-approved');
