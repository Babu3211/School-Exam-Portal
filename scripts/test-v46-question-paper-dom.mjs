import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {readBundledScienceBank,buildAutomaticQuestionPaper} from '../cdc-question-autogen.mjs';
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
 'qpSmartGenerateBtn','qpGenerateBtn','qpTopicSelectAll','qpTopicClearAll',
 'qpSavePaperBtn','qpPrintPaperBtn','qpAnswerKeyBtn','qpPaperPreview'])
 assert.ok($(id),'Expected actual DOM control '+id);
assert.deepEqual([...$('qpAutoLanguage').options].map(x=>x.value),['ne','en','both']);
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
const checkboxes=[...dom.window.document.querySelectorAll('[data-qp-topic]')];
for(const [i,input]of checkboxes.entries())input.checked=i<3;
$('qpAutoLanguage').value='both';$('qpPaperFullMarks').value='3';
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
  'currentBlueprint','auth'];
 const fn=new Function(...params,'let generatedPaper=null;\n'+
  code('async function generateSmartPaper()','async function savePaper()')+
  'return {run:generateSmartPaper,getPaper:()=>generatedPaper};');
 return fn($,props.roleCanTeach,buildAutomaticQuestionPaper,
  ()=>[...dom.window.document.querySelectorAll('[data-qp-topic]:checked')].map(x=>x.value),
  props.schoolHeader,v=>Number(String(v).match(/[0-9]+/)?.[0]||0),
  ()=>{},msg=>{lastMessage=msg},
  'Class 10','Science and Technology','A',props.questionDataLoadEpoch,
  props.verifiedQuestionSelection,[],bank.questions,null,props.auth);
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
assert.equal($('qpSavePaperBtn').disabled,false);
assert.equal($('qpPrintPaperBtn').disabled,false);
assert.equal($('qpAnswerKeyBtn').disabled,false);
assert.match(lastMessage,/पूर्णाङ्क/);
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
printPaper(paper,true);
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
dom.window.close();
console.log('PASS V46 DOM auto question paper: class 10, unit choices, bilingual 3 marks, buttons, printed answers and warnings, role, stale selection');
