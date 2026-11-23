import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {readBundledScienceBank,buildAutomaticQuestionPaper,cognitiveMarkDistribution} from '../cdc-question-autogen.mjs';
const source=readFileSync(new URL('../cdc-question-paper.js',import.meta.url),'utf8');
const code=(start,end)=>{
 const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
 assert.ok(a>=0&&b>a,'Missing original V46 UI function '+start);
 return source.slice(a,b);
};
const shell=new Function(code('function pageShell() {','function selectedTopicIds() {')+'return pageShell;')();
const dom=new JSDOM('<!doctype html><html><body>'+shell+'</body></html>',{url:'https://example.test'});
const $=id=>dom.window.document.getElementById(id);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normal=s=>String(s||'').trim().toLocaleLowerCase().replace(/\s+/g,' ');
for(const id of ['qpClass','qpSubject','qpSection','qpPaperFullMarks','qpAutoLanguage',
 'qpSmartGenerateBtn','qpGenerateBtn','qpTopicSelectAll','qpTopicClearAll','qpSelectGridUnits',
 'qpSavePaperBtn','qpPrintPaperBtn','qpAnswerKeyBtn','qpPaperPreview','qpAutoReviewed','qpAutoMode','qpAutoGridStatus'])
 assert.ok($(id),'Expected actual DOM control '+id);
assert.deepEqual([...$('qpAutoLanguage').options].map(x=>x.value),['ne','en','both']);
assert.equal($('qpSourceDetails').open,false,'Long CDC source lists should be collapsed by default');
assert.equal($('qpManualQuestions').open,false,'No typing required for the teacher default path');
assert.ok($('qpQuestionForm'),'Existing manual bank form must be preserved for admins');
const css=dom.window.document.querySelector('style').textContent;
assert.match(css,/#qpTopicCard\{order:1\}/);
assert.match(css,/#qpPaperComposer\{order:2\}/);
assert.ok($('qpPaperComposer')&&$('qpTopicCard')&&$('qpSavedPapers'));

assert.equal($('qpSavePaperBtn').disabled,true,'No paper saved before generation');
const pack=JSON.parse(readFileSync(new URL('../data/cdc-grade10-science-practice-pack-v1.json',import.meta.url),'utf8'));
assert.equal(/[\u0D00-\u0D7F]/.test(JSON.stringify(pack)),false,'No Malayalam-script typo in Nepali source');
const translated=JSON.parse(readFileSync(new URL('../data/cdc-science-bilingual-mcq-v1.json',import.meta.url),'utf8'));
const bank=readBundledScienceBank(pack,{grade:10,subject:'Science and Technology',bilingual:translated.translations});
const renderTopics=new Function('$','esc','normal','curriculumRows',
 'bundledPracticeUnits','bundledPracticeQuestions','questionRows',
 code('function renderTopics() {','function renderQuestionRows() {')+
 'return renderTopics;')($,escape,normal,[],bank.units,bank.questions,[]);
renderTopics();
assert.equal(dom.window.document.querySelectorAll('[data-qp-topic]').length,19);
assert.equal(dom.window.document.querySelectorAll('[data-qp-topic]:checked').length,19);
assert.equal($('qpTopicCount').textContent,'19 Topic');
assert.equal(dom.window.document.querySelector('[data-qp-topic]').dataset.unitCode,'1');
assert.match(source,/if\(t.id==="qpSelectGridUnits"\)/);
const checkboxes=[...dom.window.document.querySelectorAll('[data-qp-topic]')];
for(const [i,input]of checkboxes.entries())input.checked=i<3;
$('qpAutoLanguage').value='both';$('qpPaperFullMarks').value='3';
$('qpAutoMode').value='practice';
const renderPaperPreview=new Function('$','esc','questionTypeLabel','levelLabel','generatedPaper',
 code('function renderPaperPreview(','function printPaper(')+'return renderPaperPreview;')(
 $,escape,t=>({mcq:'MCQ',short:'Short',long:'Long'})[t]||t,x=>x,null);
let lastMessage='';
const make=(overrides={})=>{
 const props={
  roleCanTeach:()=>true,
  questionDataLoadEpoch:1,
  verifiedQuestionSelection:{className:'Class 10',subject:'Science and Technology',section:'A',request:1},
  auth:{currentUser:{uid:'admin-unit'}},
  schoolHeader:async()=>({schoolName:'Test School',schoolAddress:'Test Address'}),
  ...overrides
 };
 const params=['$','roleCanTeach','buildAutomaticQuestionPaper','selectedTopicIds',
  'schoolHeader','gradeNumber','renderPaperPreview','message','selectedClass',
  'selectedSubject','selectedSection','questionDataLoadEpoch',
  'verifiedQuestionSelection','questionRows','bundledPracticeQuestions',
  'currentBlueprint','auth','blueprintRows','cognitiveMarkDistribution'];
 const fn=new Function(...params,'let generatedPaper=null,lastAutoSignature=null;\n'+
  code('function updateAutoReviewActions()','function renderPaperPreview(')+
  code('function blueprintForFullMarks(','async function generateSmartPaper()')+
  code('async function generateSmartPaper()','async function savePaper()')+
  'return {run:generateSmartPaper,getPaper:()=>generatedPaper};');
 return fn($,props.roleCanTeach,buildAutomaticQuestionPaper,
  ()=>[...dom.window.document.querySelectorAll('[data-qp-topic]:checked')].map(x=>x.value),
  props.schoolHeader,v=>Number(String(v).match(/[0-9]+/)?.[0]||0),
  ()=>{},msg=>{lastMessage=msg},
  'Class 10','Science and Technology','A',props.questionDataLoadEpoch,
  props.verifiedQuestionSelection,[],bank.questions,null,props.auth,[],cognitiveMarkDistribution);
};
const live=make();
await live.run();
const paper=live.getPaper();
assert.ok(paper);
assert.equal(paper.questions.length,3);
assert.equal(paper.questions.reduce((n,q)=>n+Number(q.marks),0),3);
assert.equal(new Set(paper.questions.map(q=>q.topicName)).size,3);
assert.ok(paper.questions.every(q=>q.questionText.includes('\n')));
assert.equal(paper.qualityReport.teacherReviewRequired,true);
const uneven=cognitiveMarkDistribution([
 {marks:1,cognitiveLevel:'knowledge'},
 {marks:5,cognitiveLevel:'application'}
],6);
assert.ok(Math.abs(uneven.knowledge-100/6)<1e-10,'1-mark question must be 1/6 of the paper');
assert.ok(Math.abs(uneven.application-500/6)<1e-10,'5-mark question must be 5/6 of the paper');
assert.equal(uneven.understanding,0);
assert.throws(()=>cognitiveMarkDistribution([
 {marks:1,cognitiveLevel:'knowledge'}
],6),/total does not match/);
assert.ok(Math.abs(Object.values(paper.qualityReport.cognitiveActual).reduce((a,b)=>a+b,0)-100)<1e-9);
assert.equal($('qpSavePaperBtn').disabled,true,'Teacher review needed before saving');
assert.equal($('qpPrintPaperBtn').disabled,true,'Teacher review needed before printing');
assert.equal($('qpAnswerKeyBtn').disabled,true,'Teacher review needed before answer key');
$('qpAutoReviewed').checked=true;
const approved=make();
await approved.run();
assert.equal($('qpAutoReviewed').checked,false,'New generation invalidates earlier review');
$('qpAutoReviewed').checked=true;
const reviewActionSource=code('function updateAutoReviewActions()','function invalidateGeneratedQuestionPaper()');
const approve=new Function('$','generatedPaper',reviewActionSource+'return updateAutoReviewActions;')($,approved.getPaper());
approve();
assert.equal($('qpSavePaperBtn').disabled,false);
assert.equal($('qpPrintPaperBtn').disabled,false);
assert.equal($('qpAnswerKeyBtn').disabled,false);
assert.match(lastMessage,/पूर्णाङ्क/);
renderPaperPreview(paper);
assert.match($('qpPaperPreview').textContent,/संज्ञानात्मक अङ्कभार/);
// Exercise persisted per-question Grid provenance and the teacher-only table.
const sample={...paper,questions:paper.questions.map((q,i)=>({
 ...q,gridEvidence:{questionId:q.questionId,unitCode:String(i+1),
  questionType:q.questionType,marks:Number(q.marks),
  cognitiveLevel:q.cognitiveLevel,topicId:'unit'+i}
}))};
renderPaperPreview(sample);
const audit=$('qpPaperPreview').querySelector('#qpGridAudit');
assert.ok(audit,'Teacher must see per-unit mark/type/level Grid evidence');
assert.match(audit.textContent,/जम्मा पूर्णाङ्क/);
assert.equal(audit.querySelectorAll('tbody tr').length,paper.questions.length);
assert.equal(audit.querySelector('tfoot th:nth-child(2)').textContent.trim(),'3');
assert.equal($('qpPaperPreview').querySelector('#qpPrintArea #qpGridAudit'),null,
 'Grid audit must stay outside the student print area');
renderPaperPreview(paper);
const preview=$('qpPaperPreview').querySelector('#qpPrintArea');
assert.ok(preview);
assert.match(preview.textContent,/CDC प्रकाशित नमुना होइन/);
assert.match(preview.textContent,/Science and Technology/);
assert.match(preview.textContent,/पूर्णाङ्क: 3/);
let generatedPrint='',printCount=0;
const fakeWindow={open:()=>({
 document:{write:s=>{generatedPrint=s},close:()=>{}},
 focus:()=>{},print:()=>{printCount++}
})};
const printPaper=new Function('$','esc','message','window','generatedPaper',
 code('function printPaper(','async function loadClassSubjects()')+'return printPaper;')(
 $,escape,()=>{},fakeWindow,null);
printPaper(approved.getPaper(),true);
assert.equal(printCount,1);
assert.match(generatedPrint,/white-space:pre-line/);
assert.match(generatedPrint,/CDC प्रकाशित नमुना होइन/);
assert.match(generatedPrint,/उत्तरकुञ्जिका/);
assert.match(generatedPrint,/Test School/);
const viewer=make({roleCanTeach:()=>false});
await assert.rejects(viewer.run(),/अनुमति/);
const stale=make({verifiedQuestionSelection:{className:'Class 10',subject:'Science and Technology',section:'A',request:0}});
await assert.rejects(stale.run(),/लोड भएको छैन/);
let resumeHeader;
const delayed=make({schoolHeader:()=>new Promise(res=>{resumeHeader=res})});
const pending=delayed.run();
const classBefore=dom.window.document.querySelector('[data-qp-topic]:checked');
classBefore.checked=false;
resumeHeader({schoolName:'Too late'});
await assert.rejects(pending,/परिवर्तन भयो/);
assert.equal(delayed.getPaper(),null,'Changing topics during school read cannot generate a stale paper');
// Same topic name in two CDC units must remain TWO distinct selectable
// topics, never silently use another unit's exam questions.
const repeatTopicRender=new Function(
 '$','esc','normal','curriculumRows',
 'bundledPracticeUnits','bundledPracticeQuestions','questionRows',
 code('function renderTopics() {','function renderQuestionRows() {')+
 'return renderTopics;'
)($,escape,normal,[
 {id:'curr1',unitCode:'1',unitTitle:'Motion',topics:['Force']},
 {id:'curr2',unitCode:'2',unitTitle:'Energy',topics:['Force']}
],[],[],[]);
repeatTopicRender();
const repeatNodes=[...dom.window.document.querySelectorAll('[data-qp-topic]')];
assert.equal(repeatNodes.length,2,'Equal topic names from different units must remain separate');
assert.deepEqual(repeatNodes.map(x=>x.dataset.unitCode),['1','2']);
assert.notEqual(repeatNodes[0].value,repeatNodes[1].value);
dom.window.close();
console.log('PASS V46 DOM auto question paper: class 10, unit choices, bilingual, review gate, random practice and topic-unit isolation');
