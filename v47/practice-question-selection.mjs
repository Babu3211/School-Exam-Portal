// Read-only original practice question selection. This is neither an official
// exam blueprint nor an approved CDC paper; teachers must review the questions.
// Never manufacture an answer or derive published grading metadata.
import {recommendedPracticeIndices} from './question-paper-cdc-preview.mjs';
export const MAX_PRACTICE_SELECTION=40;
export const MAX_PRACTICE_MARKS=250;
export function listOriginalPracticeChoices(pack){
 recommendedPracticeIndices(pack); // validates the complete, preserved V46 pack
 const units=new Map(pack.units.map(u=>[String(u.unitCode),u.unitTitle]));
 return Object.freeze(pack.questions.map((q,index)=>Object.freeze({
  index,unitCode:String(q.unitCode),unitTitle:units.get(String(q.unitCode)),
  topicName:q.topicName,questionType:q.questionType,marks:q.marks,questionText:q.questionText
 })));
}
export function summarizeOriginalPracticeSelection(pack,indices){
 const options=listOriginalPracticeChoices(pack);
 if(!Array.isArray(indices)||indices.some(i=>!Number.isSafeInteger(i)||i<0||i>=options.length)
   ||new Set(indices).size!==indices.length)
  throw Error('Invalid or duplicate practice question indices');
 const marks=indices.reduce((sum,i)=>sum+options[i].marks,0);
 return Object.freeze({
  selected:indices.length,totalMarks:marks,maxQuestions:MAX_PRACTICE_SELECTION,
  maxMarks:MAX_PRACTICE_MARKS,valid:indices.length>0&&indices.length<=MAX_PRACTICE_SELECTION
   &&Number.isFinite(marks)&&marks<=MAX_PRACTICE_MARKS,
  approved:false,official:false,writeAuthorized:false
 });
}
