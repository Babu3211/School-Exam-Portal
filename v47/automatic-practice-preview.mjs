// V47 offline original practice generation. Exact source planner is reused
// from V46 development 4a0c6f71; no database writes or official approval.
import {readBundledScienceBank,buildAutomaticQuestionPaper,isQuestionReadyForLanguage} from './cdc-question-autogen.mjs';
import {validateSchoolId} from './school-paths.mjs';
export function practiceUnitOptions({pack,bilingual,language}){
 const bank=readBundledScienceBank(pack,{grade:pack.gradeNumber,subject:'Science',bilingual});
 return bank.units.map(u=>({id:u.id+'_0',name:u.unitTitle,available:bank.questions.filter(q=>q.topicId===u.id+'_0'&&isQuestionReadyForLanguage(q,language)).length}));
}
export function generatePracticePreview({schoolId,schoolName,pack,bilingual,topicIds,fullMarks,language,avoidSignatures=[],rng=Math.random}){
 validateSchoolId(schoolId);
 if(typeof schoolName!=='string'||!schoolName.trim()||schoolName.length>160)throw Error('Verified school name required');
 if(![8,10].includes(pack?.gradeNumber)||!Number.isSafeInteger(fullMarks)||fullMarks<1||fullMarks>250)throw Error('Valid practice class and full marks required');
 const bank=readBundledScienceBank(pack,{grade:pack.gradeNumber,subject:'Science',bilingual});
 const result=buildAutomaticQuestionPaper({questions:bank.questions,topicIds,fullMarks,language,avoidSignatures,rng,gradeNumber:pack.gradeNumber});
 if(result.teacherReviewRequired!==true||result.exactGridMatched!==false||result.blueprintMatched!==false)throw Error('Practice-only generation required');
 return Object.freeze({schoolId,schoolName,grade:pack.gradeNumber,subject:pack.canonicalSubject,sourceTitle:pack.sourceTitle,sourceUrl:pack.sourceUrl,sourceStatus:result.sourceStatus,questions:Object.freeze(result.questions.map(q=>Object.freeze({...q,options:Object.freeze([...q.options])}))),questionCount:result.questionCount,totalMarks:result.fullMarks,signature:result.signature,language,approved:false,official:false,teacherReviewRequired:true,writeAuthorized:false});
}
