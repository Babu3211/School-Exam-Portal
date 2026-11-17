import {validSchoolClass} from './class-catalog.mjs';
import {validateExamTerm} from './term-catalog.mjs';
// Generic component validation, not a CDC/IEMIS subject schema or grade calculator.
export function auditComponentMarks({schoolClass,term,entries,componentsBySubject}){
 if(!validSchoolClass(schoolClass))throw new Error('Invalid class');
 validateExamTerm(term);
 if(!Array.isArray(entries)||!componentsBySubject||typeof componentsBySubject!=='object'||Array.isArray(componentsBySubject))throw new TypeError('Entries and subject components required');
 const issues=[];
 for(let index=0;index<entries.length;index++){
  const entry=entries[index];const definitions=entry&&Object.hasOwn(componentsBySubject,entry.subjectId)?componentsBySubject[entry.subjectId]:null;
  if(!Array.isArray(definitions)||definitions.length===0||definitions.length>8){issues.push({index,code:'missing_component_definition'});continue}
  const names=new Set();let valid=true;
  for(const component of definitions){
   if(!component||typeof component.key!=='string'||!/^[a-z][a-z0-9_]{0,31}$/.test(component.key)||names.has(component.key)||typeof component.max!=='number'||!Number.isFinite(component.max)||component.max<0||component.max>100){valid=false;break}
   names.add(component.key);
  }
  if(!valid||definitions.every(d=>d.max===0)){issues.push({index,code:'invalid_component_definition'});continue}
  if(entry.class!==schoolClass||entry.term!==term)issues.push({index,code:'wrong_class_or_term'});
  if(!entry.scores||typeof entry.scores!=='object'||Array.isArray(entry.scores)||Object.keys(entry.scores).some(key=>!names.has(key))||Object.keys(entry.scores).length!==names.size){issues.push({index,code:'component_keys_mismatch'});continue}
  for(const component of definitions){const score=entry.scores[component.key];if(typeof score!=='number'||!Number.isFinite(score)||score<0||score>component.max)issues.push({index,code:'invalid_component_score',component:component.key})}
 }
 return {checked:entries.length,issues,issueCount:issues.length,gradingPolicyVerified:false};
}
