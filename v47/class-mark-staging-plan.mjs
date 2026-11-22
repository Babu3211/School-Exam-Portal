import {validateCompleteClassMarks} from './class-mark-completeness.mjs';
import {validateSubjectMarkLimits} from './subject-mark-limits.mjs';

// A deterministic, read-only staging plan for classes larger than one Firestore
// transaction. It never writes marks or grants publication permissions.
// Each future chunk must be staged under a separate, denied-by-default path;
// a verified manifest must become visible atomically before readers may use it.
export function planCompleteClassMarkStaging({schoolId,classId,term,subjectId,expectedStudentIds,entries,subjectSettings,chunkSize=200}){
 if(!Number.isInteger(chunkSize)||chunkSize<1||chunkSize>200)throw new RangeError('Invalid staging chunk size');
 const complete=validateCompleteClassMarks({schoolId,classId,term,subjectId,expectedStudentIds,entries});
 if(!subjectSettings||typeof subjectSettings!=='object'||Array.isArray(subjectSettings)
  ||subjectSettings.schoolId!==schoolId||subjectSettings.class!==classId
  ||subjectSettings.active!==true)throw new Error('Active subject Examination Settings required');
 if(subjectSettings.components!==undefined&&(!Array.isArray(subjectSettings.components)||subjectSettings.components.length))
  throw new Error('Component assessment staging requires separately verified component mapping');
 if(typeof subjectSettings.creditHour!=='number'||!Number.isFinite(subjectSettings.creditHour)
  ||subjectSettings.creditHour<=0||subjectSettings.creditHour>100)
  throw new Error('Valid subject credit hours required for V46 GPA');
 for(const entry of complete.entries)validateSubjectMarkLimits(subjectSettings,entry);
 if(!Number.isInteger(complete.count)||complete.count!==expectedStudentIds.length)throw new Error('Incomplete class marks plan');
 // Normalize order independently of UI entry order. Never silently drop a row.
 const ordered=[...complete.entries].sort((a,b)=>a.studentId<b.studentId?-1:a.studentId>b.studentId?1:0);
 const chunks=[];
 for(let start=0;start<ordered.length;start+=chunkSize){
  const rows=ordered.slice(start,start+chunkSize).map(row=>Object.freeze({...row,schoolId}));
  chunks.push(Object.freeze({index:chunks.length,offset:start,count:rows.length,firstStudentId:rows[0].studentId,lastStudentId:rows.at(-1).studentId,rows:Object.freeze(rows)}));
 }
 if(chunks.reduce((sum,chunk)=>sum+chunk.count,0)!==complete.count)
  throw new Error('Staging plan lost marks');
 return Object.freeze({
  schoolId,classId,term,subjectId,studentCount:complete.count,
  chunkCount:chunks.length,chunks:Object.freeze(chunks),
  diagnosticOnly:true,canPublish:false
 });
}
