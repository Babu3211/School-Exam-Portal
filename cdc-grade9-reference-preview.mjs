/** Review-only connection to shipped reference question banks.
 * Does not certify the current CDC Grid, set generatedPaper, save or print.
 */
import {paperDigits,paperSubjectLabel,paperOptionLabel,paperDisplayText,questionFigure} from './cdc-optional-math-render.mjs';
import {cdcSubjectKey} from './cdc-grid-source-index.mjs';
import {planGrade9MathReference} from './cdc-grade9-compulsory-math-grouped.mjs';
import {planSocial2078ReferencePaper} from './cdc-grade9-social-reference-planner.mjs';
import {planGrade9EnglishReferencePaper} from './cdc-grade9-english-grouped-planner.mjs';
import {planEnvironmentSchoolReference} from './cdc-grade9-environment-reference-bank.mjs';
import {planScienceSchoolReference} from './cdc-grade9-science-school-reference.mjs';
import {planNepaliRevisedMarksPractice} from './cdc-grade9-nepali-grouped-planner.mjs';
const planners={nepali:planNepaliRevisedMarksPractice,science:planScienceSchoolReference,optional_environment:planEnvironmentSchoolReference,math:planGrade9MathReference,social:planSocial2078ReferencePaper,english:planGrade9EnglishReferencePaper};
const draft=q=>q?.gradeNumber===9&&q.bundled===true&&q.reviewStatus==='draft'&&q.teacherReviewRequired===true&&q.officialCdcQuestion===false&&q.sourceStatus==='SMSS_original_reference_draft'&&q.status!=='archived';
export function referencePreviewTopics({grade,subject,questions=[]}={}){
 if(grade!==9||!Object.hasOwn(planners,cdcSubjectKey(subject)))return [];
 return [...new Set(questions.filter(q=>draft(q)&&q.subject===subject&&typeof q.topicId==='string'&&q.topicId.trim()).map(q=>q.topicId))];
}
// Independent check of the actual selected groups, not a planner's ready flag.
// Scope is the numerical pattern of the inspected source; never current-year certification.
export function inspectReferencePaperAllocation({subject,groups,durationMinutes}){
 const key=cdcSubjectKey(subject);
 const expectedCounts={nepali:20,english:10,math:16,science:40,social:24,optional_environment:22};
 const need=(condition,detail)=>{if(!condition)throw Error('Reference allocation mismatch: '+detail);};
 const sum=values=>values.reduce((n,x)=>n+x,0);
 const mark=g=>g.marks??sum((g.subquestions||g.items||[]).map(x=>x.marks));
 need(Array.isArray(groups)&&groups.length===expectedCounts[key],'question count');
 const marks=groups.map(mark);
 need(marks.every(m=>Number.isFinite(m)&&m>0)&&sum(marks)===75,'full marks');
 need(durationMinutes===(key==='optional_environment'?135:180),'duration');
 const checks=['Full marks','Main question count','Duration'],unresolved=[];
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const counts=(types)=>types.map(t=>groups.filter(g=>g.questionType===t).length);
 if(key==='english'){
  const slots=['reading1','reading2','reading3','reading4','writing1','writing2','writing3','writing4','transformation','contextual_mcq'];
  need(same(groups.map(g=>g.slot),slots)&&same(marks,[5,10,10,15,5,5,6,8,6,5]),'English CDC chart section marks');
  need(same([sum(marks.slice(0,4)),sum(marks.slice(4,8)),sum(marks.slice(8))],[40,24,11]),'English reading/writing/grammar');
  checks.push('Reading 40 / writing 24 / grammar 11','Ten group marks');
  if(groups.some(g=>g.practiceSubstitution))unresolved.push('Original practice substitutes for a seen textbook passage');
  unresolved.push('Current Grade 9 official model and edition applicability');
 }else if(key==='nepali'){
  const unseen=groups.find(g=>g.skill==='unseen_passage'),summary=groups.find(g=>g.skill==='notes_and_summary');
  need(unseen?.marks===4&&summary?.marks===5&&summary.choices.every(c=>same(c.components.map(x=>x.marks),[2,3])),'Nepali revised selected marks');
  checks.push('Unseen passage 4 / notes 2 / summary 3');
  unresolved.push('Full current Grade 9 revised allocation and authorized seen passages');
 }else if(key==='math'){
  const area=[6,13,13,15,13,11,4],actual=area.map((_,i)=>sum(groups.filter(g=>String(g.unitCode)===String(i+1)).map(mark)));
  need(same(area,actual)&&sum(groups.map(g=>g.subquestions.length))===49,'Compulsory math archived area marks and subparts');
  checks.push('Seven area marks','49 subparts');
  unresolved.push('Revised CDC numerical table and current applicability');
 }else if(key==='science'){
  need(same(counts(['mcq','very_short','short','long']),[10,9,14,7]),'Science question type counts');
  const weights={mcq:1,very_short:1,short:2,long:4};
  need(groups.every(g=>mark(g)===weights[g.questionType]),'Science per-question marks');
  const actual=Array.from({length:19},(_,i)=>sum(groups.filter(g=>String(g.unitCode)===String(i+1)).map(mark)));
  need(same(actual,[3,3,2,3,8,3,5,2,4,7,6,2,7,6,3,3,2,3,3]),'Science archived numerical unit marks');
  const cog=['knowledge','understanding','application','higher'].map(level=>sum(groups.filter(g=>g.cognitiveLevel===level).map(mark)));
  need(same(cog,[12,22,22,19]),'Science archived cognitive totals');
  checks.push('10 MCQ / 9 very short / 14 short / 7 long','19 numbered unit marks','Cognitive 12 / 22 / 22 / 19');
  unresolved.push('2078 unit titles differ from current textbook; cognitive labels editorial; revised grid not retrieved');
 }else if(key==='social'){
  need(same(counts(['very_short','short','long']),[11,9,4])&&groups.every(g=>mark(g)===({very_short:1,short:4,long:7})[g.questionType]),'Social historical question allocation');
  checks.push('11 very short / 9 short / 4 long');
  unresolved.push('Historical 2078 grid; current map adaptation and revised allocation');
 }else if(key==='optional_environment'){
  need(same(counts(['very_short','short','long']),[11,8,3])&&groups.every(g=>mark(g)===({very_short:1,short:5,long:8})[g.questionType]),'Environment school model pattern');
  checks.push('11 very short / 8 short / 3 long');
  unresolved.push('No subject-specific CDC numerical grid; unit and cognitive allocation unverified');
 }
 return {subjectKey:key,fullMarks:75,groupCount:groups.length,groupMarks:marks,durationMinutes,numericalReferenceChecksPassed:true,checks,unresolved,currentCdcExactApproved:false};
}
export function buildGrade9ReferencePreview({grade,subject,fullMarks,durationMinutes,language,questions=[],selectedTopicIds=[],previousSignature='',avoidSignatures=[],rng=Math.random}={}){
 const key=cdcSubjectKey(subject);
 if(grade!==9||!Object.hasOwn(planners,key))throw Error('No review-only reference generator for this grade and subject');
 const requiredDuration=key==='optional_environment'?135:180;
 if(fullMarks!==75||durationMinutes!==requiredDuration)throw Error('This reference requires 75 marks and '+requiredDuration+' minutes');
 if(!['ne','en','both'].includes(language))throw Error('Select a language');
 if(key==='english'&&language!=='en')throw Error('English assessment must be in English');
 if((key==='nepali'||key==='social')&&language!=='ne')throw Error('Nepali and Social Studies assessments must be in Nepali');
 if(!Array.isArray(questions)||questions.length>5000||!Array.isArray(selectedTopicIds)||!selectedTopicIds.length||new Set(selectedTopicIds).size!==selectedTopicIds.length)throw Error('Select distinct reference topics');
 if(!Array.isArray(avoidSignatures)||avoidSignatures.length>30||avoidSignatures.some(x=>typeof x!=='string'||x.length>20000)||typeof previousSignature!=='string'||previousSignature.length>20000)throw Error('Invalid reference paper history');
 const bank=questions.filter(q=>draft(q)&&q.subject===subject);
 const known=new Set(referencePreviewTopics({grade,subject,questions:bank}));
 if(selectedTopicIds.some(id=>!known.has(id)))throw Error('A selected topic has no reference group; select available reference topics');
 const result=planners[key]({grade,subject,fullMarks,durationMinutes,language,questions:bank,selectedTopicIds,previousSignature,avoidSignatures,rng,allowOriginalReferenceDraft:true,allowOriginalSummaryPractice:key==='nepali',allowOriginalReadingPractice:key==='english',currentCurriculumMapPractice:key==='social'});
 if(!result.ready)return {ready:false,reason:result.reason,missing:result.shortages||result.shortage||[],referenceOnly:true,currentCdcExactApproved:false,readyForLive:false};
 if(result.currentCdcExactApproved!==false||result.paper.referenceOnly!==true||result.readyForLive!==false)throw Error('Unexpected reference preview state');
 const p=result.paper,groups=p.groups||p.questions;
 if(!Array.isArray(groups))throw Error('Missing reference groups');
 const allocationReview=inspectReferencePaperAllocation({subject,groups,durationMinutes});
 const choose=(ne,en)=>key==='english'||language==='en'?String(en||ne||''):language==='ne'?String(ne||en||''):[ne,en].filter(Boolean).join(' / ');
 const lines=[(language==='en'?'REFERENCE DRAFT — NOT FOR EXAM':'REFERENCE DRAFT — NOT FOR EXAM / सन्दर्भ समीक्षा मात्र'),language==='ne'?'कक्षा ९ · '+paperSubjectLabel(subject,language)+' · पूर्णाङ्क: '+p.fullMarks+' · समय: '+p.durationMinutes+' मिनेट':'Grade 9 · '+paperSubjectLabel(subject,language)+' · '+p.fullMarks+' marks · '+p.durationMinutes+' minutes','Current CDC Grid approval and teacher review pending.',result.referenceLabel||'',''];
 const answers=[(language==='en'?'INDICATIVE ANSWER KEY — TEACHER REVIEW ONLY':'INDICATIVE ANSWER KEY — TEACHER REVIEW ONLY / उत्तरकुञ्जिका समीक्षा मात्र'),(language==='ne'?'कक्षा ९ · '+paperSubjectLabel(subject,language):'Grade 9 · '+paperSubjectLabel(subject,language)),'Not an official CDC marking scheme. Review model answers and partial credit before use.',''];
 const figures=[],starts=[];
 if(key==='english')lines.push('General instructions: Read each question carefully and answer in English as directed.','');
 let answerCount=0;
 const answer=(label,value,marks)=>{
  const text=String(value??'').trim();
  if(!text)throw Error('Missing indicative answer: '+subject+' '+label);
  answers.push(label+' ['+marks+'] '+text);
  answerCount++;
 };
 for(const [i,g] of groups.entries()){
  starts.push(lines.length);
  if(key==='nepali'){
   lines.push((i+1)+'. '+g.choices.length+' विकल्पमध्ये '+g.answerCount+' वटाको उत्तर दिनुहोस्। ['+g.marks+']');
   for(const [j,c] of g.choices.entries()){
    lines.push('  '+paperOptionLabel(j,language)+'. '+c.text+' ['+c.marks+']');
    if(c.passage)lines.push(c.passage);
    if(c.practiceSubstitution)lines.push('मौलिक अभ्यास — पाठगत उद्धरण होइन।');
    const label=(i+1)+'.'+paperOptionLabel(j,language);
    answer(label,c.answer,c.marks);
    for(const [k,x] of (c.components||[]).entries()){
     lines.push('    '+paperOptionLabel(k,language,true)+') '+x.text+' ['+x.marks+']');
     answer(label+'.'+paperOptionLabel(k,language,true),x.answer,x.marks);
    }
   }
   lines.push('');continue;
  }
  const figure=questionFigure(g,language);if(figure)figures.push({number:i+1,html:figure});
  const parts=g.subquestions||g.items||[];
  const marks=g.marks??parts.reduce((s,x)=>s+Number(x.marks||0),0);
  lines.push((i+1)+'. '+(key==='english'?g.text:choose(g.contextNe||g.questionText,g.contextEn||g.questionTextEn))+' ['+marks+']');
  if(g.practiceSubstitution===true)lines.push('ORIGINAL PRACTICE — not a seen textbook extract.');
  if(g.passage)lines.push(g.passage);
  if(g.questionType==='mcq')for(const [j,o] of (g.options||[]).entries())lines.push('  '+paperOptionLabel(j,language)+'. '+choose(o,g.optionsEn?.[j]));
  if(Array.isArray(g.mapChoices)){
   for(const [j,c] of g.mapChoices.entries()){
    lines.push((language==='ne'?(j===0?'विकल्प क: ':'अथवा ख: '):(j===0?'Option A: ':'OR / अथवा B: '))+choose(c.textNe,c.textEn)+' [7]');
    answer((i+1)+'.'+paperOptionLabel(j,language),choose(c.answerNe,c.answerEn)+' — '+c.labels.map(l=>choose(l.ne,l.en)).join('; '),7);
   }
  }else if(!parts.length){
   answer(String(i+1),(g.correctOption?g.correctOption+' — ':'')+(key==='english'?g.answer:choose(g.answerNe||g.answer,g.answerEn)),marks);
  }
  for(const [j,x] of parts.entries()){
   lines.push('  '+paperOptionLabel(j,language,true)+') '+(key==='english'?x.text:choose(x.textNe,x.textEn))+' ['+x.marks+']');
   if(Array.isArray(x.options))lines.push('    '+x.options.map((o,k)=>paperOptionLabel(k,language)+'. '+o).join('    '));
   answer((i+1)+'.'+paperOptionLabel(j,language,true),(x.correctOption?x.correctOption+' — ':'')+(key==='english'?String(x.answer??''):choose(x.answerNe||x.answer,x.answerEn)),x.marks);
  }
  lines.push('');
 }
 const introText=paperDisplayText(lines.slice(0,starts[0]).join('\n'),language,subject);
 const blocks=starts.map((start,i)=>({number:i+1,text:paperDisplayText(lines.slice(start,starts[i+1]??lines.length).join('\n'),language,subject),figureHtml:figures.find(f=>f.number===i+1)?.html||''}));
 return {ready:true,referenceOnly:true,currentCdcExactApproved:false,readyForLive:false,signature:result.signature,groupCount:groups.length,allocationReview,introText,blocks,text:paperDisplayText(lines.join('\n'),language,subject),answerText:paperDisplayText(answers.join('\n'),language,subject),answerCount,figures,sourceUrl:result.sourceUrl};
}
