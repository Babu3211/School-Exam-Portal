// V47 practice preview only. Pinned V46 grid transcription and original bank.
// No CDC approval, Firestore write, or authorization to publish an examination.
import {getBundledComputerGrid} from './cdc-verified-computer-grids.mjs';
import {grade9ComputerOriginalBank} from './cdc-grade9-computer-original-practice.mjs';
import {buildAutomaticQuestionPaper,cognitiveMarkDistribution} from './cdc-question-autogen.mjs';
import {validateSchoolId} from './school-paths.mjs';
const subject='Optional Computer Science';
const levels=['knowledge','understanding','application','higher'];
export function computerGridReference(grade){
 const grid=getBundledComputerGrid({grade,subject,fullMarks:50});
 if(!grid)throw Error('Computer grid available for Grades 9 and 10 only');
 const units=grid.unitNames.map((name,i)=>{
  const rows=grid.unitGrid.filter(r=>r.unitCode===String(i+1));
  return {name,code:String(i+1),counts:levels.flatMap(level=>['mcq','short','long'].map(type=>rows.filter(r=>r.cognitiveLevel===level&&r.type===type).reduce((n,r)=>n+r.count,0))),marks:rows.reduce((n,r)=>n+r.count*r.marks,0)};
 });
 return {grade,subject,fullMarks:50,durationMinutes:grid.durationMinutes,units,distribution:{...grid.cognitiveDistribution},sourceUrl:grid.sourceUrl,version:grid.curriculumVersion,approved:false,teacherReviewRequired:true};
}
const slot=q=>[q.unitCode,q.cognitiveLevel,q.questionType??q.type,q.marks].join('|');
export function assertComputerPracticeGrid(paper){
 const grid=getBundledComputerGrid({grade:9,subject,fullMarks:50});
 if(paper?.grade!==9||paper.subject!==subject||paper.totalMarks!==50||paper.questionCount!==25||paper.durationMinutes!==120||paper.sourceUrl!==grid.sourceUrl||paper.exactGridMatched!==true||!['ne','en','both'].includes(paper.language)||paper.official!==false||paper.approved!==false||paper.writeAuthorized!==false||paper.teacherReviewRequired!==true||!Array.isArray(paper.questions)||paper.questions.length!==25)throw Error('Grade 9 Computer practice scope mismatch');
 const counts=new Map();for(const r of grid.unitGrid)counts.set(slot(r),(counts.get(slot(r))??0)+r.count);
 const ids=new Set();
 for(const q of paper.questions){
  const k=slot(q);
  if(!q.id||ids.has(q.id)||!(counts.get(k)>0)||!q.questionText||!q.answer||q.officialCdcQuestion!==false||q.teacherReviewRequired!==true)throw Error('Computer practice slot mismatch');
  if(q.questionType==='mcq'&&(!Array.isArray(q.options)||q.options.length!==4||new Set(q.options).size!==4||!['A','B','C','D'].includes(q.correctOption)))throw Error('Invalid Computer practice MCQ');
  ids.add(q.id);counts.set(k,counts.get(k)-1);
 }
 if([...counts.values()].some(n=>n!==0)||paper.questions.reduce((n,q)=>n+q.marks,0)!==50)throw Error('Incomplete Computer practice grid');
 return true;
}
export function generateComputerPractice({schoolId,schoolName,language='both',avoidSignatures=[],rng=Math.random}){
 validateSchoolId(schoolId);
 if(typeof schoolName!=='string'||!schoolName.trim()||schoolName.length>160)throw Error('Verified school name required');
 const blueprint=getBundledComputerGrid({grade:9,subject,fullMarks:50}),bank=grade9ComputerOriginalBank({subject});
 const result=buildAutomaticQuestionPaper({questions:bank.questions,topicIds:bank.units.map(u=>u.id+'_0'),fullMarks:50,language,blueprint,requireExactGrid:true,gradeNumber:9,subject,avoidSignatures,rng});
 if(result.exactGridMatched!==true)throw Error('Exact grid mismatch');
 const paper={schoolId,schoolName,grade:9,subject,totalMarks:50,durationMinutes:120,sourceUrl:blueprint.sourceUrl,sourceTitle:blueprint.sourceTitle,sourceStatus:'original_practice_matched_to_preserved_grid_transcription',questions:Object.freeze(result.questions.map(q=>Object.freeze({...q,options:Object.freeze([...q.options])}))),questionCount:25,signature:result.signature,language,exactGridMatched:true,approved:false,official:false,writeAuthorized:false,teacherReviewRequired:true};
 assertComputerPracticeGrid(paper);
 return Object.freeze(paper);
}
