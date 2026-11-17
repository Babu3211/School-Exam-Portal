import {validSchoolClass} from './class-catalog.mjs';
import {validateExamTerm} from './term-catalog.mjs';
// Optional configuration audit; no default maxima or CDC grading assumptions.
export function auditConfiguredFullMarks({schoolClass,term,marks,subjectLimits}){
 if(!validSchoolClass(schoolClass))throw new Error('Invalid class');
 validateExamTerm(term);
 if(!Array.isArray(marks))throw new TypeError('Marks must be an array');
 if(!subjectLimits||typeof subjectLimits!=='object'||Array.isArray(subjectLimits))throw new TypeError('Subject limits must be a map');
 const issues=[];
 for(let i=0;i<marks.length;i++){
  const mark=marks[i],limits=mark&&Object.hasOwn(subjectLimits,mark.subjectId)?subjectLimits[mark.subjectId]:null;
  if(!limits||typeof limits!=='object'||Array.isArray(limits)){issues.push({index:i,code:'missing_subject_full_marks'});continue}
  if(!['theoryMax','practicalMax'].every(key=>typeof limits[key]==='number'&&Number.isFinite(limits[key])&&limits[key]>=0&&limits[key]<=100)||limits.theoryMax+limits.practicalMax<=0){issues.push({index:i,code:'invalid_subject_full_marks'});continue}
  if(mark.class!==schoolClass||mark.term!==term){issues.push({index:i,code:'wrong_class_or_term'});continue}
  for(const [field,max] of [['theory',limits.theoryMax],['practical',limits.practicalMax]]){
   if(typeof mark[field]!=='number'||!Number.isFinite(mark[field])||mark[field]<0||mark[field]>max)issues.push({index:i,code:'exceeds_'+field+'_maximum'});
  }
 }
 return {checked:marks.length,issueCount:issues.length,issues,policyVerified:false,gradeCalculated:false};
}
