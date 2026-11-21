import {buildClassMarksReviewPackage} from './class-marks-review-package.mjs';

// A downloaded JSON is untrusted input. Revalidate against freshly verified
// tenant settings and authoritative roster before allowing even a read-only review.
// This deliberately NEVER authorizes writes or official publication.
export function verifyClassMarksReviewPackage({json,actor,schoolId,classId,subjectId,examId,settings,expectedStudentIds}){
 if(typeof json!=='string'||new TextEncoder().encode(json).length>900000)throw new Error('Invalid review file or file too large');
 let parsed;
 try{parsed=JSON.parse(json)}catch{throw new Error('Review JSON is invalid')}
 if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)||Object.keys(parsed).sort().join(',')!==['format','schoolId','classId','subjectId','examId','rosterCount','componentLimits','entries','writeAuthorized','publicationAllowed'].sort().join(','))throw new Error('Unexpected review format');
 if(parsed.format!=='smss-v47-class-mark-review-v1'||parsed.writeAuthorized!==false||parsed.publicationAllowed!==false)throw new Error('Review is not an unapproved V47 draft');
 if(parsed.schoolId!==schoolId||parsed.classId!==classId||parsed.subjectId!==subjectId||parsed.examId!==examId)throw new Error('Review belongs to another school, class, subject or examination');
 if(!Array.isArray(parsed.entries)||!Array.isArray(expectedStudentIds)||parsed.entries.length!==expectedStudentIds.length||parsed.rosterCount!==expectedStudentIds.length)throw new Error('Review roster count mismatch');
 const drafts=parsed.entries.map(row=>{
  if(!row||typeof row!=='object'||Array.isArray(row)||Object.keys(row).sort().join(',')!=='isAbsent,studentId,totalObtained,values')throw new Error('Unexpected student review fields');
  if(typeof row.isAbsent!=='boolean'||typeof row.totalObtained!=='number'||!Number.isFinite(row.totalObtained))throw new Error('Invalid review marks');
  return {studentId:row.studentId,isAbsent:row.isAbsent,values:row.isAbsent?row.values===null?{}:row.values:row.values};
 });
 const rebuilt=buildClassMarksReviewPackage({actor,schoolId,classId,subjectId,examId,settings,expectedStudentIds,drafts});
 // Byte-identical canonical reconstruction rejects forged totals, settings,
 // missing marks, reordered/duplicate students and unexpected fields.
 if(rebuilt.json!==json)throw new Error('Review content differs from verified class records or configured marks');
 return Object.freeze({valid:true,rosterCount:rebuilt.rosterCount,schoolId,classId,subjectId,examId,writeAuthorized:false,publicationAllowed:false});
}
