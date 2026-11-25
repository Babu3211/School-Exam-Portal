// Grade 9 original curriculum practice, NOT the revised official CDC grid.
import {grade9ScienceOriginalBank,SCIENCE_TEXTBOOK_URL} from './cdc-grade9-science-original-practice.mjs';
import {grade9SocialOriginalBank,SOCIAL_CURRICULUM_URL} from './cdc-grade9-social-original-practice.mjs';
import {grade9CompulsoryMathPracticeBank,MATH_ARCHIVE_URL} from './cdc-grade9-compulsory-math-practice.mjs';
import {grade9EnvironmentOriginalBank,ENVIRONMENT_BOOK_PDF} from './cdc-grade9-environment-original-practice.mjs';
import {grade9NepaliPracticeBank,NEPALI_BOOK_PAGE} from './cdc-grade9-nepali-practice.mjs';
import {grade9EnglishPracticeBank,ENGLISH_BOOK} from './cdc-grade9-english-practice.mjs';
import {grade9EconomicsPracticeBank,grade9AccountingPracticeBank,ECONOMICS_SOURCE,ACCOUNTING_SOURCE} from './grade9-economics-accounting-original-practice.mjs';
import {grade9HealthPracticeBank,HEALTH_SOURCE} from './grade9-health-original-practice.mjs';
import {buildAutomaticQuestionPaper,isQuestionReadyForLanguage} from './cdc-question-autogen.mjs';
import {validateSchoolId} from './school-paths.mjs';
const sources=Object.freeze({
 health:{subject:'Health and Physical Education',bank:grade9HealthPracticeBank,url:HEALTH_SOURCE},
 economics:{subject:'Economics',bank:grade9EconomicsPracticeBank,url:ECONOMICS_SOURCE},
 accounting:{subject:'Office Operation and Accounting',bank:grade9AccountingPracticeBank,url:ACCOUNTING_SOURCE},
 math:{subject:'Compulsory Mathematics',bank:grade9CompulsoryMathPracticeBank,url:MATH_ARCHIVE_URL},
 environment:{subject:'Environmental Science',bank:grade9EnvironmentOriginalBank,url:ENVIRONMENT_BOOK_PDF},
 nepali:{subject:'Nepali',bank:grade9NepaliPracticeBank,url:NEPALI_BOOK_PAGE},
 english:{subject:'English',bank:grade9EnglishPracticeBank,url:ENGLISH_BOOK},
 science:{subject:'Science and Technology',bank:grade9ScienceOriginalBank,url:SCIENCE_TEXTBOOK_URL},social:{subject:'Social Studies',bank:grade9SocialOriginalBank,url:SOCIAL_CURRICULUM_URL}});
const issued=new WeakMap();
export function grade9PracticeLanguages(key){
 if(!Object.hasOwn(sources,key))throw Error('Unknown subject');
 return ['social','nepali'].includes(key)?['ne']:key==='english'?['en']:['ne','en','both'];
}
function bankFor(key,language){
 const src=sources[key];
 if(!Object.hasOwn(sources,key)||!grade9PracticeLanguages(key).includes(language))throw Error('Invalid subject or language');
 const bank=src.bank({grade:9,subject:src.subject});
 if(bank.teacherReviewRequired!==true||bank.officialCdcQuestions!==false||bank.exactGridVerified!==false)throw Error('Unreviewed original practice only');
 return {src,bank};
}
export function grade9PracticeTopics(key,language){
 const {bank}=bankFor(key,language);
 return bank.units.map(u=>({id:u.id,name:language==='ne'?u.unitTitle.split(' / ').find(t=>/[\u0900-\u097f]/.test(t))||u.unitTitle:language==='en'?u.unitTitleEn:u.unitTitle,topics:u.topics.map((name,i)=>({id:u.id+'_'+i,name:language==='ne'?name.split(' / ').find(t=>/[\u0900-\u097f]/.test(t))||name:language==='en'?name.split(' / ').find(t=>!/[\u0900-\u097f]/.test(t))||u.unitTitleEn||name: name,available:bank.questions.filter(q=>q.topicId===u.id+'_'+i&&isQuestionReadyForLanguage(q,language)).length}))}));
}
function scopePracticeBank(key,language,coverage){
 const {src,bank}=bankFor(key,language);
 if(coverage==='topic')return {src,bank};
 if(coverage!=='unit')throw Error('Invalid practice coverage mode');
 const knownUnits=new Set(bank.units.map(u=>u.id));
 if(bank.questions.some(q=>!knownUnits.has(q.unitId)))throw Error('Question unit provenance missing');
 // Retain original topic identifiers for display/audit. The V46 planner
 // reserves one question per selected ID; for Unit mode IDs are unit IDs.
 return {src,bank:{...bank,questions:bank.questions.map(q=>({...q,originalTopicId:q.topicId,topicId:q.unitId}))}};
}
export function grade9PracticeCapacity({key,language,topicIds,fullMarks,coverage='topic'}){
 const {bank}=scopePracticeBank(key,language,coverage);
 const limit=key==='health'?50:75;
 if(!Array.isArray(topicIds)||topicIds.length>40||new Set(topicIds).size!==topicIds.length||topicIds.some(id=>typeof id!=='string'))throw Error('Select up to 40 unique topics');
 const pool=[],seen=new Set(),selected=new Set(topicIds);
 for(const q of bank.questions){
  if(!selected.has(q.topicId)||q.status==='archived'||!isQuestionReadyForLanguage(q,language))continue;
  const signature=String(q.questionText).trim().replace(/\s+/g,' ').toLowerCase();
  if(seen.has(signature))continue;seen.add(signature);pool.push(q);
 }
 // Each selected topic must be represented. Whole-mark practice questions only.
 // Exact subset-sum by topic; no CDC grid or future distinct-paper guarantee.
 let reachable=new Set([0]);
 for(const topic of topicIds){
  const sums=new Set([0]);
  for(const q of pool.filter(q=>q.topicId===topic)){
   for(const value of [...sums])if(value+Number(q.marks)<=limit)sums.add(value+Number(q.marks));
  }
  sums.delete(0);
  const next=new Set();
  for(const a of reachable)for(const b of sums)if(a+b<=limit)next.add(a+b);
  reachable=next;
 }
 const possible=topicIds.length?[...reachable].filter(n=>n>0).sort((a,b)=>a-b):[];
 return {questionCount:pool.length,topicCount:topicIds.length,availableMarks:pool.reduce((n,q)=>n+Number(q.marks),0),limit,possible,canGenerate:Number.isSafeInteger(fullMarks)&&possible.includes(fullMarks),exactGridVerified:false};
}
export function generateGrade9CurriculumPractice({schoolId,schoolName,key,language,topicIds,fullMarks,avoidSignatures=[],rng=Math.random,coverage='topic'}){
 validateSchoolId(schoolId);
 if(typeof schoolName!=='string'||!schoolName.trim()||schoolName.length>160||!Number.isSafeInteger(fullMarks)||fullMarks<1||fullMarks>(key==='health'?50:75))throw Error('Verified school and practice full marks required');
 const capacity=grade9PracticeCapacity({key,language,topicIds,fullMarks,coverage});
 if(!capacity.canGenerate)throw Error('Selected topics cannot make these full marks');
 const {src,bank}=scopePracticeBank(key,language,coverage);
 const result=buildAutomaticQuestionPaper({questions:bank.questions,topicIds,fullMarks,language,gradeNumber:9,subject:src.subject,avoidSignatures,rng});
 if(result.teacherReviewRequired!==true||result.exactGridMatched!==false||result.blueprintMatched!==false)throw Error('Practice only');
 const questions=result.questions.map(q=>coverage==='unit'?{...q,topicId:q.originalTopicId}:q);
 const selected=new Set(topicIds),covered=new Set(questions.map(q=>coverage==='unit'?q.unitId:q.topicId));
 if(covered.size!==selected.size||[...covered].some(id=>!selected.has(id)))throw Error('Practice selection coverage mismatch');
 const paper={schoolId,schoolName,grade:9,coverage,selectedIds:[...topicIds],subject:src.subject,sourceUrl:src.url,sourceStatus:'original_curriculum_practice_not_current_grid',questionFormat:'grade9_curriculum_practice',questions,questionCount:result.questionCount,totalMarks:fullMarks,signature:result.signature,language,official:false,approved:false,writeAuthorized:false,teacherReviewRequired:true,exactGridMatched:false};
 issued.set(paper,JSON.stringify(paper));return paper;
}
export function assertGrade9CurriculumPractice(paper){
 if(!paper||issued.get(paper)!==JSON.stringify(paper)||paper.exactGridMatched!==false||paper.official!==false)throw Error('Unchanged curriculum practice required');
 return true;
}
