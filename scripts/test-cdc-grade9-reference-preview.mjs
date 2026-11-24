import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildGrade9ReferencePreview as build,referencePreviewTopics as topics} from '../cdc-grade9-reference-preview.mjs';
import {grade9SocialReferenceBank} from '../cdc-grade9-social-reference-bank.mjs';
import {grade9CompulsoryMathReferenceBank} from '../cdc-grade9-compulsory-math-reference-bank.mjs';
const grade=9;
for(const [subject,provider,count] of [['Social Studies',grade9SocialReferenceBank,24],['Mathematics',grade9CompulsoryMathReferenceBank,16]]){
 const pack=provider({grade,subject}),questionBefore=JSON.stringify(pack);
 const ids=topics({grade,subject,questions:pack.questions});
 const args={grade,subject,questions:pack.questions,selectedTopicIds:ids,fullMarks:75,durationMinutes:180,language:'both',rng:()=>.39};
 const a=build(args),b=build({...args,previousSignature:a.signature,rng:()=>.61});
 assert.equal(a.ready,true,a.reason);assert.equal(b.ready,true,b.reason);
 assert.notEqual(a.signature,b.signature);assert.equal(a.groupCount,count);
 assert.match(a.text,/REFERENCE DRAFT — NOT FOR EXAM/);
 assert.match(a.text,/75 marks · 180 minutes/);
 assert.equal(a.readyForLive,false);assert.equal(a.currentCdcExactApproved,false);
 assert.equal(JSON.stringify(pack),questionBefore);
 assert.throws(()=>build({...args,selectedTopicIds:['outside']}),/no reference group/);
 assert.throws(()=>build({...args,grade:8}),/No review-only/);
 assert.throws(()=>build({...args,fullMarks:50}),/75 marks/);
}
const ui=readFileSync(new URL('../cdc-question-paper.js',import.meta.url),'utf8');
assert.match(ui,/id="qpReferenceDraftBtn"/);
assert.match(ui,/function generateReferenceDraftPreview\(\)/);
assert.match(ui,/box\.textContent=result\.text/);
assert.match(ui,/roleCanTeach\(selectedClass,selectedSubject,selectedSection\)/);
assert.match(ui,/clearReferenceDraftPreview\(\)/);
const f=ui.slice(ui.indexOf('function generateReferenceDraftPreview()'),ui.indexOf('async function generateSmartPaper()'));
assert.doesNotMatch(f,/generatedPaper\s*=|addDoc\(|setDoc\(|printPaper\(/);
console.log('PASS actual Grade9 maths/social reference banks in separate read-only preview, selected topic checks and no official save or print');

const {grade9EnglishReferenceBank,grade9EnglishPracticeReading2}=await import('../cdc-grade9-english-reference-bank.mjs');
const {planGrade9EnglishReferencePaper}=await import('../cdc-grade9-english-grouped-planner.mjs');
const {assertGrade9ExamPaperMatches}=await import('../cdc-grade9-paper-grid-guard.mjs');
const english='English',e=grade9EnglishReferenceBank({grade,subject:english}),practice=grade9EnglishPracticeReading2({grade,subject:english});
assert.equal(practice.length,2);
const all=[...e.questions.filter(q=>q.slot!=='reading2'),...practice];
const ea={grade,subject:english,questions:all,selectedTopicIds:topics({grade,subject:english,questions:all}),fullMarks:75,durationMinutes:180,language:'en',rng:()=>.37,allowOriginalReferenceDraft:true};
assert.equal(planGrade9EnglishReferencePaper(ea).ready,false);
const ep=planGrade9EnglishReferencePaper({...ea,allowOriginalReadingPractice:true});
assert.equal(ep.ready,true,ep.reason);assert.equal(ep.practiceSubstitution,true);
assert.equal(ep.paper.groups.reduce((n,g)=>n+g.marks,0),75);
assert.equal(ep.paper.groups.slice(0,4).reduce((n,g)=>n+g.items.length,0),40);
assert.throws(()=>assertGrade9ExamPaperMatches(ep.paper),/verified subject/);
const ev=build(ea);
assert.equal(ev.ready,true,ev.reason);assert.equal(ev.groupCount,10);assert.match(ev.text,/ORIGINAL PRACTICE — not a seen textbook extract/);
assert.notEqual(build({...ea,previousSignature:ev.signature,rng:()=>.63}).signature,ev.signature);
assert.equal(ev.readyForLive,false);
console.log('PASS offline English full reference practice, explicit original reading replacement, official gate unchanged');

// The pack test checks all six reference subjects, two distinct sets and answer coverage.

const {grade9ScienceSchoolReferenceBank}=await import('../cdc-grade9-science-school-reference.mjs');
const {grade9EnvironmentReferenceBank}=await import('../cdc-grade9-environment-reference-bank.mjs');
const {grade9NepaliReferenceBank,grade9NepaliPracticeSummaryDrafts}=await import('../cdc-grade9-nepali-reference-bank.mjs');
for(const [subject,questions,language,duration] of [
 ['Science and Technology',grade9ScienceSchoolReferenceBank({grade,subject:'Science and Technology'}).questions,'both',180],
 ['Environmental Science',grade9EnvironmentReferenceBank({grade,subject:'Environmental Science'}).questions,'both',135],
 ['Nepali',[...grade9NepaliReferenceBank({grade,subject:'Nepali'}).questions,...grade9NepaliPracticeSummaryDrafts({grade,subject:'Nepali'})],'ne',180],
 ['English',all,'en',180],
 ['Mathematics',grade9CompulsoryMathReferenceBank({grade,subject:'Mathematics'}).questions,'both',180],
 ['Social Studies',grade9SocialReferenceBank({grade,subject:'Social Studies'}).questions,'both',180]
]){
 const history=[],args={grade,subject,questions,language,durationMinutes:duration,fullMarks:75,selectedTopicIds:topics({grade,subject,questions}),rng:()=>.39};
 for(let i=0;i<(subject==='Science and Technology'?31:4);i++){
  const r=build({...args,avoidSignatures:history.slice(-30)});
  assert.equal(r.ready,true,subject+' '+r.reason);assert.ok(!history.includes(r.signature),subject+' repeated an older draft');history.push(r.signature);
  assert.equal(r.readyForLive,false);
 }
 assert.throws(()=>build({...args,avoidSignatures:Array(31).fill('x')}),/Invalid reference paper history/);
}
assert.match(ui,/avoidSignatures:referencePreviewHistory\.get\(scope\)/);
assert.match(ui,/\.slice\(0,30\)/);
console.log('PASS six reference subjects exclude earlier session drafts; science exercises 31 distinct papers even with constant RNG');

const neDraft=build({...ea,subject:'Mathematics',questions:grade9CompulsoryMathReferenceBank({grade,subject:'Mathematics'}).questions,selectedTopicIds:topics({grade,subject:'Mathematics',questions:grade9CompulsoryMathReferenceBank({grade,subject:'Mathematics'}).questions}),language:'ne'});
assert.equal(neDraft.ready,true,neDraft.reason);assert.match(neDraft.text,/कक्षा ९ · अनिवार्य गणित/);assert.match(neDraft.text,/पूर्णाङ्क: ७५/);assert.doesNotMatch(neDraft.text,/[0-9]/);assert.doesNotMatch(neDraft.answerText,/[0-9]/);
