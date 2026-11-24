import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
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
import {renderCdcCompositePaper} from '../cdc-optional-math-render.mjs';
import {assertGrade9ExamPaperMatches} from '../cdc-grade9-paper-grid-guard.mjs';

const grade=9,records=[],esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const refs=[
 ['Nepali',a=>[...grade9NepaliReferenceBank(a).questions,...grade9NepaliPracticeSummaryDrafts(a)],'ne',180,20],
 ['English',a=>[...grade9EnglishReferenceBank(a).questions.filter(q=>q.slot!=='reading2'),...grade9EnglishPracticeReading2(a)],'en',180,10],
 ['Mathematics',a=>grade9CompulsoryMathReferenceBank(a).questions,'both',180,16],
 ['Science and Technology',a=>grade9ScienceSchoolReferenceBank(a).questions,'both',180,40],
 ['Social Studies',a=>grade9SocialReferenceBank(a).questions,'both',180,24],
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
  assert.equal(result.readyForLive,false);assert.notEqual(result.signature,previousSignature);
  assert.match(result.text,/REFERENCE DRAFT — NOT FOR EXAM/);
  previousSignature=result.signature;
  records.push({subject,set:i+1,language,fullMarks:75,durationMinutes,groupCount:count,sourceUrl:result.sourceUrl,status:'Reference only — current CDC approval pending',signature:result.signature,html:'<pre>'+esc(result.text)+'</pre>'});
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
  const html=paper.questions.map((q,n)=>'<p><b>'+ (n+1)+'.</b> '+esc(q.questionText)+' ['+q.marks+']</p>'+ (q.questionType==='mcq'?'<ol type="A">'+q.options.map(o=>'<li>'+esc(o)+'</li>').join('')+'</ol>':'')).join('');
  const key='<h3>Indicative answer key</h3>'+paper.questions.map((q,n)=>'<p>'+ (n+1)+'. '+esc(q.answer)+(q.correctOption?' ('+esc(q.correctOption)+')':'')+'</p>').join('');
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
assert.equal(new Set(records.map(r=>r.subject)).size,8);
assert.equal(new Set(records.map(r=>r.subject+'|'+r.signature)).size,16);
assert.ok(records.every(r=>r.status.includes('pending')));
const out=process.env.SMSS_REVIEW_PACK_DIR;
if(out){
 mkdirSync(out,{recursive:true});
 const style='body{font:16px/1.5 system-ui,sans-serif;max-width:900px;margin:24px auto;padding:0 16px;color:#172133}section{border-top:2px solid #aaa;padding:18px 0}pre,p,li{white-space:pre-wrap;overflow-wrap:anywhere}pre{font:inherit}aside{font-weight:700;color:#922}details{margin-top:20px}a{overflow-wrap:anywhere}@media print{section{break-before:page}details{display:none}}';
 assert.ok(records.every(r=>!/<(?:script|form|iframe|object|embed)\\b/i.test(r.html)),'Review pack must contain no executable or login UI');
 const toc=records.map((r,i)=>'<li><a href="#paper'+i+'">'+esc(r.subject)+' — Set '+r.set+'</a></li>').join('');
 const body=records.map((r,i)=>'<section id="paper'+i+'"><aside>REVIEW ONLY — NOT FOR EXAM / परीक्षा प्रयोजनका लागि होइन</aside><h2>'+esc(r.subject)+' — Set '+r.set+'</h2><p>'+esc(r.status)+' · '+r.fullMarks+' marks · '+r.durationMinutes+' minutes · '+esc(r.language)+'</p><p>Source: '+esc(r.sourceUrl||'See repository source register')+'</p>'+r.html+'</section>').join('');
 writeFileSync(join(out,'grade9-teacher-review.html'),'<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>SMSS Grade 9 review pack</title><style>'+style+'</style><h1>SMSS Grade 9 — teacher review pack</h1><aside>16 original practice/reference drafts. No school data. No release approval.</aside><p>Six subject patterns are reference only; two bundled structures pass machine grid checks. Teacher verification of content, difficulty, answer keys and current official grid remains required.</p><ol>'+toc+'</ol>'+body+'</html>','utf8');
 writeFileSync(join(out,'review-manifest.json'),JSON.stringify({grade,academicYear:2083,readyForLive:false,schoolDataIncluded:false,records:records.map(({html,...r})=>r)},null,2),'utf8');
}
console.log('PASS all 8 subjects, 16 distinct review drafts; six reference-only subjects remain blocked; no production writes.');
