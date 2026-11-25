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
 // Count only scored alternatives; do not double-count offered choices.
 const positive=m=>Number.isFinite(m)&&m>0;
 for(const g of groups){
  const parts=g.subquestions||g.items||[];
  if(parts.length)need(parts.every(x=>positive(x.marks))&&sum(parts.map(x=>x.marks))===mark(g),'subquestion marks');
  if(Array.isArray(g.choices)){
   need(Number.isSafeInteger(g.answerCount)&&g.answerCount>0&&g.answerCount<=g.choices.length,'choice count');
   for(const c of g.choices){
    need(positive(c.marks)&&c.marks*g.answerCount===mark(g),'scored choice marks');
    if(c.components?.length)need(c.components.every(x=>positive(x.marks))&&sum(c.components.map(x=>x.marks))===c.marks,'choice component marks');
   }
  }
  if(Array.isArray(g.mapChoices))need(g.mapChoices.length===2&&g.mapChoices.every(c=>c.outlineMarks+c.labelMarks===mark(g)),'map alternative marks');
  if(g.markParts!==undefined)need(Array.isArray(g.markParts)&&g.markParts.length>=2&&g.markParts.every(positive)&&sum(g.markParts)===mark(g),'explicit task mark split');
 }
 const checks=['Full marks','Main question count','Duration','Scored subparts and alternatives'],unresolved=[];
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const counts=(types)=>types.map(t=>groups.filter(g=>g.questionType===t).length);
 if(key==='english'){
  const slots=['reading1','reading2','reading3','reading4','writing1','writing2','writing3','writing4','transformation','contextual_mcq'];
  need(same(groups.map(g=>g.slot),slots)&&same(marks,[5,10,10,15,5,5,6,8,6,5]),'English CDC chart section marks');
  need(same([sum(marks.slice(0,4)),sum(marks.slice(4,8)),sum(marks.slice(8))],[40,24,11]),'English reading/writing/grammar');
  for(const [i,g] of groups.slice(0,4).entries()){
   const subCounts=Object.values(g.items.reduce((acc,x)=>(acc[x.type]=(acc[x.type]||0)+1,acc),{}));
   need(same(subCounts,Array(i===0?1:i===3?3:2).fill(5)),'English reading '+(i+1)+' model subsection size');
  }
  checks.push('Reading 40 / writing 24 / grammar 11','Ten group marks','Model reading subsections of five items');
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
  const levels=['knowledge','understanding','application','higher'];
  const groupCounts=[1,3,3,3,3,2,1],itemCounts=[[1,1,1,1],[2,2,3,2],[2,2,2,2],[2,2,3,1],[2,2,2,2],[2,2,2,2],[1,1,1,1]],levelMarks=[[1,1,3,1],[2,3,5,3],[2,3,5,3],[2,4,7,2],[2,3,5,3],[2,3,4,2],[1,1,1,1]];
  for(let i=0;i<area.length;i++){
   const gs=groups.filter(g=>String(g.unitCode)===String(i+1)),parts=gs.flatMap(g=>g.subquestions);
   need(gs.length===groupCounts[i]&&same(levels.map(l=>parts.filter(x=>x.cognitiveLevel===l).length),itemCounts[i])&&same(levels.map(l=>sum(parts.filter(x=>x.cognitiveLevel===l).map(x=>x.marks))),levelMarks[i]),'Mathematics archived area '+(i+1)+' cognitive allocation');
  }
  checks.push('Seven area marks','49 subparts','Per-area question and cognitive item/mark matrix');
  unresolved.push('Revised CDC numerical table and current applicability');
 }else if(key==='science'){
  need(same(counts(['mcq','very_short','short','long']),[10,9,14,7]),'Science question type counts');
  need(same(groups.map(g=>g.questionType),['mcq','very_short','short','long'].flatMap((t,i)=>Array([10,9,14,7][i]).fill(t))),'Science model section order');
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
  const withAlternative=groups.filter(g=>g.orAlternative);
  need(withAlternative.length===1,'Environment school reference OR count');
  const g=withAlternative[0],alt=g.orAlternative;
  need(g.questionType==='long'&&alt.questionType==='long'&&mark(g)===8&&alt.marks===8&&String(alt.unitCode)==='4'&&alt.id&&groups.every(x=>x.id!==alt.id)&&alt.questionText&&alt.questionTextEn&&alt.answer&&alt.answerEn,'Environment pollution alternative eligibility');
  if(alt.markParts)need(alt.markParts.every(positive)&&sum(alt.markParts)===8,'Environment alternative mark split');
  checks.push('One additional pollution OR alternative (8 marks, not additional total)');
  unresolved.push('School syllabus 2083 mirror lists ten units; the current CDC textbook has nine. Unit and cognitive grid reconciliation remains unresolved; the OR position is an editorial choice.');
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
 // Model-style item weight notation. Mathematics follows the visually checked
 // 2078 model's K/U/A/HA labels; other reference subjects show numeric weights
 // without claiming a current official model layout.
 const levelCode={knowledge:'K',understanding:'U',application:'A',higher:'HA'};
 const itemMark=(x)=>'['+x.marks+(key==='math'?levelCode[x.cognitiveLevel]:'')+']';
 const groupMark=(g,parts,marks)=>'['+marks+']';
 const modelMark=(marks)=>'('+marks+')';
 const repeatedMark=(items)=>modelMark(items.length+' × '+items[0].marks+' = '+items.reduce((n,x)=>n+x.marks,0));
 const alpha=i=>String.fromCharCode(97+i), upper=i=>String.fromCharCode(65+i);
 const roman=['i','ii','iii','iv','v','vi','vii','viii','ix','x'];
 const cleanSetLabel=t=>String(t).replace(/\s+Set\s+\d+\.$/i,'').replace(/\s*\((?:समूह|सन्दर्भ अभ्यास)\s+\d+\)\s*$/u,'');
 const neLower=i=>['अ','आ','इ','ई','उ','ऊ','ऋ'][i]||paperOptionLabel(i,'ne');
 const englishTask=x=>({mcq:'Select the best answer.',true_false:'Identify each statement as True or False.',gap_fill:'Complete the blanks with words from the passage.',short_answer:'Give answers to the questions below.',matching:'Match each word with its meaning.',ordering:'Arrange the items in the correct order.'}[x]);
 const rotate=a=>a.slice(1).concat(a.slice(0,1));
 const sectionTitle=(i,g)=>{
  if(!['science','social','optional_environment'].includes(key)||i&&groups[i-1].questionType===g.questionType)return '';
  const group=groups.filter(x=>x.questionType===g.questionType),n=group.length,m=group[0].marks;
  const names={mcq:['बहुविकल्पीय प्रश्न','Multiple choice questions'],very_short:['अति छोटो उत्तर आउने प्रश्न','Very short answer questions'],short:['छोटो उत्तर आउने प्रश्न','Short answer questions'],long:['लामो उत्तर आउने प्रश्न','Long answer questions']};
  const instructions={mcq:['सही उत्तरमा गोलो चिन्ह लगाउनुहोस्।','Circle the correct option.'],very_short:['अति छोटो उत्तर दिनुहोस्।','Give very short answers.'],short:['छोटो उत्तर दिनुहोस्।','Give short answers.'],long:['लामो उत्तर दिनुहोस्।','Give long answers.']};
  const label=instructions[g.questionType];if(!label)return '';
  const groupIndex=['mcq','very_short','short','long'].indexOf(g.questionType)-(key==='science'?0:1);
  const groupNe=['क','ख','ग','घ'][groupIndex],groupEn=['A','B','C','D'][groupIndex];
  const heading=choose('समूह ('+groupNe+')','Group '+groupEn);
  // Source: CDC Grade 9 science 2078 model, Group A separate numbering
  // and 25-minute MCQ section. Use grid totals, not inconsistent extracted
  // multiplication strings in the archived model.
  const time=key==='science'&&g.questionType==='mcq'?' — '+choose('समय: 25 मिनेट','Time: 25 minutes'):'';
  return heading+time+'\n'+choose(label[0],label[1])+' ('+n+' × '+m+' = '+(n*m)+')';
 };
 if(key==='english')lines.push('General instructions: Read each question carefully and answer in English as directed.','');
 if(key==='nepali')lines.push('तलका सबै मुख्य प्रश्न अनिवार्य छन्। विकल्प दिइएका प्रश्नमा निर्देशन पालना गर्नुहोस्।','');
 let answerCount=0;
 const answer=(label,value,marks)=>{
  const text=String(value??'').trim();
  if(!text)throw Error('Missing indicative answer: '+subject+' '+label);
  answers.push(label+' ['+marks+'] '+text);
  answerCount++;
 };
 for(const [i,g] of groups.entries()){
  starts.push(lines.length);
  const section=sectionTitle(i,g);if(section){lines.push(section,'');answers.push('',section);}
  // Keep internal block numbers unique for figures and DOM identity.
  const displayNumber=key==='science'&&i>=10?i-9:i+1;
  if(key==='english'){
   const parts=g.items||[];
   const isReading=i<4;
   lines.push(displayNumber+'. '+cleanSetLabel(g.text)+(isReading?'':' '+(parts.length?repeatedMark(parts):modelMark(g.marks))));
   if(g.practiceSubstitution===true)lines.push('ORIGINAL PRACTICE — not a seen textbook extract.');
   if(isReading){
    lines.push(g.passage,'');
    const kinds=[...new Set(parts.map(x=>x.type))];
    if(i===3&&kinds.includes('matching')){kinds.splice(kinds.indexOf('matching'),1);kinds.unshift('matching');}
    // Vocabulary is a separate subsection, even if another matching task exists.
    for(const [k,type] of kinds.entries()){
     const items=parts.filter(x=>x.type===type);
     lines.push(upper(k)+'. '+(englishTask(type)||'')+' '+repeatedMark(items));
     if(type==='matching'&&items.every(x=>x.domain==='vocabulary')){
      const meanings=rotate([...items.map(x=>x.text.replace(/^Find (?:a|the) (?:word|verb) meaning\s*/i,'').replace(/\.$/,'')),'a device for measuring temperature']);
      if(items.some(x=>!x.answer)||new Set(meanings).size!==6)throw Error('Invalid vocabulary matching options');
      lines.push('    Column A                         Column B');
      for(let j=0;j<meanings.length;j++)lines.push('    '+(items[j]?alpha(j)+'. '+items[j].answer:'')+'     |     '+roman[j]+'. '+meanings[j]);
     }else{
      for(const [j,x] of items.entries()){
       lines.push('    '+alpha(j)+'. '+x.text);
       if(Array.isArray(x.options))x.options.forEach((o,l)=>lines.push('        '+roman[l]+'. '+o));
      }
     }
     items.forEach((x,j)=>answer(displayNumber+'.'+upper(k)+'.'+alpha(j),(x.correctOption?roman['ABCD'.indexOf(x.correctOption)]+' — ':'')+x.answer,x.marks));
     lines.push('');
    }
   }else if(g.slot==='contextual_mcq'){
    lines.push(g.passage.replace(/\{(\d+)\}/g,(_,n)=>{
     const j=Number(n)-1,x=parts[j];if(!x)throw Error('Unmapped contextual blank');
     return '('+alpha(j)+') ……… ('+x.options.join(', ')+')';
    }));
    parts.forEach((x,j)=>answer(displayNumber+'.'+alpha(j),x.answer,x.marks));
   }else if(parts.length){
    parts.forEach((x,j)=>{lines.push('    '+alpha(j)+'. '+x.text);answer(displayNumber+'.'+alpha(j),x.answer,x.marks);});
   }else answer(String(displayNumber),g.answer,g.marks);
   lines.push('');continue;
  }
  if(key==='nepali'){
   const multi=g.choices.length>1;
   const gMark=g.skill==='notes_and_summary'?modelMark('2 + 3 = 5'):g.answerCount>1?modelMark(Array(g.answerCount).fill(g.choices[0].marks).join(' + ')+' = '+g.marks):g.skill==='word_formation'?'':modelMark(g.marks);
   if(multi)lines.push((i+1)+'. कुनै '+(g.answerCount===1?'एक':'दुई')+' प्रश्नको उत्तर दिनुहोस् : '+gMark);
   for(const [j,c] of g.choices.entries()){
    const choiceLabel=paperOptionLabel(j,'ne'),label=multi?(i+1)+'.'+choiceLabel:String(i+1),components=c.components||[];
    const prefix=multi?'('+choiceLabel+') ':(i+1)+'. ';
    const prompt=g.skill==='vocabulary_matching'?'समूह ‘क’ का शब्दलाई समूह ‘ख’ का अर्थसँग जोडा मिलाउनुहोस् :':cleanSetLabel(c.text);
    lines.push(prefix+prompt+(multi||!gMark?'':' '+gMark));
    if(c.passage)lines.push(c.passage);
    if(c.practiceSubstitution)lines.push('मौलिक अभ्यास — पाठगत उद्धरण होइन।');
    if(g.skill==='vocabulary_matching'){
     const rows=components.map(x=>{const m=/^(.+?)\s*—\s*\((.+)\)$/.exec(x.text);if(!m)throw Error('Missing Nepali matching choices');return {word:m[1],options:m[2].split(',').map(v=>v.trim()),answer:x.answer};});
     const meanings=rotate([...rows.map(x=>x.answer),...rows.slice(0,2).map(x=>x.options.find(v=>v!==x.answer))]);
     if(new Set(meanings).size!==6||meanings.some(x=>!x))throw Error('Invalid matching options');
     lines.push('समूह ‘क’                       समूह ‘ख’');
     for(let k=0;k<meanings.length;k++)lines.push((rows[k]?.word||'')+'     |     '+meanings[k]);
    }else if(g.skill==='tense_aspect'&&c.passage||g.skill==='verb_mood'||g.skill==='word_class'){
     // The printed question contains the passage or composition prompt once.
    }else if(g.skill==='sentence_editing'||g.skill==='vocabulary_sentence_use'){
     lines.push(components.map(x=>x.text).join(g.skill==='sentence_editing'?' / ':', '));
    }else{
     for(const [k,x] of components.entries()){
      const sub=multi?neLower(k):paperOptionLabel(k,'ne');
      lines.push('    ('+sub+') '+x.text+(g.skill==='word_formation'?' '+modelMark(x.marks):''));
     }
    }
    if(components.length)components.forEach((x,k)=>answer(label+'.'+(multi?neLower(k):paperOptionLabel(k,'ne')),x.answer,x.marks));
    else answer(label,c.answer,c.marks);
   }
   lines.push('');continue;
  }
  const figure=questionFigure(g,language);if(figure)figures.push({number:i+1,html:figure});
  const parts=g.subquestions||g.items||[];
  const marks=g.marks??parts.reduce((s,x)=>s+Number(x.marks||0),0);
  const groupOnly=key==='science'||key==='social'||key==='optional_environment';
  const split=key==='social'&&g.markParts?modelMark(g.markParts.join(' + ')+' = '+marks):'';
  // The archived science and social models place uniform marks at the section
  // header, not beside each ordinary question. Compound tasks alone show splits.
  if(!Array.isArray(g.mapChoices))lines.push(displayNumber+'. '+choose(g.contextNe||g.questionText,g.contextEn||g.questionTextEn)+(split?' '+split:key==='math'||groupOnly?'':' '+groupMark(g,parts,marks)));
  else lines.push(displayNumber+'. '+choose('तलका नक्सामध्ये कुनै एक तयार पार्नुहोस्।','Draw either of the following maps.')+' '+modelMark(g.mapChoices[0].outlineMarks+' + '+g.mapChoices[0].labelMarks+' = '+marks));
  if(g.practiceSubstitution===true)lines.push('ORIGINAL PRACTICE — not a seen textbook extract.');
  if(g.passage)lines.push(g.passage);
  if(g.questionType==='mcq')for(const [j,o] of (g.options||[]).entries())lines.push('  '+paperOptionLabel(j,language)+'. '+choose(o,g.optionsEn?.[j]));
  if(Array.isArray(g.mapChoices)){
   for(const [j,c] of g.mapChoices.entries()){
    if(j>0)lines.push(choose('अथवा','OR'));
    lines.push(choose(c.textNe,c.textEn));
    answer(displayNumber+'.'+paperOptionLabel(j,language),choose(c.answerNe,c.answerEn)+' — '+c.labels.map(l=>choose(l.ne,l.en)).join('; '),marks);
   }
  }else if(!parts.length){
   const rubric=key==='social'&&g.markParts?' ('+g.markParts.join(' + ')+' = '+marks+')':'';
   answer(String(displayNumber),(g.correctOption?g.correctOption+' — ':'')+choose(g.answerNe||g.answer,g.answerEn)+rubric,marks);
  }
  if(key==='optional_environment'&&g.orAlternative){
   const alt=g.orAlternative;
   lines.push(choose('अथवा','OR'));
   lines.push(choose(alt.questionText,alt.questionTextEn)+(alt.markParts?' '+modelMark(alt.markParts.join(' + ')+' = '+alt.marks):''));
   answer(displayNumber+' ('+choose('अथवा','OR')+')',choose(alt.answer,alt.answerEn),alt.marks);
  }
  for(const [j,x] of parts.entries()){
   lines.push('  '+paperOptionLabel(j,language,true)+') '+(key==='english'?x.text:choose(x.textNe,x.textEn))+' '+itemMark(x));
   if(Array.isArray(x.options))lines.push('    '+x.options.map((o,k)=>paperOptionLabel(k,language)+'. '+o).join('    '));
   answer(displayNumber+'.'+paperOptionLabel(j,language,true),(x.correctOption?x.correctOption+' — ':'')+(key==='english'?String(x.answer??''):choose(x.answerNe||x.answer,x.answerEn)),x.marks);
  }
  lines.push('');
 }
 const introText=paperDisplayText(lines.slice(0,starts[0]).join('\n'),language,subject);
 const blocks=starts.map((start,i)=>({number:i+1,displayNumber:key==='science'&&i>=10?i-9:i+1,text:paperDisplayText(lines.slice(start,starts[i+1]??lines.length).join('\n'),language,subject),figureHtml:figures.find(f=>f.number===i+1)?.html||''}));
 return {ready:true,referenceOnly:true,currentCdcExactApproved:false,readyForLive:false,signature:result.signature,groupCount:groups.length,allocationReview,introText,blocks,text:paperDisplayText(lines.join('\n'),language,subject),answerText:paperDisplayText(answers.join('\n'),language,subject),answerCount,figures,sourceUrl:result.sourceUrl};
}
