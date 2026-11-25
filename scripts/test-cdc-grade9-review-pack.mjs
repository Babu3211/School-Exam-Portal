import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {grade9GridLibrary} from '../cdc-grade9-grid-library.mjs';
import {join} from 'node:path';
import {buildGrade9ReferencePreview,referencePreviewTopics} from '../cdc-grade9-reference-preview.mjs';
import {grade9NepaliReferenceBank,grade9NepaliPracticeSummaryDrafts} from '../cdc-grade9-nepali-reference-bank.mjs';
import {grade9EnglishReferenceBank,grade9EnglishPracticeReading2} from '../cdc-grade9-english-reference-bank.mjs';
import {grade9CompulsoryMathReferenceBank} from '../cdc-grade9-compulsory-math-reference-bank.mjs';
import {grade9ScienceSchoolReferenceBank} from '../cdc-grade9-science-school-reference.mjs';
import {grade9SocialReferenceBank} from '../cdc-grade9-social-reference-bank.mjs';
import {grade9EnvironmentReferenceBank} from '../cdc-grade9-environment-reference-bank.mjs';
import {grade9ComputerOriginalBank} from '../cdc-grade9-computer-original-practice.mjs';
import {getBundledComputerGrid} from '../cdc-verified-computer-grids.mjs';
import {buildAutomaticQuestionPaper} from '../cdc-question-autogen.mjs';
import {getCdcOptionalMathGuide,optionalMathAreaTopics} from '../cdc-optional-math-2082.mjs';
import {originalOptionalMathPracticeBank} from '../cdc-optional-math-original-practice.mjs';
import {inspectCdcOptionalMathPaper} from '../cdc-optional-math-composite.mjs';
import {renderCdcCompositePaper,paperDigits,paperSubjectLabel} from '../cdc-optional-math-render.mjs';
import {assertGrade9ExamPaperMatches} from '../cdc-grade9-paper-grid-guard.mjs';

const grade=9,records=[],esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const refs=[
 ['Nepali',a=>[...grade9NepaliReferenceBank(a).questions,...grade9NepaliPracticeSummaryDrafts(a)],'ne',180,20],
 ['English',a=>[...grade9EnglishReferenceBank(a).questions.filter(q=>q.slot!=='reading2'),...grade9EnglishPracticeReading2(a)],'en',180,10],
 ['Mathematics',a=>grade9CompulsoryMathReferenceBank(a).questions,'both',180,16],
 ['Science and Technology',a=>grade9ScienceSchoolReferenceBank(a).questions,'both',180,40],
 ['Social Studies',a=>grade9SocialReferenceBank(a).questions,'ne',180,24],
 ['Environmental Science',a=>grade9EnvironmentReferenceBank(a).questions,'both',135,22]
];
for(const [subject,provider,language,durationMinutes,count] of refs){
 const questions=provider({grade,subject}), selectedTopicIds=referencePreviewTopics({grade,subject,questions});
 const args={grade,subject,questions,selectedTopicIds,language,durationMinutes,fullMarks:75};
 let previousSignature='';
 for(const [i,seed] of [.39,.61].entries()){
  const result=buildGrade9ReferencePreview({...args,previousSignature,rng:()=>seed});
  assert.equal(result.ready,true,subject+': '+result.reason);
  assert.equal(result.groupCount,count);assert.equal(result.currentCdcExactApproved,false);
  const audit=result.allocationReview;
  assert.equal(audit.numericalReferenceChecksPassed,true,subject);
  assert.equal(audit.groupCount,count);
  assert.equal(audit.groupMarks.reduce((a,b)=>a+b,0),75);
  assert.equal(audit.durationMinutes,durationMinutes);
  assert.ok(audit.checks.length>=4&&audit.unresolved.length>0);
  assert.equal(audit.currentCdcExactApproved,false);
  assert.ok(audit.checks.includes('Scored subparts and alternatives'));
  if(subject==='Mathematics'){
   assert.ok(audit.checks.includes('Per-area question and cognitive item/mark matrix'));
   for(const tag of ['1K','1U','3A','1HA'])assert.ok(result.blocks[0].text.includes('['+tag+']'),'Model mark notation: '+tag);
   assert.equal((result.text.match(/\[\d+(?:K|U|A|HA)\]/g)||[]).length,49,'All math subparts show cognitive mark notation');
  }
  if(subject==='English'){
   for(const tag of ['[5 × 1 = 5]','[10 × 1 = 10]','[15 × 1 = 15]','[6 × 1 = 6]','[10 × 0.5 = 5]'])assert.ok(result.text.includes(tag),'Model-style English count × mark: '+tag);
  }
  if(subject==='Science and Technology')for(const tag of ['10 × 1 = 10','9 × 1 = 9','14 × 2 = 28','7 × 4 = 28'])assert.ok(result.text.includes(tag));
  if(subject==='Social Studies')for(const tag of ['११ × १ = ११','९ × ४ = ३६','४ × ७ = २८'])assert.ok(result.text.includes(tag));
  if(subject==='Environmental Science')for(const tag of ['11 × 1 = 11','8 × 5 = 40','3 × 8 = 24'])assert.ok(result.text.includes(tag));
  assert.equal(result.readyForLive,false);assert.notEqual(result.signature,previousSignature);
  assert.match(result.text,/REFERENCE DRAFT — NOT FOR EXAM/);
  assert.match(result.answerText,/INDICATIVE ANSWER KEY — TEACHER REVIEW ONLY/);
  if(subject==='Social Studies'){
   assert.match(result.text,/कक्षा ९ · सामाजिक अध्ययन/);
   assert.doesNotMatch(result.text,/Option A:|OR \/ अथवा B:/);
   assert.doesNotMatch(result.text,/[0-9]/);
  }
  if(subject==='English'){
   assert.match(result.text,/General instructions: Read each question carefully/);
   assert.doesNotMatch(result.text,/[\u0900-\u097f]/u);
   assert.doesNotMatch(result.answerText,/[\u0900-\u097f]/u);
  }
  assert.ok(result.answerCount>=count,subject+' answer coverage');
  assert.doesNotMatch(result.answerText,/\bundefined\b/);
  previousSignature=result.signature;
  records.push({subject,set:i+1,language,fullMarks:75,durationMinutes,groupCount:count,sourceUrl:result.sourceUrl,status:'Reference only — current CDC approval pending',allocationReview:result.allocationReview,signature:result.signature,answerCount:result.answerCount,html:'<pre>'+esc(result.introText)+'</pre>'+result.blocks.map(block=>'<div class="question" data-question-number="'+block.number+'"><pre>'+esc(block.text)+'</pre>'+block.figureHtml+'</div>').join('')+'<details><summary>Teacher answer review / उत्तरकुञ्जिका</summary><pre>'+esc(result.answerText)+'</pre></details>'});
 }
}
{
 const subject='Optional Computer Science',fullMarks=50,language='both',blueprint=getBundledComputerGrid({grade,subject,fullMarks}),bank=grade9ComputerOriginalBank({subject}),topicIds=bank.units.map(u=>u.id+'_0');
 let previousSignature='';
 for(const [i,seed] of [.39,.61].entries()){
  const result=buildAutomaticQuestionPaper({questions:bank.questions,topicIds,fullMarks,language,blueprint,requireExactGrid:true,gradeNumber:grade,subject,previousSignature,rng:()=>seed});
  assert.notEqual(result.signature,previousSignature);previousSignature=result.signature;
  const paper={gradeNumber:grade,subject,fullMarks,language,topicIds,durationMinutes:blueprint.durationMinutes,questions:result.questions.map(q=>({...q,questionId:q.id,gridEvidence:result.gridAudit.slotEvidence.find(e=>e.questionId===q.id)}))};
  assert.equal(assertGrade9ExamPaperMatches(paper),true);
  const bilingual=(ne,en)=>{
   assert.ok(typeof ne==='string'&&ne.trim()&&typeof en==='string'&&en.trim(),'Both languages required in computer review');
   return '<span lang="ne">'+esc(ne)+'</span>'+(ne===en?'':'<span class="translation" lang="en">'+esc(en)+'</span>');
  };
  const html=paper.questions.map((q,n)=>'<p class="question"><b>'+ (n+1)+'.</b> '+bilingual(q.questionText,q.questionTextEn)+' ['+q.marks+']</p>'+ (q.questionType==='mcq'?'<ol type="A">'+q.options.map((o,i)=>'<li>'+bilingual(o,q.optionsEn[i])+'</li>').join('')+'</ol>':'')).join('');
  const key='<h3>Indicative answer key</h3>'+paper.questions.map((q,n)=>'<p>'+ (n+1)+'. '+bilingual(q.answer,q.answerEn)+(q.correctOption?' ('+esc(q.correctOption)+')':'')+'</p>').join('');
  for(const q of paper.questions){
   assert.ok(html.includes(esc(q.questionTextEn)),'English question missing from bilingual review');
   assert.ok(key.includes(esc(q.answerEn)),'English answer missing from bilingual review');
   if(q.questionType==='mcq')for(const option of q.optionsEn)assert.ok(html.includes(esc(option)),'English MCQ option missing');
  }
  records.push({subject,set:i+1,language,fullMarks,durationMinutes:paper.durationMinutes,groupCount:paper.questions.length,sourceUrl:blueprint.sourceUrl,status:'Bundled CDC structural grid matched — teacher review pending',signature:result.signature,html:html+'<details><summary>Teacher answer review</summary>'+key+'</details>'});
 }
}
{
 const subject='Optional Mathematics',language='both',guide=getCdcOptionalMathGuide({grade,subject}),bank=originalOptionalMathPracticeBank({grade,subject}),topicIds=optionalMathAreaTopics(grade,subject).map(u=>u.id+'_0');
 let previousSignature='';
 for(const [i,seed] of [.39,.61].entries()){
  const result=inspectCdcOptionalMathPaper({guide,questions:bank.questions,selectedTopicIds:topicIds,language,allowFormulaVerifiedDraft:true,previousSignature,rng:()=>seed});
  assert.equal(result.ready,true,result.reason);assert.equal(result.cellAudit.matches,true);assert.notEqual(result.signature,previousSignature);previousSignature=result.signature;
  const paper={gradeNumber:grade,subject,fullMarks:75,durationMinutes:180,language,topicIds,questionFormat:'cdc_optional_math_composite',schoolName:'SMSS — teacher review only',className:'9',paperTitle:'NOT FOR EXAM',academicYear:'2083',questions:result.questions.map(q=>({...q,questionId:q.id}))};
  assert.equal(assertGrade9ExamPaperMatches(paper),true);
  records.push({subject,set:i+1,language,fullMarks:75,durationMinutes:180,groupCount:27,sourceUrl:guide.sourceUrl,status:'72 CDC grid cells matched — teacher review pending',signature:result.signature,html:renderCdcCompositePaper(paper,{escapeHtml:esc})+'<details><summary>Teacher answer review</summary>'+renderCdcCompositePaper(paper,{escapeHtml:esc,answerKey:true})+'</details>'});
 }
}
assert.equal(records.length,16);
assert.ok(records.filter(r=>r.subject==='Mathematics').every(r=>r.html.includes('<svg')),'Math review papers must retain matching schematic figures');
assert.ok(records.filter(r=>r.subject==='Science and Technology').every(r=>/Series circuit|Parallel circuit/.test(r.html)),'Both science sets must retain their electricity circuit diagram');
assert.ok(records.filter(r=>r.subject==='Mathematics').every(r=>r.html.includes('not to scale')));
assert.ok(records.filter(r=>r.subject==='Mathematics').every(r=>/<div class="question" data-question-number="\d+"><pre>[\s\S]*?<\/pre><figure/.test(r.html)),'Figures stay in the question block');
assert.equal(new Set(records.map(r=>r.subject)).size,8);
assert.equal(new Set(records.map(r=>r.subject+'|'+r.signature)).size,16);
assert.ok(records.every(r=>r.status.includes('pending')));
assert.ok(records.every(r=>r.html.includes('<details><summary>Teacher answer review')),'All sixteen papers have a separate teacher answer review');
const out=process.env.SMSS_REVIEW_PACK_DIR;
const style='body{font:16px/1.5 system-ui,sans-serif;max-width:900px;margin:24px auto;padding:0 16px;color:#172133}section{border-top:2px solid #aaa;padding:18px 0}pre,p,li{white-space:pre-wrap;overflow-wrap:anywhere}pre{font:inherit}.translation{display:block;color:#36465e;margin:3px 0 0}.question{margin-top:18px}aside{font-weight:700;color:#922}details{margin-top:20px}a{overflow-wrap:anywhere}nav{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:16px}.print-note{display:none}table{border-collapse:collapse;width:100%}th,td{text-align:left;vertical-align:top;border-bottom:1px solid #ddd;padding:10px 6px}@page{size:A4 landscape;margin:10mm}@media print{nav,details,.screen-only{display:none!important}body{margin:0;padding:0;font-size:11pt}.print-note{display:block;position:fixed;bottom:0;left:0;right:0;text-align:center;color:#333;font-size:9pt;font-weight:bold}section{border:0;padding:0}.review-paper-body{column-count:2;column-gap:8mm;column-rule:0.35pt solid #aaa}.question,.qp-q,.qp-figure{break-inside:avoid}svg{max-width:100%;height:auto}pre{margin:0 0 5px}.review-paper-body .question{margin:0 0 9px}}';
const page=(title,body)=>'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>'+esc(title)+'</title><style>'+style+'</style></head><body>'+body+'</body></html>';
const warning='<aside>REVIEW ONLY — NOT FOR EXAM / परीक्षा प्रयोजनका लागि होइन</aside>';
const noExecutable=html=>assert.doesNotMatch(html,/<(?:script|form|iframe|object|embed)\b|\son(?:click|load|error)\s*=/i);
const files=[];
for(const r of records){
 const slug=r.subject.toLowerCase().replace(/[^a-z0-9]+/g,'-');
 const base='papers/'+slug+'-set-'+r.set;
 r.paperPath=base+'.html';r.answerPath=base+'-answers.html';
 // Split only the authored top-level teacher review disclosure. Question
 // and answer documents have separate URLs; neither requires JavaScript.
 const cut=r.html.lastIndexOf('<details><summary>');
 assert.ok(cut>0&&r.html.endsWith('</details>'));
 const endSummary=r.html.indexOf('</summary>',cut);
 assert.ok(endSummary>cut);
 const questions=r.html.slice(0,cut);
 const key=r.html.slice(endSummary+'</summary>'.length,-'</details>'.length);
 assert.ok(questions.trim()&&key.trim());
 const ne=r.language==='ne',name=paperSubjectLabel(r.subject,r.language),digits=x=>paperDigits(x,r.language);
 const meta='<h1>'+esc(name)+(ne?' — सेट ':' — Set ')+digits(r.set)+'</h1>'+(r.language==='en'?'<aside>REVIEW ONLY — NOT FOR EXAM</aside>':warning)+'<p>'+(ne?'कक्षा ९':'Grade 9')+' · '+esc(r.status)+' · '+digits(r.fullMarks)+(ne?' अङ्क · ':' marks · ')+digits(r.durationMinutes)+(ne?' मिनेट':' minutes')+' · '+esc(r.language)+'</p>';
 const back='<a href="../grade9-teacher-review.html">All subjects</a>';
 const footer='<p class="print-note">SMSS — REVIEW ONLY — NOT FOR EXAM'+(r.language==='en'?'':' / सन्दर्भ अभ्यास मात्र')+'</p>';
 const questionPage=page(r.subject+' — Set '+r.set,'<nav>'+back+'<a href="'+r.answerPath.split('/').at(-1)+'">Teacher answer key</a></nav>'+meta+'<p class="screen-only">Use your browser Print or Save as PDF for this single review draft. Do not use it as an approved examination.</p><section class="review-paper-body">'+questions+'</section><p>Source: '+esc(r.sourceUrl||'See repository source register')+'</p>'+footer);
 const answerPage=page(r.subject+' — Set '+r.set+' — answer review','<nav>'+back+'<a href="'+r.paperPath.split('/').at(-1)+'">Question paper</a></nav>'+meta+'<h2>Indicative answer key — teacher review only</h2><section class="review-paper-body">'+key+'</section>'+footer);
 for(const [name,html] of [[r.paperPath,questionPage],[r.answerPath,answerPage]]){
  noExecutable(html);if(r.language==='en')assert.doesNotMatch(html,/[\u0900-\u097f]/u,'English export must be English only');assert.ok(html.includes('REVIEW ONLY — NOT FOR EXAM'));assert.ok(html.includes('print-note'));files.push([name,html]);
 }
 assert.ok(!questionPage.includes('Teacher answer review</summary>'));
 assert.ok(!questionPage.includes('INDICATIVE ANSWER KEY — TEACHER REVIEW ONLY'));
}
assert.equal(files.length,32);
assert.equal(new Set(files.map(([name])=>name)).size,32);
const rows=records.map(r=>'<tr><td>'+esc(r.subject)+'</td><td>'+r.set+'</td><td>'+r.fullMarks+'</td><td><a href="'+r.paperPath+'">Questions</a> · <a href="'+r.answerPath+'">Answer key</a></td></tr>').join('');
const gridRegister=JSON.parse(readFileSync(new URL('../data/cdc-question-paper-sources-2083.json',import.meta.url),'utf8'));
const gridLibrary=grade9GridLibrary(gridRegister);
assert.equal(gridLibrary.length,11);
const gridSections=gridLibrary.map(item=>{
 const tables=item.tables.map(t=>'<h3>'+esc(t.title)+'</h3><div style="overflow-x:auto"><table><thead><tr>'+t.columns.map(c=>'<th>'+esc(c)+'</th>').join('')+'</tr></thead><tbody>'+t.rows.map(r=>'<tr>'+r.map(c=>'<td>'+esc(c??'—')+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>').join('');
 const sources=item.sources.map(s=>'<p><a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer">'+(s.kind==='curriculum'?'CDC curriculum (not Grid)':s.url.toLowerCase().endsWith('.pdf')?'Open original PDF':'Open CDC source')+'</a> · '+esc(s.version)+' · '+esc(s.status)+'</p>').join('');
 return '<section id="'+esc(item.key)+'"><h2>'+esc(item.subject)+'</h2><p>'+esc(item.status)+'</p>'+(item.fullMarks!==null?'<p>Full marks: '+item.fullMarks+(item.durationMinutes!==null?' · Minutes: '+item.durationMinutes:'')+'</p>':'')+(tables||'<p>No numerical Grid verified. Do not infer missing rows.</p>')+(sources||'<p>No official source registered.</p>')+'</section>';
}).join('');
const gridPage=page('SMSS Class 9 CDC Grid Library','<nav><a href="grade9-teacher-review.html">Review question papers</a></nav><h1>Class 9 — CDC Grid Library</h1>'+warning+'<p>Read-only source comparison. The isolated hosted review adds links to fingerprint-matched original Grid page images beside each available subject. Official PDF links remain available; current applicability and teacher approval remain separate.</p><nav>'+gridLibrary.map(item=>'<a href="#'+esc(item.key)+'">'+esc(item.subject)+'</a>').join('')+'</nav>'+gridSections);
noExecutable(gridPage);
for(const item of gridLibrary){
 assert.ok(gridPage.includes('id="'+item.key+'"'));
 assert.ok(gridPage.includes(esc(item.status)));
 assert.equal(item.currentCdcExactApproved,false);
 for(const src of item.sources)assert.ok(gridPage.includes(esc(src.url)));
}
const index=page('SMSS Grade 9 review pack','<h1>SMSS Grade 9 — teacher review pack</h1>'+warning+'<p><a href="grade9-cdc-grid-library.html">Open Class 9 CDC Grid Library (11 subjects)</a></p><p>Eight subjects, two distinct draft sets each. Open one paper at a time to review or print it. Answer keys are separate. Six subjects use reference patterns; two use verified structural grids. All require teacher review. No school data or release approval.</p><table><thead><tr><th>Subject</th><th>Set</th><th>Marks</th><th>Review files</th></tr></thead><tbody>'+rows+'</tbody></table>');
noExecutable(index);
assert.ok(index.includes('href="grade9-cdc-grid-library.html"'));
for(const [name] of files)assert.ok(index.includes('href="'+name+'"'));
if(out){
 mkdirSync(join(out,'papers'),{recursive:true});
 for(const [name,html] of files)writeFileSync(join(out,name),html,'utf8');
 writeFileSync(join(out,'grade9-teacher-review.html'),index,'utf8');
 writeFileSync(join(out,'grade9-cdc-grid-library.html'),gridPage,'utf8');
 writeFileSync(join(out,'review-manifest.json'),JSON.stringify({grade,academicYear:2083,readyForLive:false,schoolDataIncluded:false,records:records.map(({html,...r})=>r)},null,2),'utf8');
}
console.log('PASS all 8 subjects, 16 distinct review drafts and 32 separate question/answer pages; six reference-only subjects remain blocked; no production writes.');
