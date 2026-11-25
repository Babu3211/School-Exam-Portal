import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {grade9RequiredPaperLanguage} from '../cdc-grid-source-index.mjs';
import {paperDigits,paperSubjectLabel,paperClassLabel,paperOptionLabel,paperAnswerOption,paperDisplayText,PAPER_PRINT_CSS,buildQuestionPaperDocx,questionFigure} from '../cdc-optional-math-render.mjs';
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
 'qpSavePaperBtn','qpPrintPaperBtn','qpAnswerKeyBtn','qpWordPaperBtn','qpPaperPreview','qpAutoReviewed','qpAutoMode','qpAutoGridStatus',
 'qpOfficialGridSource','qpBpVeryShortCount','qpBpVeryShortMarks',
 'qpPaperVeryShortCount','qpPaperVeryShortMarks',
 'qpQuestionExcelTemplateBtn','qpQuestionExcelFile','qpQuestionTemplateBtn','qpQuestionImportFile',
 'qpBpGridExcelTemplateBtn','qpBpGridExcelFile','qpBpGridFile'])
 assert.ok($(id),'Expected actual DOM control '+id);
assert.deepEqual([...$('qpAutoLanguage').options].map(x=>x.value),['ne','en','both']);
const policyHarness=new Function('$','grade9RequiredPaperLanguage','gradeNumber','selectedClass','selectedSubject',code('function applyGrade9LanguagePolicy()','function selectedTopicIds()')+'return applyGrade9LanguagePolicy;');
for(const [subject,expected] of [['Social Studies','ne'],['Nepali','ne'],['Mathematics','both'],['Science and Technology','both'],['English','en']]){
 policyHarness($,grade9RequiredPaperLanguage,()=>9,'Class 9',subject)();
 assert.equal($('qpAutoLanguage').value,expected);
 assert.equal($('qpAutoLanguage').disabled,true);
 assert.deepEqual([...$('qpAutoLanguage').options].filter(x=>!x.disabled).map(x=>x.value),[expected]);
}
policyHarness($,grade9RequiredPaperLanguage,()=>10,'Class 10','Science and Technology')();
assert.equal($('qpAutoLanguage').disabled,false);
assert.ok([...$('qpAutoLanguage').options].every(x=>!x.disabled));
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
assert.match(source,/loadCdcGridSourceRegister\(\)/);
assert.match(source,/findCdcGridSources\(cdcSourceRegister,grade,subject\)/);
assert.match(source,/auditGrade9Release\(\{register:cdcSourceRegister\}\)/);
assert.match(source,/auditGrade9ScienceArchive\(\{grade,subject\}\)/);
assert.match(source,/२०७८ ऐतिहासिक Grid/);
assert.match(source,/grade9ComputerOriginalBank\(\{subject\}\)/);
assert.match(source,/यो स्थिति Live स्वीकृति होइन/);
assert.match(source,/heading\.textContent="CDC वेबसाइटमा यस विषयको Grid स्रोत भेटियो/);
assert.match(source,/pdfSource\.appendChild\(heading\)/);
assert.match(source,/getCdcOptionalMathGuide\(\{grade,subject\}\)/);
assert.match(source,/compareGrade8SciencePracticeBank\(\{/);
assert.match(source,/grade8ScienceOriginalSupplement\(\{/);
assert.match(source,/allQuestions=\[\.\.\.safe\.questions,\.\.\.supplement\.questions\]/);
assert.match(source,/value="very_short">अति छोटो उत्तर/);
assert.match(source,/\{type:"very_short",count:Number\(\$\(prefix\+"VeryShortCount"\)/);
assert.match(source,/const groups = \["mcq","very_short","short","long"\]/);
assert.match(source,/\["mcq","very_short","short","long"\]\.indexOf/);
assert.match(source,/grade8ScienceModelAudit\.model\.archivedCdcCatalogUrl/);
assert.match(source,/२०८२ मूल CDC Grid/);
assert.match(source,/grade8Audit\.missingTypes\.map/);
assert.match(source,/getGrade8ScienceHistoricalPracticePattern\(\{/);
assert.match(source,/\$\("qpAutoMode"\)\.value="practice"/);
assert.match(source,/compareCdc2083MathModelToBundledGrid\(\)/);
assert.match(source,/CDC_G10_OPTIONAL_MATH_2083_MODEL\.governmentPublicationUrl/);
assert.match(source,/optionalMathAreaTopics\(grade,subject\)/);
assert.match(source,/CDC २०८२ · Objective\/WCA\/CCA/);
assert.match(source,/async function generateOptionalMathCompositePaper\(guide\)/);
assert.match(source,/correctOption:String\(s.correctOption\)/);
assert.match(source,/renderCdcCompositePaper\(paper,\{escapeHtml:esc,answerKey:true\}\)/);
assert.match(source,/originalOptionalMathPracticeBank\(\{/);
assert.match(source,/allowFormulaVerifiedDraft:true/);
assert.match(source,/inspectCdcOptionalMathPaper\(\{/);
assert.match(source,/renderCdcCompositePaper\(paper,\{escapeHtml:esc\}\)/);
assert.match(source,/return generateOptionalMathCompositePaper\(grouped\)/);
assert.match(source,/const compound=target===75\?getCdcOptionalMathGuide/);
assert.match(source,/message\("CDC को ६ वटा ऐच्छिक गणित Unit स्वतः चयन भए/);
assert.match(source,/paper\.questionFormat==="cdc_optional_math_composite"/);
assert.match(source,/q\.reviewStatus==="teacher_reviewed"/);
assert.match(source,/if\(strict&&target===75\)\{/);
assert.match(source,/pdfSource\.appendChild\(link\)/);
assert.match(source,/officialComputerGrid\?\.originalGovernmentPdf/);
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
// Existing Excel bank rows must reuse the official CDC topic checkbox ID.
const compUnit={id:'cdc_official_computer_g9_u1',unitCode:'1',
 unitTitle:'Computer System',topics:['Computer System']};
const importedComputerQuestions=[{id:'q-existing',topicId:'custom_old',
 unitCode:'1',unitTitle:'Computer System',topicName:'Computer System',
 questionText:'प्रश्न'}];
const computerTopicMapping=new Function('$','esc','normal','curriculumRows',
 'bundledPracticeUnits','bundledPracticeQuestions','questionRows',
 code('function renderTopics() {','function renderQuestionRows() {')+
 'renderTopics();return questionRows;')(
 $,escape,normal,[],[compUnit],[],importedComputerQuestions);
assert.equal(computerTopicMapping[0].topicId,'cdc_official_computer_g9_u1_0',
 'An imported bank question must use the official CDC unit checkbox ID');
assert.equal(importedComputerQuestions[0].topicId,'custom_old',
 'The mapping must not modify existing saved Firestore question rows');

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
const renderPaperPreview=new Function('$','esc','questionTypeLabel','levelLabel','generatedPaper','paperDigits','paperSubjectLabel','paperClassLabel','paperOptionLabel','paperDisplayText','questionFigure',
 code('function renderPaperPreview(','function printPaper(')+'return renderPaperPreview;')(
 $,escape,t=>({mcq:'MCQ',short:'Short',long:'Long'})[t]||t,x=>x,null,paperDigits,paperSubjectLabel,paperClassLabel,paperOptionLabel,paperDisplayText,questionFigure);
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
  'getBundledComputerGrid','getCdcOptionalMathGuide',
  'getGrade8ScienceHistoricalPracticePattern'];
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
  props.verifiedQuestionSelection,[],bank.questions,null,props.auth,[],cognitiveMarkDistribution,props.savedPapers||[],()=>null,()=>null,()=>null);
};
const live=make();
await live.run();
const paper=live.getPaper();
assert.ok(paper);
assert.ok(['ne','en','both'].includes(paper.language),'Generated paper must retain chosen language for saved Grid validation');
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
const printPaper=new Function('$','esc','message','window','generatedPaper','paperSubjectLabel','paperClassLabel','paperAnswerOption','paperDisplayText','PAPER_PRINT_CSS',
 code('function printPaper(','async function loadClassSubjects()')+'return printPaper;')(
 $,escape,()=>{},fakeWindow,null,paperSubjectLabel,paperClassLabel,paperAnswerOption,paperDisplayText,PAPER_PRINT_CSS);
printPaper(approved.getPaper(),true);
assert.equal(printCount,1);
assert.match(generatedPrint,/white-space:pre-line/);
assert.match(generatedPrint,/@page\{size:A4 landscape/);
assert.match(generatedPrint,/column-count:2/);
assert.equal($('qpWordPaperBtn').disabled,false);
const docx=buildQuestionPaperDocx($('qpPrintArea'));
assert.deepEqual([...docx.slice(0,4)],[80,75,3,4]);
const docxText=new TextDecoder().decode(docx);
assert.match(docxText,/word\/document\.xml/);
assert.match(docxText,/w:orient="landscape"/);
assert.match(docxText,/w:cols w:num="2"/);
assert.match(docxText,/Test School/);
assert.doesNotMatch(docxText,/qpGridAudit|qpAutoReviewed/);
// Inspect actual stored ZIP parts and XML relationships. Browser PNG encoding
// is separate; a valid embedded PNG fixture proves the package contract.
const unzipStored=bytes=>{
 const parts=new Map();const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let off=0;
 while(v.getUint32(off,true)===0x04034b50){
  assert.equal(v.getUint16(off+8,true),0);
  const size=v.getUint32(off+18,true),len=v.getUint16(off+26,true),extra=v.getUint16(off+28,true);
  const name=new TextDecoder().decode(bytes.slice(off+30,off+30+len)),start=off+30+len+extra;
  parts.set(name,bytes.slice(start,start+size));off=start+size;
 }
 assert.equal(v.getUint32(off,true),0x02014b50);return parts;
};
const fixture=dom.window.document.createElement('section');
fixture.innerHTML='<div><h2>विद्यालय</h2></div><div class="qp-paper-body"><p>Given question</p>'+questionFigure({contextEn:'A circular pond has radius 14 m. Use π = 22/7.'},'ne')+'<p>Next question</p></div>';
const svg=fixture.querySelector('svg');
assert.ok(svg);
assert.match(svg.textContent,/१४/);
assert.throws(()=>buildQuestionPaperDocx(fixture),/Every paper figure/);
const png=new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aJc0AAAAASUVORK5CYII=','base64'));
const embedded=buildQuestionPaperDocx(fixture,{figurePngs:new Map([[svg,png]])});
const parts=unzipStored(embedded),xml=new TextDecoder().decode(parts.get('word/document.xml'));
assert.deepEqual(parts.get('word/media/figure1.png'),png);
assert.match(xml,/r:embed="rIdFigure1"/);
assert.match(new TextDecoder().decode(parts.get('word/_rels/document.xml.rels')),/Target="media\/figure1.png"/);
assert.ok(xml.indexOf('Given question')<xml.indexOf('<w:drawing>')&&xml.indexOf('<w:drawing>')<xml.indexOf('Next question'));
for(const [name,bytes] of parts)if(/\.xml$|\.rels$/.test(name))assert.equal(new dom.window.DOMParser().parseFromString(new TextDecoder().decode(bytes),'application/xml').querySelector('parsererror'),null,name);
svg.setAttribute('onload','alert(1)');
assert.throws(()=>buildQuestionPaperDocx(fixture,{figurePngs:new Map([[svg,png]])}),/Unsafe paper figure/);
console.log('PASS real DOCX package image bytes, relationships, question order and unsafe figure rejection');
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
console.log('PASS V46 DOM auto question paper: class 10, unit choices, bilingual, review gate, random practice and topic-unit isolation');

 // Exercise the real reference UI functions with the actual page shell.
 const referenceHarness=new Function('$','grade9RequiredPaperLanguage',`
 const auth={currentUser:{uid:'teacher-synthetic'}};
 let selectedClass='Class 9',selectedSubject='Science and Technology',selectedSection='A',questionDataLoadEpoch=1;
 let verifiedQuestionSelection={className:selectedClass,subject:selectedSubject,section:selectedSection,request:1};
 const gradeNumber=()=>9,roleCanTeach=()=>true,selectedTopicIds=()=>['unit-1'];
 const bundledPracticeQuestions=[],message=()=>{};
 let next={ready:true,text:'REFERENCE DRAFT — NOT FOR EXAM <img src=x>',answerText:'INDICATIVE ANSWER KEY — TEACHER REVIEW ONLY <script>test</script>',signature:'paper-a'};
 const buildGrade9ReferencePreview=()=>next;
 const invalidateGeneratedQuestionPaper=()=>{for(const id of ['qpSavePaperBtn','qpPrintPaperBtn','qpAnswerKeyBtn'])$(id).disabled=true;};
 `+code('const referencePreviewHistory=new Map();','async function generateSmartPaper()')+`
 return {generate:generateReferenceDraftPreview,clear:clearReferenceDraftPreview,fail:()=>{next={ready:false,reason:'Insufficient topics'};},logout:()=>{auth.currentUser=null;}};
 `)($,grade9RequiredPaperLanguage);
 $('qpAutoLanguage').value='both';
 assert.ok($('qpReferenceAnswerReview').hidden);
 referenceHarness.generate();
 assert.equal($('qpReferenceAnswerReview').hidden,false);
 assert.equal($('qpReferenceAnswerReview').open,false);
 assert.match($('qpReferenceAnswerText').textContent,/INDICATIVE ANSWER KEY/);
 assert.equal($('qpReferenceAnswerText').querySelector('script'),null);
 assert.equal($('qpReferenceDraftPreview').querySelector('img'),null);
 assert.ok(['qpSavePaperBtn','qpPrintPaperBtn','qpAnswerKeyBtn'].every(id=>$(id).disabled));
 $('qpReferenceAnswerReview').open=true;
 referenceHarness.fail();referenceHarness.generate();
 assert.equal($('qpReferenceAnswerReview').hidden,true);
 assert.equal($('qpReferenceAnswerReview').open,false);
 assert.equal($('qpReferenceAnswerText').textContent,'');
 referenceHarness.clear();
 assert.ok($('qpReferenceDraftPreview').hidden);
 referenceHarness.logout();
 assert.throws(()=>referenceHarness.generate(),/assigned subject/);
 console.log('PASS actual review-only answer UI, inert text, stale key clearing and official save/print lock');

const nePaper={...paper,language:'ne',questions:paper.questions.map(q=>({...q,questionText:'यदि 12 र 5 छन् भने?',answer:'17',options:['12','17','18','19']}))};
const originalJson=JSON.stringify(nePaper);
renderPaperPreview(nePaper);
const nepaliPreview=$('qpPrintArea').textContent;
assert.match(nepaliPreview,/विज्ञान तथा प्रविधि/);
assert.match(nepaliPreview,/पूर्णाङ्क: ३/);
assert.match(nepaliPreview,/१२ र ५/);
assert.doesNotMatch(nepaliPreview,/[0-9]/);
assert.equal(JSON.stringify(nePaper),originalJson);
$('qpAutoReviewed').checked=true;
printPaper(nePaper,true);
assert.match(generatedPrint,/१७/);
assert.equal(paperDisplayText('print(2 + 3)','ne','Optional Computer Science'),'print(2 + 3)');
assert.equal(paperDisplayText('12 cm','en','Mathematics'),'12 cm');
dom.window.close();

// Real portal shell: library is collapsible, renders all tables and is read-only.
const {renderGrade9GridLibrary}=await import('../cdc-grade9-grid-library.mjs');
const gridRegister=JSON.parse(readFileSync(new URL('../data/cdc-question-paper-sources-2083.json',import.meta.url),'utf8'));
const libraryDom=new JSDOM('<!doctype html><html><body>'+shell+'</body></html>',{url:'https://example.test'});
const libraryRoot=libraryDom.window.document.getElementById('qpGrade9GridLibraryContent');
assert.ok(libraryRoot);assert.equal(libraryDom.window.document.getElementById('qpGrade9GridLibrary').open,false);
renderGrade9GridLibrary(libraryRoot,gridRegister);
assert.equal(libraryRoot.querySelectorAll(':scope > details').length,11);
assert.ok(libraryRoot.querySelectorAll('table').length>=10);
assert.ok([...libraryRoot.querySelectorAll('a')].every(a=>a.target==='_blank'&&a.rel.includes('noopener')));
assert.equal(libraryRoot.querySelectorAll('input,button,form,script,iframe').length,0);
assert.match(libraryRoot.textContent,/Current Grid verification pending|current Grid verification pending/);
const environmentSection=[...libraryRoot.querySelectorAll(':scope > details')].find(section=>section.querySelector('summary')?.textContent.startsWith('Environmental Science —'));
assert.ok(environmentSection,'Environment subject must retain its own Grid Library section');
assert.match(environmentSection.textContent,/Official curriculum \+ non-official school pattern; Grade 9 exact Grid unavailable/);
assert.match(environmentSection.textContent,/School syllabus 2080: scored questions only \(not CDC Grid\)/);
assert.match(environmentSection.textContent,/School syllabus alternatives — not implemented in reference drafts/);
assert.match(environmentSection.textContent,/Complete official GridNo/);
assert.ok([...environmentSection.querySelectorAll('a')].every(a=>a.href.startsWith('https://giwmscdnone.gov.np/')),'Non-official reference must not be listed as an official Grid source');
assert.match(libraryRoot.textContent,/Objective K\/U\/A\/HA/);
assert.ok([...libraryRoot.querySelectorAll('a')].some(a=>a.href.includes('Opt.%20Math')));
renderGrade9GridLibrary(libraryRoot,null);
assert.match(libraryRoot.textContent,/not available offline yet/);
renderGrade9GridLibrary(libraryRoot,gridRegister);
assert.equal(libraryRoot.querySelectorAll(':scope > details').length,11);
libraryDom.window.close();
console.log('PASS actual Grid Library DOM, original-source links, offline fallback and read-only rendering');
