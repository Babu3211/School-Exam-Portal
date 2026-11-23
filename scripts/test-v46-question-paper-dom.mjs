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
 'qpSavePaperBtn','qpPrintPaperBtn','qpAnswerKeyBtn','qpPaperPreview','qpAutoReviewed','qpAutoMode','qpAutoGridStatus',
 'qpQuestionExcelTemplateBtn','qpQuestionExcelFile','qpQuestionTemplateBtn','qpQuestionImportFile',
 'qpBpGridExcelTemplateBtn','qpBpGridExcelFile','qpBpGridFile'])
 assert.ok($(id),'Expected actual DOM control '+id);
assert.deepEqual([...$('qpAutoLanguage').options].map(x=>x.value),['ne','en','both']);
assert.equal($('qpSourceDetails').open,false,'Long CDC source lists should be collapsed by default');
assert.equal($('qpManualQuestions').open,false,'No typing required for the teacher default path');
assert.ok($('qpQuestionForm'),'Existing manual bank form must be preserved for admins');
assert.match(source,/async function importCdcGridExcel\(file\)/);
assert.match(source,/function invalidateCdcGridSourceReview\(\)/);
assert.match(source,/\["qpBpUnitGrid","qpBpFullMarks","qpBpVersion","qpBpSourceTitle"/);
const revokeGridApproval=new Function('$',
 code('function invalidateCdcGridSourceReview()','document.addEventListener("input"')+
 'return invalidateCdcGridSourceReview;')($);
$('qpBpSourceReviewed').checked=true;
revokeGridApproval();
assert.equal($('qpBpSourceReviewed').checked,false,
 'Editing the reviewed Grid must revoke the previous school-admin signoff');
assert.match($('qpBpStatus').textContent,/पुनः जाँच/);
assert.match(source,/async function downloadCdcGridExcelTemplate\(\)/);
assert.match(source,/parseCdcGridExcelSheet\(sheet\)/);
assert.match(source,/assertQuestionBankImportScope\(scope\);[\s\S]*?\$\("qpBpUnitGrid"\)\.value=json/);
assert.match(source,/\$\("qpBpSourceReviewed"\)\.checked=false/);
assert.match(source,/getBundledComputerGrid\(\{grade,subject,fullMarks:50\}\)/);
assert.match(source,/bundledComputerUnitTopics\(grade,subject\)/);
assert.match(source,/gridOrigin==="bundled_official_cdc_pdf"/);
assert.match(source,/async function importQuestionBankExcel\(file\)/);
assert.match(source,/const scope=captureQuestionBankImportScope\(\)/);
assert.match(source,/return importQuestionBankRows\(rows,scope\);/);
assert.match(source,/assertQuestionBankImportScope\(scope\);[\s\S]*?await batch.commit\(\);/);
assert.match(source,/return importQuestionBankRows\(rows,scope\);/);
assert.match(source,/parseQuestionExcelSheet\(sheet\)/);
assert.match(source,/questionText,questionTextEn,options,optionsEn,correctOption,answer,answerEn/);
const css=dom.window.document.querySelector('style').textContent;
assert.match(css,/#qpTopicCard\{order:1\}/);
assert.match(css,/#qpPaperComposer\{order:2\}/);
assert.ok($('qpPaperComposer')&&$('qpTopicCard')&&$('qpSavedPapers'));

assert.equal($('qpSavePaperBtn').disabled,true,'No paper saved before generation');
assert.match(source,/const historyReady=await loadPaperHistory\(\{required:true\}\)/);
assert.match(source,/if\(!historyReady\|\|!stillCurrent\(\)\)return;/);
// Active class/section and login cannot change between selecting a file
// and committing up to 500 questions to the database.
const importSafety=new Function(`
 let selectedClass='Class 10',selectedSubject='Science and Technology',
  selectedSection='A',questionDataLoadEpoch=4;
 let verifiedQuestionSelection={
  className:'Class 10',subject:'Science and Technology',section:'A',request:4
 };
 const auth={currentUser:{uid:'admin-test'}};
 const isAdmin=()=>true;
 `+code('function captureQuestionBankImportScope()','async function importQuestionBank(file)')+`
 return {capture:captureQuestionBankImportScope,
  verify:assertQuestionBankImportScope,
  switchClass:value=>{selectedClass=value;questionDataLoadEpoch++;},
  switchSection:value=>{selectedSection=value;questionDataLoadEpoch++;},
  logout:()=>{auth.currentUser=null;},
  revertSelection:()=>{selectedClass='Class 10';selectedSection='A';},
  makeFresh:()=>{verifiedQuestionSelection={
   className:selectedClass,subject:selectedSubject,section:selectedSection,
   request:questionDataLoadEpoch};}
 }; `)();
const captured=importSafety.capture();
importSafety.verify(captured);
importSafety.switchClass('Class 9');
assert.throws(()=>importSafety.verify(captured),/परिवर्तन भयो|आयात रोकियो/);
importSafety.revertSelection();
importSafety.makeFresh();
assert.throws(()=>importSafety.verify(captured),/परिवर्तन भयो|आयात रोकियो/,
 'Returning to the old class after another request must not resurrect stale files');
const renewed=importSafety.capture();
importSafety.switchSection('B');
assert.throws(()=>importSafety.verify(renewed),/परिवर्तन भयो|आयात रोकियो/);
importSafety.logout();
assert.throws(()=>importSafety.verify(renewed),/परिवर्तन भयो|आयात रोकियो/);
console.log('PASS Import class, section, request epoch and user session race guards');

// Exercise the actual async JSON bulk importer, not only its helper. A
// delayed file read followed by a class switch must produce ZERO Firestore writes.
const capturedWrites=[],loadedMessages=[];
const buildBulkHarness=()=>new Function('normal','serverTimestamp','writeBatch',
 'doc','collection','logQuestionActivity','loadCurrentData','message','db',`
 let selectedClass='Class 10',selectedSubject='Science and Technology',selectedSection='A',
  questionDataLoadEpoch=1;
 let verifiedQuestionSelection={
  className:'Class 10',subject:'Science and Technology',section:'A',request:1
 };
 let questionRows=[],curriculumRows=[],role={displayName:'Admin'};
 const auth={currentUser:{uid:'admin-001'}};
 const isAdmin=()=>true;
 const gradeNumber=s=>Number(String(s).match(/\\d+/)?.[0]||0);
 `+code('function captureQuestionBankImportScope()','async function loadGrade8SciencePack()')+`
 return {
  importJson:importQuestionBank,
  switchClass:value=>{selectedClass=value;questionDataLoadEpoch++;verifiedQuestionSelection=null;},
  className:()=>selectedClass
 };
 `)(normal,()=>({}),
 ()=>({set:(...args)=>capturedWrites.push(args),
  commit:async()=>{loadedMessages.push('committed');}}),
 (...args)=>({args}),(...args)=>({args}),
 async()=>{},async()=>{},msg=>loadedMessages.push(msg),{});
const importHarness=buildBulkHarness();
let finishRead;
const slowRead=new Promise(resolve=>{finishRead=resolve});
const validRow={
 unitCode:'1',unitTitle:'Matter',topicName:'Matter',
 questionType:'short',marks:2,cognitiveLevel:'knowledge',
 questionText:'पदार्थ के हो?',answer:'उत्तर'
};
const delayedBulkImport=importHarness.importJson({
 name:'questions.json',size:100,text:()=>slowRead
});
importHarness.switchClass('Class 9');
finishRead(JSON.stringify({questions:[validRow]}));
await assert.rejects(delayedBulkImport,/परिवर्तन भयो|आयात रोकियो/);
assert.equal(capturedWrites.length,0,'A stale file must never write to Firestore');
assert.ok(!loadedMessages.includes('committed'),
 'A class switch during file parsing must block all commits');
const freshHarness=buildBulkHarness();
await freshHarness.importJson({
 name:'questions.json',size:100,text:async()=>JSON.stringify({questions:[validRow]})
});
assert.equal(capturedWrites.length,1,'Correct import must write exactly one question');
assert.equal(capturedWrites[0][1].className,'Class 10');
assert.equal(capturedWrites[0][1].subject,'Science and Technology');
assert.equal(capturedWrites[0][1].section,'A');
assert.ok(loadedMessages.includes('committed'));
const writesBeforeInvalid=capturedWrites.length;
for(const invalid of [
 {...validRow,answer:''},
 {...validRow,questionTextEn:'पदार्थ के हो?',answerEn:'Matter'}
]){
 await assert.rejects(()=>buildBulkHarness().importJson({
  name:'questions.json',size:100,
  text:async()=>JSON.stringify({questions:[invalid]})
 }),/उत्तरकुञ्जिका|English अनुवाद/);
}
assert.equal(capturedWrites.length,writesBeforeInvalid,
 'Missing answers and untranslated English must fail before any Firestore write');
console.log('PASS delayed JSON bulk import is atomic with class switch; invalid answers blocked');


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
  'currentBlueprint','auth','blueprintRows','cognitiveMarkDistribution','savedPapers',
  'getBundledComputerGrid'];
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
  props.verifiedQuestionSelection,[],bank.questions,null,props.auth,[],cognitiveMarkDistribution,props.savedPapers||[],()=>null);
};
const live=make();
await live.run();
const paper=live.getPaper();
assert.ok(paper);
// A fresh session must not regenerate question IDs that were already saved.
const samePaperHistory={
 className:'Class 10',subject:'Science and Technology',section:'A',fullMarks:3,
 questions:paper.questions.map(q=>({questionId:q.questionId}))
};
await assert.rejects(()=>make({savedPapers:[samePaperHistory]}).run(),
 /different question paper|No different|alternatives|question bank/i);
await make({savedPapers:[{...samePaperHistory,className:'Class 9'}]}).run();
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
// Simulate two history responses returning out of order after a class switch.
const pendingHistory=[];
const history=new Function('$','getDocs','query','collection','where','limit',
 'db','auth','isAdmin','esc',`
 let selectedClass='Class 10',selectedSubject='Science and Technology',selectedSection='A';
 let questionDataLoadEpoch=1,paperHistoryLoadEpoch=0,savedPapers=[],
  verifiedQuestionSelection={request:1};
 `+code('async function loadPaperHistory(','function allocateQuestions() {')+`
 return {
  run:loadPaperHistory,
  switchClass:value=>{selectedClass=value;questionDataLoadEpoch++;verifiedQuestionSelection=null;},
  state:()=>({savedPapers,verifiedQuestionSelection})
 };
 `)($,()=>new Promise((resolve,reject)=>pendingHistory.push({resolve,reject})),
 (...args)=>args,()=>null,(...args)=>args,n=>n,{}, {currentUser:{uid:'admin'}},
 ()=>true,escape);
const oldHistory=history.run({required:true});
history.switchClass('Class 9');
const newHistory=history.run({required:true});
pendingHistory[1].resolve({docs:[{id:'new-grade9',data:()=>({
 className:'Class 9',subject:'Science and Technology',section:'A',
 paperTitle:'New grade paper',fullMarks:50,durationMinutes:90,createdAt:{seconds:100}
})}]});
assert.equal(await newHistory,true);
pendingHistory[0].resolve({docs:[{id:'old-grade10',data:()=>({
 className:'Class 10',subject:'Science and Technology',section:'A',
 paperTitle:'Old grade paper',fullMarks:50,durationMinutes:90,createdAt:{seconds:200}
})}]});
assert.equal(await oldHistory,false);
assert.deepEqual(history.state().savedPapers.map(p=>p.id),['new-grade9'],
 'Late old-grade history must not overwrite the current selection');
const brokenHistory=history.run({required:true});
pendingHistory[2].reject(new Error('history unavailable'));
await assert.rejects(()=>brokenHistory,/history unavailable/);
assert.equal(history.state().verifiedQuestionSelection,null,
 'Failed history fetch must prevent unchecked paper generation');
assert.deepEqual(history.state().savedPapers,[]);
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
