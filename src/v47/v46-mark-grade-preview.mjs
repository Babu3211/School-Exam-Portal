/**
 * Read-only V46 grade preview for a single school-scoped mark record.
 * Does not mutate records, publish results, or calculate a student GPA.
 */
import {iemisGrade,iemisSummary} from "../../iemis-ledger.js";
import {toV46IemisTerm} from "./v46-exam-term-adapter.mjs";
export function v47MarkGradePreview(record){
 if(!record || typeof record!=="object")return null;
 // V47 prototype records contain a percentage score; historical V46 records
 // contain assessment components. Never treat component totals as percentages.
 if(Array.isArray(record.scores)){
  const classNo=Number(record.classNo??record.classId);
  if(!Number.isInteger(classNo)||classNo<1||classNo>10)return null;
  let term;
  try{term=toV46IemisTerm(record.term);}catch{return null;}
  const summary=iemisSummary(record,{annual:term==="annual",primary:classNo<=5&&record.assessmentType==="learning-achievement"});
  return summary.complete?summary.totalGrade?.grade??null:null;
 }
 if(typeof record.score==="number"&&Number.isFinite(record.score))
  return iemisGrade(record.score)?.grade??null;
 return null;
}
