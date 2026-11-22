import {validateCompleteClassMarks} from './class-mark-completeness.mjs';
import {validateSchoolId} from './school-paths.mjs';
import {validateSubjectMarkLimits} from './subject-mark-limits.mjs';
import {markEntryId} from './marks-service.mjs';

// Firestore transaction reads ALL records before writes. Limit to 3 students to
// avoid exceeding the Firestore rules document-access budget on free-tier projects.
// Larger classes require a separately audited server-side workflow.
export async function saveCompleteClassMarks({db,api,actor,schoolId,classId,term,subjectId,expectedStudentIds,entries}){
 validateSchoolId(schoolId);
 if(actor?.active!==true||actor?.role!=='school_admin'||actor?.schoolId!==schoolId||typeof actor?.uid!=='string'||!actor.uid.trim())throw new Error('School Admin permission required');
 const identity={uid:actor.uid,role:actor.role,active:actor.active,schoolId:actor.schoolId};
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
  if(!subject||typeof subject.exists!=='function'||typeof subject.data!=='function'||!subject.exists())throw new Error('Active subject required');
  const settings=subject.data();
  if(!settings||typeof settings!=='object'||Array.isArray(settings)||settings.schoolId!==schoolId||settings.class!==classId||settings.active!==true)throw new Error('Active subject required');
  if(Array.isArray(settings.components)&&settings.components.length)throw new Error('Configured subject requires Assessment Settings component marks; raw marks cannot be saved');
  for(const entry of complete.entries)validateSubjectMarkLimits(settings,entry);
  const snapshots=await Promise.all(refs.map(async r=>{
   const [student,assignment,mark,component]=await Promise.all([tx.get(r.student),tx.get(r.subjectAssignment),tx.get(r.mark),tx.get(r.component)]);
   return {student,assignment,mark,component};
  }));
  const present=snap=>snap&&typeof snap.exists==='function'&&typeof snap.data==='function'&&snap.exists()===true;
  for(let i=0;i<refs.length;i++){
   const {entry}=refs[i],{student,assignment,mark,component}=snapshots[i];
   if(!present(student))throw new Error('Student roster changed');
   const studentData=student.data();
   if(!studentData||typeof studentData!=='object'||Array.isArray(studentData)||studentData.schoolId!==schoolId||studentData.class!==classId)throw new Error('Student roster changed');
   if(!present(assignment))throw new Error('Student subject assignment missing');
   const assignmentData=assignment.data();
   if(!assignmentData||typeof assignmentData!=='object'||Array.isArray(assignmentData)||assignmentData.schoolId!==schoolId||assignmentData.active===false||assignmentData.studentId!==entry.studentId||assignmentData.subjectId!==subjectId||assignmentData.class!==classId)throw new Error('Student subject assignment missing');
   if(!mark||typeof mark.exists!=='function'||!component||typeof component.exists!=='function')throw new Error('Mark existence could not be verified');
   if(mark.exists()!==false||component.exists()!==false)throw new Error('Existing mark cannot be overwritten');
  }
  if(actor.uid!==identity.uid||actor.role!==identity.role||actor.active!==identity.active||actor.schoolId!==identity.schoolId)throw new Error('School identity changed during class marks transaction');
  for(const r of refs)tx.set(r.mark,{...r.entry,schoolId});
 });
 return {saved:complete.count,schoolId,classId,term,subjectId};
}
