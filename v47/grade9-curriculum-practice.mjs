// Grade 9 original curriculum practice, NOT the revised official CDC grid.
import {grade9ScienceOriginalBank,SCIENCE_TEXTBOOK_URL} from './cdc-grade9-science-original-practice.mjs';
import {grade9SocialOriginalBank,SOCIAL_CURRICULUM_URL} from './cdc-grade9-social-original-practice.mjs';
import {buildAutomaticQuestionPaper,isQuestionReadyForLanguage} from './cdc-question-autogen.mjs';
import {validateSchoolId} from './school-paths.mjs';
const sources=Object.freeze({science:{subject:'Science and Technology',bank:grade9ScienceOriginalBank,url:SCIENCE_TEXTBOOK_URL},social:{subject:'Social Studies',bank:grade9SocialOriginalBank,url:SOCIAL_CURRICULUM_URL}});
const issued=new WeakMap();
function bankFor(key,language){
 const src=sources[key];
 if(!Object.hasOwn(sources,key)||!['ne','en','both'].includes(language)||key==='social'&&language!=='ne')throw Error('Invalid subject or language');
 const bank=src.bank({grade:9,subject:src.subject});
 if(bank.teacherReviewRequired!==true||bank.officialCdcQuestions!==false||bank.exactGridVerified!==false)throw Error('Unreviewed original practice only');
 return {src,bank};
}
export function grade9PracticeTopics(key,language){
 const {bank}=bankFor(key,language);
 return bank.units.map(u=>({id:u.id,name:language==='ne'?u.unitTitle.split(' / ')[0]:language==='en'?u.unitTitleEn:u.unitTitle,topics:u.topics.map((name,i)=>({id:u.id+'_'+i,name:language==='ne'?name.split(' / ')[0]:language==='en'?name.split(' / ').at(-1):name,available:bank.questions.filter(q=>q.topicId===u.id+'_'+i&&isQuestionReadyForLanguage(q,language)).length}))}));
}
export function generateGrade9CurriculumPractice({schoolId,schoolName,key,language,topicIds,fullMarks,avoidSignatures=[],rng=Math.random}){
 validateSchoolId(schoolId);
 if(typeof schoolName!=='string'||!schoolName.trim()||schoolName.length>160||!Number.isSafeInteger(fullMarks)||fullMarks<1||fullMarks>75)throw Error('Verified school and practice full marks required');
 const {src,bank}=bankFor(key,language);
 const result=buildAutomaticQuestionPaper({questions:bank.questions,topicIds,fullMarks,language,gradeNumber:9,subject:src.subject,avoidSignatures,rng});
 if(result.teacherReviewRequired!==true||result.exactGridMatched!==false||result.blueprintMatched!==false)throw Error('Practice only');
 const paper={schoolId,schoolName,grade:9,subject:src.subject,sourceUrl:src.url,sourceStatus:'original_curriculum_practice_not_current_grid',questionFormat:'grade9_curriculum_practice',questions:result.questions,questionCount:result.questionCount,totalMarks:fullMarks,signature:result.signature,language,official:false,approved:false,writeAuthorized:false,teacherReviewRequired:true,exactGridMatched:false};
 issued.set(paper,JSON.stringify(paper));return paper;
}
export function assertGrade9CurriculumPractice(paper){
 if(!paper||issued.get(paper)!==JSON.stringify(paper)||paper.exactGridMatched!==false||paper.official!==false)throw Error('Unchanged curriculum practice required');
 return true;
}
