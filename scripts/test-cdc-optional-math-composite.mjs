import assert from 'node:assert/strict';
import {getCdcOptionalMathGuide,optionalMathAreaTopics,optionalMathOriginalSlots,optionalMathCellAudit} from '../cdc-optional-math-2082.mjs';
import {inspectCdcOptionalMathPaper} from '../cdc-optional-math-composite.mjs';
import {renderCdcCompositePaper,paperDigits,paperSubjectLabel} from '../cdc-optional-math-render.mjs';

const levels=['knowledge','understanding','application','higher'];
const targets={knowledge:12,understanding:18,application:30,higher:15};
function fixture(grade,subject,version){
 const topics=optionalMathAreaTopics(grade,subject).map(x=>x.id+'_0');
 const out=[],put=(group,units,index)=>{
  const parts=units.map(([unitCode,mark,cognitiveLevel],part)=>({
   unitCode:String(unitCode),marks:mark,cognitiveLevel,
   textNe:'कृत्रिम '+grade+' '+group+' '+index+' भाग '+part+' विकल्प '+version+' के हो?',
   answerNe:'नमुना उत्तर '+index+' '+part,
   textEn:'Synthetic '+group+' '+index+' part '+part+' version '+version+'?',
   answerEn:'Synthetic answer '+index+' '+part
  }));
  out.push({
   id:'synthetic-g'+grade+'-'+group+'-'+index+'-'+version,
   gradeNumber:grade,subject,reviewStatus:'teacher_reviewed',
   reviewedBy:'fixture-teacher',status:'active',group,
   variantFamily:'synthetic-g'+grade+'-'+group+'-'+index,
   topicId:topics[units[0][0]-1],
   contextNe:group==='objective'?'':'सन्दर्भ: कृत्रिम प्रश्न '+index+' संस्करण '+version,
   contextEn:group==='objective'?'':'Context: synthetic question '+index+' version '+version,
   subquestions:parts
  });
 };
 for(const [index,slot] of optionalMathOriginalSlots(getCdcOptionalMathGuide({grade,subject})).entries())put(slot.group,slot.parts,index);
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
 assert.equal(result.cellAudit.matches,true);
 const altered=structuredClone(result.questions);
 const a=altered.find(q=>q.group==='objective'&&q.subquestions[0].unitCode==='1'&&q.subquestions[0].cognitiveLevel==='knowledge').subquestions[0];
 const z=altered.find(q=>q.group==='objective'&&q.subquestions[0].unitCode==='4').subquestions[0];
 [a.cognitiveLevel,z.cognitiveLevel]=[z.cognitiveLevel,a.cognitiveLevel];
 assert.equal(optionalMathCellAudit(guide,altered).matches,false);
 assert.equal(inspectCdcOptionalMathPaper({guide,questions:altered,selectedTopicIds:f.topics,rng:()=>.45,language:'ne'}).ready,false);
 const forgedGuide=structuredClone(guide);forgedGuide.areas[0].marksByGroup.WCA[0]++;
 assert.throws(()=>inspectCdcOptionalMathPaper({guide:forgedGuide,questions:bank,selectedTopicIds:f.topics,rng:()=>.45}),/cells differ/);
 const paper={questionFormat:'cdc_optional_math_composite',
  language:'both',schoolName:'कृत्रिम विद्यालय',schoolAddress:'काठमाडौँ',
  paperTitle:'कृत्रिम परीक्षा',className:'Class '+grade,subject,
  academicYear:'2083',durationMinutes:180,fullMarks:75,
  questions:result.questions};
 const escapeHtml=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
 const nePreview=renderCdcCompositePaper({...paper,language:'ne'},{escapeHtml});
 assert.match(nePreview,/ऐच्छिक गणित/);assert.match(nePreview,/पूर्णाङ्क: ७५/);assert.match(nePreview,/समूह क/);assert.match(nePreview,/१\./);
 const preview=renderCdcCompositePaper(paper,{escapeHtml});
 const answer=renderCdcCompositePaper(paper,{escapeHtml,answerKey:true});
 assert.match(preview,/id="qpPrintArea"/);
 assert.match(preview,/Within Content Area/);
 assert.match(preview,/Cross Content Area/);
 assert.match(preview,/FM: 75/);
 assert.match(preview,/कृत्रिम/);
 assert.match(preview,/Synthetic/);
 assert.match(answer,/Teacher Answer Key/);
 assert.match(answer,/Synthetic answer/);
 assert.doesNotMatch(answer,/id="qpPrintArea"/);
 const dangerous=structuredClone(paper);
 dangerous.questions[0].subquestions[0].textNe='<script>alert("hack")</script> नेपाली';
 const safePreview=renderCdcCompositePaper(dangerous,{escapeHtml});
 assert.doesNotMatch(safePreview,/<script>/);
 assert.match(safePreview,/&lt;script&gt;/);
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

assert.equal(paperDigits('2083 / 75.5','ne'),'२०८३ / ७५.५');
assert.equal(paperSubjectLabel('Optional Mathematics','ne'),'ऐच्छिक गणित');
