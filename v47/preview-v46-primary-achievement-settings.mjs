// V46 Classes 1-5 have learning-achievement counts and derived full marks.
// This preview deliberately does not turn those into obtained mark components.
const groups={'1-3':['1','2','3'],'4-5':['4','5']};
const expected=['No. of Learning Achievement','Full Marks','Obtained Learning Achievement'];
export function previewV46PrimaryAchievementSettings({legacy,schoolId,classId,subjectId,examId,verifiedSubjectName}){
 if(typeof schoolId!=='string'||!/^\d{5,20}$/.test(schoolId)||typeof subjectId!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(subjectId)||!['1','2','3','4','5'].includes(classId)||!['weekly','monthly','1st','2nd','3rd','final'].includes(examId))throw new Error('Explicit verified primary school/class/subject/exam identity required');
 if(!legacy||!groups[legacy.classGroup]?.includes(classId))throw new Error('Primary class group mismatch');
 if(legacy.className!==undefined&&String(legacy.className).trim()&&String(legacy.className).trim()!==classId)throw new Error('Primary class-specific setting mismatch');
 if(typeof legacy.subject!=='string'||typeof verifiedSubjectName!=='string'||legacy.subject.trim().toLocaleLowerCase('en')!==verifiedSubjectName.trim().toLocaleLowerCase('en')||!verifiedSubjectName.trim())throw new Error('Primary subject mismatch');
 if(!Array.isArray(legacy.components)||legacy.components.length!==3)throw new Error('Expected exactly three learning-achievement fields');
 for(let i=0;i<3;i++)if(legacy.components[i]?.name!==expected[i]||typeof legacy.components[i].fullMarks!=='number'||!Number.isSafeInteger(legacy.components[i].fullMarks)||legacy.components[i].fullMarks<0||legacy.components[i].fullMarks>5000)throw new Error('Invalid primary learning-achievement fields');
 const [count,full,obtainedMaximum]=legacy.components.map(x=>x.fullMarks);
 if(full!==count*4||obtainedMaximum!==full)throw new Error('Primary learning-achievement derived full marks mismatch');
 if(legacy.totalFullMarks!==undefined&&legacy.totalFullMarks!==count+full+obtainedMaximum)throw new Error('Primary legacy total mismatch');
 return Object.freeze({schoolId,classId,subjectId,examId,learningAchievementCount:count,fullMarks:full,obtainedAchievementMaximum:obtainedMaximum,sourceClassGroup:legacy.classGroup,writeAuthorized:false,requiresManualApproval:true,requiresDedicatedIemisEntry:true,warning:'Read-only primary achievement preview; never convert count/full marks into obtained student scores'});
}
