// Reuse pinned V46 composite math engine, offline original draft bank and renderer.
import {getCdcOptionalMathGuide,optionalMathAreaTopics} from './cdc-optional-math-2082.mjs';
import {originalOptionalMathPracticeBank} from './cdc-optional-math-original-practice.mjs';
import {inspectCdcOptionalMathPaper} from './cdc-optional-math-composite.mjs';
import {assertGrade9ExamPaperMatches} from './cdc-grade9-paper-grid-guard.mjs';
import {renderCdcCompositePaper,PAPER_PRINT_CSS} from './cdc-optional-math-render.mjs';
import {validateSchoolId} from './school-paths.mjs';
const issued=new WeakMap(),subject='Optional Mathematics';
const escapeHtml=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function generateMathPractice({schoolId,schoolName,language='both',avoidSignatures=[],rng=Math.random}){
 validateSchoolId(schoolId);
 if(typeof schoolName!=='string'||!schoolName.trim()||schoolName.length>160)throw Error('Verified school name required');
 const grade=9,guide=getCdcOptionalMathGuide({grade,subject}),bank=originalOptionalMathPracticeBank({grade,subject});
 const selectedTopicIds=optionalMathAreaTopics(grade,subject).map(u=>u.id+'_0');
 const result=inspectCdcOptionalMathPaper({guide,questions:bank.questions,selectedTopicIds,language,avoidSignatures,rng,allowFormulaVerifiedDraft:true});
 if(!result.ready||!result.cellAudit.matches||result.sourceApprovedByCdc!==false||result.teacherReviewRequired!==true)throw Error('Optional math grid practice unavailable');
 const paper={schoolId,schoolName,schoolAddress:'',grade,gradeNumber:grade,className:'Class 9',academicYear:'2083',paperTitle:language==='ne'?'अस्वीकृत मौलिक अभ्यासपत्र':'UNREVIEWED ORIGINAL PRACTICE',subject,language,fullMarks:75,totalMarks:75,durationMinutes:180,questionCount:27,questionFormat:'cdc_optional_math_composite',questions:result.questions.map(q=>({...structuredClone(q),questionId:q.id})),topicIds:selectedTopicIds,signature:result.signature,sourceUrl:guide.sourceUrl,official:false,approved:false,writeAuthorized:false,teacherReviewRequired:true};
 assertGrade9ExamPaperMatches(paper);
 issued.set(paper,JSON.stringify(paper));
 return paper;
}
export function printMathPractice({paper,showAnswers=false}){
 if(!paper||issued.get(paper)!==JSON.stringify(paper)||typeof showAnswers!=='boolean')throw Error('Unchanged original math practice required');
 assertGrade9ExamPaperMatches(paper);
 const content=renderCdcCompositePaper(paper,{escapeHtml,answerKey:showAnswers});
 return '<!doctype html><html lang="'+(paper.language==='ne'?'ne':'en')+'"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>Unreviewed practice</title><style>'+PAPER_PRINT_CSS+'.warning{border:2px solid #a21c1c;padding:8px;text-align:center;font-weight:bold}body{print-color-adjust:exact}</style></head><body><p class="warning">UNREVIEWED ORIGINAL PRACTICE — NOT AN OFFICIAL CDC QUESTION PAPER</p>'+content+'</body></html>';
}
