import {validateCompleteClassMarks} from './class-mark-completeness.mjs';
import {canAccessSchool} from './permissions.mjs';
import {markEntryId} from './marks-service.mjs';

// READ-ONLY preparation. No Firestore calls or writes occur here.
// These groups are NOT an atomic save. A server-side, audited commit protocol
// must be implemented before allowing multi-group writes in production.
export function planLargeClassMarks({actor,schoolId,classId,term,subjectId,expectedStudentIds,entries}){
 if(!canAccessSchool(actor,schoolId,'write'))throw new Error('School Admin permission required');
 const complete=validateCompleteClassMarks({schoolId,classId,term,subjectId,expectedStudentIds,entries});
 const groups=[];
 for(let offset=0;offset<complete.count;offset+=3){
  const group=complete.entries.slice(offset,offset+3);
  groups.push(Object.freeze(group.map(entry=>Object.freeze({
   studentId:entry.studentId,markId:markEntryId(entry)
  }))));
 }
 return Object.freeze({
  schoolId,classId,term,subjectId,studentCount:complete.count,
  groupCount:groups.length,groups:Object.freeze(groups),
  readyForServerReview:true,writeAuthorized:false,
  warning:'Read-only plan. Multi-group writes are not atomic and must not run without audited server-side safeguards.'
 });
}
