import assert from 'node:assert/strict';
import {getCdcOptionalMathGuide,optionalMathAreaTopics} from '../cdc-optional-math-2082.mjs';
import {inspectCdcOptionalMathPaper} from '../cdc-optional-math-composite.mjs';

const levels=['knowledge','understanding','application','higher'];
const targets={knowledge:12,understanding:18,application:30,higher:15};
const wcaMarks=[[3,3,3],[3,3,4],[4,4,4],[3],[3],[3]];
const crossParts=[
 [[1,3],[2,3]], [[1,3],[3,3]],
 [[2,1],[3,2],[4,3]], [[5,3],[6,3]]
];
function fixture(grade,subject,version){
 const topics=optionalMathAreaTopics(grade,subject).map(x=>x.id+'_0');
 const out=[],put=(group,units,index)=>{
  const parts=units.map(([unitCode,mark],part)=>({
   unitCode:String(unitCode),marks:mark,cognitiveLevel:'knowledge',
   textNe:'कृत्रिम '+grade+' '+group+' '+index+' भाग '+part+' विकल्प '+version+' के हो?',
   answerNe:'नमुना उत्तर '+index+' '+part,
   textEn:'Synthetic '+group+' '+index+' part '+part+' version '+version+'?',
   answerEn:'Synthetic answer '+index+' '+part
  }));
  out.push({
   id:'synthetic-g'+grade+'-'+group+'-'+index+'-'+version,
   gradeNumber:grade,subject,reviewStatus:'teacher_reviewed',
   reviewedBy:'fixture-teacher',status:'active',group,
   topicId:topics[units[0][0]-1],
   contextNe:group==='objective'?'':'सन्दर्भ: कृत्रिम प्रश्न '+index+' संस्करण '+version,
   contextEn:group==='objective'?'':'Context: synthetic question '+index+' version '+version,
   subquestions:parts
  });
 };
 let i=0;
 for(const [unit,amount]of [2,3,3,1,1,1].entries())
  for(let j=0;j<amount;j++)put('objective',[[unit+1,1]],i++);
 i=0;
 for(const [unit,marks]of wcaMarks.entries())
  for(const mark of marks){
   put('WCA',mark===3?[[unit+1,1],[unit+1,2]]:
    [[unit+1,2],[unit+1,2]],i++);
  }
 i=0;
 for(const units of crossParts)put('CCA',units,i++);
 const pieces=out.flatMap(q=>q.subquestions).sort((a,b)=>b.marks-a.marks);
 const allocations={knowledge:0,understanding:0,application:0,higher:0};
 for(const part of pieces){
  const level=levels.find(l=>allocations[l]+part.marks<=targets[l]);
  assert.ok(level,'Synthetic fixture cognitive allocation impossible');
  part.cognitiveLevel=level;allocations[level]+=part.marks;
 }
 assert.deepEqual(allocations,targets);
 return {topics,questions:out};
}
for(const grade of [9,10]){
 const subject='Optional Mathematics',guide=getCdcOptionalMathGuide({grade,subject});
 const f=fixture(grade,subject,0),g=fixture(grade,subject,1);
 assert.equal(f.questions.length,27);
 const bank=[...f.questions,...g.questions];
 const result=inspectCdcOptionalMathPaper({
  guide,questions:bank,selectedTopicIds:f.topics,rng:()=>0.45,language:'ne'
 });
 assert.equal(result.ready,true,result.reason);
 assert.equal(result.questions.length,27);
 assert.deepEqual(result.groupMarks,{objective:11,WCA:40,CCA:24});
 assert.deepEqual(Object.values(result.areaMarks),[17,17,20,7,7,7]);
 assert.deepEqual(result.cognitiveMarks,targets);
 assert.equal(result.teacherReviewRequired,true);
 assert.equal(result.sourceApprovedByCdc,false);
 assert.equal(new Set(result.questions.map(x=>x.id)).size,27);
 const second=inspectCdcOptionalMathPaper({guide,questions:bank,
  selectedTopicIds:f.topics,previousSignature:result.signature,
  rng:()=>0.45,language:'ne'});
 assert.equal(second.ready,true,second.reason);
 assert.notEqual(second.signature,result.signature,'Consecutive papers may not repeat');
 const both=inspectCdcOptionalMathPaper({guide,questions:bank,
  selectedTopicIds:f.topics,rng:()=>0.45,language:'both'});
 assert.equal(both.ready,true,both.reason);
 const shortage=inspectCdcOptionalMathPaper({guide,
  questions:bank.filter(x=>x.group!=='CCA'),
  selectedTopicIds:f.topics,rng:()=>0.45});
 assert.equal(shortage.ready,false,'No cross-area bank must block Exact');
 assert.equal(shortage.crossAvailable,0);
 const wrongGrade=inspectCdcOptionalMathPaper({guide,
  questions:bank.map(x=>({...x,gradeNumber:grade===9?10:9})),
  selectedTopicIds:f.topics,rng:()=>0.45});
 assert.equal(wrongGrade.ready,false,'Cross-grade questions must never be accepted');
 const unreviewed=inspectCdcOptionalMathPaper({guide,
  questions:bank.map(x=>({...x,reviewStatus:'draft'})),
  selectedTopicIds:f.topics,rng:()=>0.45});
 assert.equal(unreviewed.ready,false,'Draft bank must never count as curated');
 const missingAnswer=inspectCdcOptionalMathPaper({guide,
  questions:bank.map(x=>({...x,
   subquestions:x.subquestions.map(s=>({...s,answerNe:''}))})),
  selectedTopicIds:f.topics,rng:()=>0.45});
 assert.equal(missingAnswer.ready,false,'Unanswered bank must not be eligible');
 const corrupted=structuredClone(bank);
 corrupted.filter(x=>x.group==='CCA').forEach(x=>{
  const code=x.subquestions[0].unitCode;
  x.subquestions.forEach(s=>{s.unitCode=code;});
 });
 const invalidCross=inspectCdcOptionalMathPaper({guide,questions:corrupted,
  selectedTopicIds:f.topics,rng:()=>0.45});
 assert.equal(invalidCross.ready,false,'CCA must involve multiple content areas');
 assert.throws(()=>inspectCdcOptionalMathPaper({guide,
  questions:bank,selectedTopicIds:f.topics,language:'xx'}),/Invalid composite/);
 console.log('PASS CDC 2082 Optional Math Grade '+grade+': 27 grouped questions, 75 exact marks,');
 console.log('6 exact area marks, 4 cognitive totals, bilingual, no repeat, reviewed-only');
}
