import {validSchoolClass} from './class-catalog.mjs';
// Conservative metadata audit; never assigns CDC/IEMIS full marks or subject order.
export function auditSubjectCatalog({schoolClass,subjects}){
 if(!validSchoolClass(schoolClass))throw new Error('Invalid class');
 if(!Array.isArray(subjects))throw new TypeError('Subjects required');
 const issues=[],ids=new Set();
 for(const subject of subjects){
  if(!subject||typeof subject.id!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(subject.id)){issues.push('invalid_subject_id');continue}
  if(ids.has(subject.id))issues.push('duplicate_subject_id');ids.add(subject.id);
  if(typeof subject.name!=='string'||subject.name.trim().length<2||subject.name.trim().length>160)issues.push('invalid_subject_name');
  if(subject.class!==undefined&&subject.class!==schoolClass)issues.push('wrong_subject_class');
 }
 if(subjects.length===0)issues.push('empty_subject_catalog');
 return {valid:issues.length===0,issues:[...new Set(issues)],count:ids.size,iemisVerified:false};
}
