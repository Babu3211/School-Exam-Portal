// Read-only structural check; never upgrades simplified V47 marks into V46 IEMIS scores.
import {iemisEntrySchema} from '../iemis-entry.js';
import {iemisComponentKey} from '../iemis-ledger.js';
export function inspectV46IemisRecord(record,{schoolId,classNo,term,subject,examId}){
 if(!record||record.schoolId!==schoolId||!record.studentId||record.examId!==examId)return {compatible:false,reason:'Record is outside the authorized school/exam scope'};
 if(!['1st','2nd','3rd','final'].includes(term)||!Number.isInteger(Number(classNo))||Number(classNo)<1||Number(classNo)>10)return {compatible:false,reason:'Class or term is not verified for V46 IEMIS'};
 if(typeof subject!=='string'||!subject.trim()||record.subject!==subject)return {compatible:false,reason:'Subject identity is missing or mismatched'};
 if(!Array.isArray(record.scores))return {compatible:false,reason:'Component-based V46 marks are missing; raw theory/practical marks cannot be converted'};
 const v46term=term==='final'?'annual':term==='1st'?'first':term==='2nd'?'second':'third';
 const schema=iemisEntrySchema(classNo,v46term,subject);
 if(record.scores.length!==schema.length)return {compatible:false,reason:'Assessment component count does not match V46'};
 const keys=new Set();
 for(const score of record.scores){
  const key=iemisComponentKey(score?.name),expected=schema.find(c=>c.key===key);
  if(!expected||keys.has(key))return {compatible:false,reason:'Unknown or duplicate assessment component'};
  keys.add(key);
  if(!['count','full','obtained'].includes(key)&&Number(score.fullMarks)!==expected.max)return {compatible:false,reason:'Assessment full marks do not match V46'};
 }
 return {compatible:true,reason:'V46 assessment structure recognized; completeness and authorization still require validation'};
}
