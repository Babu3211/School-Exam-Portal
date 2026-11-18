import {validateCompleteClassMarks} from './class-mark-completeness.mjs';
import {validateSchoolId} from './school-paths.mjs';
import {canAccessSchool} from './permissions.mjs';
import {markEntryId} from './marks-service.mjs';

// Firestore transaction reads ALL records before writes. Limit to 3 students to
// avoid exceeding the Firestore rules document-access budget on free-tier projects.
// Larger classes require a separately audited server-side workflow.
export async function saveCompleteClassMarks({db,api,actor,schoolId,classId,term,subjectId,expectedStudentIds,entries}){
 validateSchoolId(schoolId);
 if(!canAccessSchool(actor,schoolId,'write'))throw new Error('School Admin permission required');
 const complete=validateCompleteClassMarks({schoolId,classId,term,subjectId,expectedStudentIds,entries});
 if(complete.count>3)throw new RangeError('Atomic class marks save supports at most 3 students; no records saved');
 if(typeof api?.doc!=='function'||typeof api?.runTransaction!=='function')throw new TypeError('Missing Firestore transaction methods');
 const doc=(collection,id)=>api.doc(db,'schools',schoolId,collection,id);
 const refs=complete.entries.map(entry=>({
  entry,mark:doc('marks',markEntryId(entry)),student:doc('students',entry.studentId),
  subjectAssignment:doc('subject_assignments',entry.studentId+':'+subjectId),
  component:doc('component_marks',markEntryId(entry))
 }));
 const subjectRef=doc('subjects',subjectId);
 await api.runTransaction(db,async tx=>{
  const subject=await tx.get(subjectRef);
  if(!subject.exists()||subject.data().schoolId!==schoolId||subject.data().class!==classId||subject.data().active!==true)throw new Error('Active subject required');
  if(['9','10'].includes(classId)&&subject.data().name==='Computer')throw new Error('Computer 4/36/10 requires component entry');
  const snapshots=await Promise.all(refs.map(async r=>({
   student:await tx.get(r.student),assignment:await tx.get(r.subjectAssignment),
   mark:await tx.get(r.mark),component:await tx.get(r.component)
  })));
  for(let i=0;i<refs.length;i++){
   const {entry}=refs[i],{student,assignment,mark,component}=snapshots[i];
   if(!student.exists()||student.data().schoolId!==schoolId||student.data().class!==classId)throw new Error('Student roster changed');
   if(!assignment.exists()||assignment.data().schoolId!==schoolId||assignment.data().studentId!==entry.studentId||assignment.data().subjectId!==subjectId||assignment.data().class!==classId)throw new Error('Student subject assignment missing');
   if(mark.exists()||component.exists())throw new Error('Existing mark cannot be overwritten');
  }
  for(const r of refs)tx.set(r.mark,{...r.entry,schoolId});
 });
 return {saved:complete.count,schoolId,classId,term,subjectId};
}
