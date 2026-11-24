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
import {planNepali2078ReferencePaper} from './cdc-grade9-nepali-grouped-planner.mjs';
const planners={nepali:planNepali2078ReferencePaper,science:planScienceSchoolReference,optional_environment:planEnvironmentSchoolReference,math:planGrade9MathReference,social:planSocial2078ReferencePaper,english:planGrade9EnglishReferencePaper};
const draft=q=>q?.gradeNumber===9&&q.bundled===true&&q.reviewStatus==='draft'&&q.teacherReviewRequired===true&&q.officialCdcQuestion===false&&q.sourceStatus==='SMSS_original_reference_draft'&&q.status!=='archived';
export function referencePreviewTopics({grade,subject,questions=[]}={}){
 if(grade!==9||!Object.hasOwn(planners,cdcSubjectKey(subject)))return [];
 return [...new Set(questions.filter(q=>draft(q)&&q.subject===subject&&typeof q.topicId==='string'&&q.topicId.trim()).map(q=>q.topicId))];
}
export function buildGrade9ReferencePreview({grade,subject,fullMarks,durationMinutes,language,questions=[],selectedTopicIds=[],previousSignature='',avoidSignatures=[],rng=Math.random}={}){
 const key=cdcSubjectKey(subject);
 if(grade!==9||!Object.hasOwn(planners,key))throw Error('No review-only reference generator for this grade and subject');
 const requiredDuration=key==='optional_environment'?135:180;
 if(fullMarks!==75||durationMinutes!==requiredDuration)throw Error('This reference requires 75 marks and '+requiredDuration+' minutes');
 if(!['ne','en','both'].includes(language))throw Error('Select a language');
 if(key==='english'&&language!=='en')throw Error('English assessment must be in English');
 if(key==='nepali'&&language!=='ne')throw Error('Nepali assessment must be in Nepali');
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
 const choose=(ne,en)=>key==='english'||language==='en'?String(en||ne||''):language==='ne'?String(ne||en||''):[ne,en].filter(Boolean).join(' / ');
 const lines=['REFERENCE DRAFT — NOT FOR EXAM / सन्दर्भ समीक्षा मात्र',language==='ne'?'कक्षा ९ · '+paperSubjectLabel(subject,language)+' · पूर्णाङ्क: '+p.fullMarks+' · समय: '+p.durationMinutes+' मिनेट':'Grade 9 · '+subject+' · '+p.fullMarks+' marks · '+p.durationMinutes+' minutes','Current CDC Grid approval and teacher review pending.',result.referenceLabel||'',''];
 const answers=['INDICATIVE ANSWER KEY — TEACHER REVIEW ONLY / उत्तरकुञ्जिका समीक्षा मात्र',(language==='ne'?'कक्षा ९ · '+paperSubjectLabel(subject,language):'Grade 9 · '+subject),'Not an official CDC marking scheme. Review model answers and partial credit before use.',''];
 const figures=[];
 if(key==='english')lines.push('सामान्य निर्देशन: प्रश्न ध्यानपूर्वक पढ्नुहोस्। तोकिएको अङ्क र निर्देशनअनुसार उत्तर अङ्ग्रेजीमा लेख्नुहोस्।','General instructions: Read each question carefully and answer in English as directed.','');
 let answerCount=0;
 const answer=(label,value,marks)=>{
  const text=String(value??'').trim();
  if(!text)throw Error('Missing indicative answer: '+subject+' '+label);
  answers.push(label+' ['+marks+'] '+text);
  answerCount++;
 };
 for(const [i,g] of groups.entries()){
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
 return {ready:true,referenceOnly:true,currentCdcExactApproved:false,readyForLive:false,signature:result.signature,groupCount:groups.length,text:paperDisplayText(lines.join('\n'),language,subject),answerText:paperDisplayText(answers.join('\n'),language,subject),answerCount,figures,sourceUrl:result.sourceUrl};
}
