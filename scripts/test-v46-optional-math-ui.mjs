import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {getCdcOptionalMathGuide} from '../cdc-optional-math-2082.mjs';
import {renderCdcCompositePaper} from '../cdc-optional-math-render.mjs';

const source=readFileSync(new URL('../cdc-question-paper.js',import.meta.url),'utf8');
const start=source.indexOf('async function generateOptionalMathCompositePaper(guide){');
const end=source.indexOf('async function generateSmartPaper(){',start);
assert.ok(start>0&&end>start);
const liveFunction=source.slice(start,end);
const subject='Optional Mathematics';
const guide=getCdcOptionalMathGuide({grade:9,subject});
const topics=['1','2','3','4','5','6'].map(u=>'cdc_optional_math_2082_g9_u'+u+'_0');
const questions=[];
for(const [group,count,marks]of [['objective',11,[1]],['WCA',8,[1,2]],
 ['WCA',4,[2,2]],['CCA',4,[3,3]]]){
 for(let j=0;j<count;j++){
  const no=questions.length+1;
  questions.push({id:'test-q-'+no,group,
   contextNe:group==='objective'?'':'सन्दर्भ '+no,
   contextEn:group==='objective'?'':'Context '+no,
   subquestions:marks.map((mark,k)=>({
    unitCode:String((no%6)+1),marks:mark,cognitiveLevel:'application',
    textNe:'नमुना प्रश्न '+no+' '+k,answerNe:'नमुना उत्तर',
    textEn:'Sample question '+no+' '+k,answerEn:'Sample answer'
   }))
  });
 }
}
assert.equal(questions.length,27);
const signature=questions.map(q=>q.id).sort().join('|');
const goodPlan={ready:true,questions,signature,
 cognitiveMarks:{knowledge:12,understanding:18,application:30,higher:15},
 areaRows:[],crossAvailable:4};
const html='<input id="qpPaperFullMarks" value="75">'+
 '<input id="qpPaperDuration" value="180">'+
 '<input id="qpAutoMode" value="cdc">'+
 '<input id="qpAutoLanguage" value="both">'+
 '<input id="qpPaperTitle" value="Annual Exam">'+
 '<input id="qpPaperYear" value="2083">'+
 '<input id="qpAutoReviewed" type="checkbox" checked>';
const prelude=[
 "const $=id=>doc.getElementById(id);",
 "const roleCanTeach=allow,selectedTopicIds=()=>topics;",
 "const inspectCdcOptionalMathPaper=inspection,schoolHeader=header;",
 "const originalOptionalMathPracticeBank=offlineBank;",
 "const gradeNumber=s=>Number(String(s).match(/[0-9]+/)?.[0]||0);",
 "const auth={currentUser:{uid:'teacher-fixture'}};",
 "let selectedClass='Class 9',selectedSubject='Optional Mathematics',selectedSection='A';",
 "let questionDataLoadEpoch=3;",
 "let verifiedQuestionSelection={className:selectedClass,subject:selectedSubject,section:selectedSection,request:3};",
 "let questionRows=[],savedPapers=[],lastAutoSignature=null,generatedPaper=null;",
 "let renderCount=0,reviewCount=0;",
 "const renderPaperPreview=()=>{renderCount++;};",
 "const updateAutoReviewActions=()=>{reviewCount++;};",
 "const message=msg=>logs.push(msg);"
].join('\n')+'\n';
const factory=new Function('doc','allow','topics','inspection','header','logs',
 'guide','offlineBank',prelude+liveFunction+
 'return {run:()=>generateOptionalMathCompositePaper(guide),'+
 'getPaper:()=>generatedPaper,signature:()=>lastAutoSignature,'+
 'counters:()=>[renderCount,reviewCount],'+
 'setHistory:rows=>{savedPapers=rows;},'+
 'changeClass:()=>{selectedClass="Class 10";questionDataLoadEpoch++;},'+
 'changeDuration:()=>{$("qpPaperDuration").value="120";}};');
function make(options={}){
 const doc=new JSDOM(html).window.document;
 const inspections=[],logs=[];
 const inspect=arg=>{inspections.push(arg);return options.plan||goodPlan;};
 let resolveHeader;
 const header=options.delayed?()=>new Promise(resolve=>{resolveHeader=resolve;}):
  async()=>({schoolName:'Test School',schoolAddress:'Nepal'});
 const api=factory(doc,options.allow||(()=>true),topics,inspect,header,logs,guide,
  ()=>({questions:[]}));
 return {...api,inspections,logs,doc,
  finish:()=>resolveHeader?.({schoolName:'Test School',schoolAddress:'Nepal'})};
}
const ok=make();
await ok.run();
const paper=ok.getPaper();
assert.equal(paper.questionFormat,'cdc_optional_math_composite');
assert.equal(paper.fullMarks,75);
assert.equal(paper.questions.length,27);
assert.equal(paper.language,'both');
assert.equal(paper.sourceUrl,guide.sourceUrl);
assert.equal(paper.qualityReport.exactGridMatched,true);
assert.equal(paper.qualityReport.teacherReviewRequired,true);
assert.equal(paper.questions[0].questionId,'test-q-1');
assert.equal(ok.doc.getElementById('qpAutoReviewed').checked,false);
assert.deepEqual(ok.counters(),[1,1]);
assert.equal(ok.signature().signature,signature);
const escapeHtml=s=>String(s).replace(/&/g,'&amp;')
 .replace(/</g,'&lt;').replace(/>/g,'&gt;');
assert.match(renderCdcCompositePaper(paper,{escapeHtml}),/Within Content Area/);
assert.match(renderCdcCompositePaper(paper,{escapeHtml,answerKey:true}),/Teacher Answer Key/);
const repeat=make();
repeat.setHistory([{className:'Class 9',subject,section:'A',
 questionFormat:'cdc_optional_math_composite',fullMarks:75,questions:paper.questions}]);
await repeat.run();
assert.deepEqual(repeat.inspections[0].avoidSignatures,[signature]);
const empty=make({plan:{...goodPlan,ready:false,crossAvailable:0}});
await assert.rejects(()=>empty.run(),/संयुक्त प्रश्न बैंक अपूरो/);
assert.equal(empty.getPaper(),null);
const denied=make({allow:()=>false});
await assert.rejects(()=>denied.run(),/कक्षा, विषय, चयन/);
assert.equal(denied.inspections.length,0);
const changed=make({delayed:true});
const request=changed.run();
changed.changeClass();changed.finish();
await assert.rejects(request,/Login वा कक्षा\/विषय\/Topic परिवर्तन/);
assert.equal(changed.getPaper(),null,'stale class must never publish a paper');
const changedTime=make({delayed:true});
const requestTime=changedTime.run();
changedTime.changeDuration();changedTime.finish();
await assert.rejects(requestTime,/Login वा कक्षा\/विषय\/Topic परिवर्तन/);
console.log('PASS real V46 CDC 2082 Optional Math UI: 27 questions, saved history,');
console.log('bilingual print and answer key, review gate, stale class and duration refusal');
