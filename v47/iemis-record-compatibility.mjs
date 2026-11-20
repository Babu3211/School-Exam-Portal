// Read-only structural check; never upgrades simplified V47 marks into V46 IEMIS scores.
import {iemisEntrySchema} from '../iemis-entry.js';
import {iemisComponentKey} from '../iemis-ledger.js';
export function inspectV46IemisRecord(record,{schoolId,classNo,term,subject,examId}){
 if(!record||record.schoolId!==schoolId||!record.studentId||record.examId!==examId)return {compatible:false,reason:'Record is outside the authorized school/exam scope'};
 if(typeof schoolId!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(schoolId)||typeof examId!=='string'||!examId)return {compatible:false,reason:'Invalid school or exam identity'};
 if(typeof record.studentId!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(record.studentId))return {compatible:false,reason:'Invalid student identity'};
 if(typeof record.examId!=='string'||!record.examId.trim())return {compatible:false,reason:'Missing verified exam identity'};
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
  if(!score||!Number.isFinite(Number(score.fullMarks))||Number(score.fullMarks)<0)return {compatible:false,reason:'Invalid assessment full marks'};
  if(score.obtained!==null&&score.obtained!==undefined&&(!Number.isFinite(Number(score.obtained))||Number(score.obtained)<0||Number(score.obtained)>Number(score.fullMarks)))return {compatible:false,reason:'Assessment obtained marks out of range'};
  if(!['count','full','obtained'].includes(key)&&Number(score.fullMarks)!==expected.max)return {compatible:false,reason:'Assessment full marks do not match V46'};
 }
 if(Number(classNo)<=5){
  const count=record.scores.find(x=>iemisComponentKey(x.name)==='count');
  const full=record.scores.find(x=>iemisComponentKey(x.name)==='full');
  const obtained=record.scores.find(x=>iemisComponentKey(x.name)==='obtained');
  if(!Number.isInteger(Number(count?.fullMarks))||Number(count.fullMarks)>5000||Number(full?.fullMarks)!==Number(count.fullMarks)*4||Number(obtained?.fullMarks)!==Number(count.fullMarks)*4)return {compatible:false,reason:'Primary learning achievement full marks mismatch'};
  if(Number(count?.obtained)!==Number(count?.fullMarks))return {compatible:false,reason:'Learning achievement count component mismatch'};
 }else if(record.scores.some(score=>score.obtained===null||score.obtained===undefined))return {compatible:false,reason:'Assessment component marks incomplete'};
 return {compatible:true,reason:'V46 assessment structure recognized; completeness and authorization still require validation'};
}
