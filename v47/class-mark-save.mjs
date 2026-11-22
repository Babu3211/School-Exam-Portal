import {validateCompleteClassMarks} from './class-mark-completeness.mjs';
import {validateSchoolId} from './school-paths.mjs';
import {markEntryId} from './marks-service.mjs';

// Firestore transaction reads ALL records before writes. Limit to 3 students to
// avoid exceeding the Firestore rules document-access budget on free-tier projects.
// Larger classes require a separately audited server-side workflow.
export async function saveCompleteClassMarks({db,api,actor,schoolId,classId,term,subjectId,expectedStudentIds,entries}){
 validateSchoolId(schoolId);
 if(actor?.active!==true||actor?.role!=='school_admin'||actor?.schoolId!==schoolId)throw new Error('School Admin permission required');
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
  if(!subject.exists()||subject.data().schoolId!==schoolId||subject.data().class!==classId||subject.data().active!==true)throw new Error('Active subject required');
  if(['9','10'].includes(classId)&&/^computer(?:\s+science)?$/i.test(String(subject.data().name??'').trim()))throw new Error('Computer requires Assessment Settings component marks; raw marks cannot be saved');
  const snapshots=await Promise.all(refs.map(async r=>{
   const [student,assignment,mark,component]=await Promise.all([tx.get(r.student),tx.get(r.subjectAssignment),tx.get(r.mark),tx.get(r.component)]);
   return {student,assignment,mark,component};
  }));
  for(let i=0;i<refs.length;i++){
   const {entry}=refs[i],{student,assignment,mark,component}=snapshots[i];
   if(!student.exists()||student.data().schoolId!==schoolId||student.data().class!==classId)throw new Error('Student roster changed');
   if(!assignment.exists()||assignment.data().schoolId!==schoolId||assignment.data().active===false||assignment.data().studentId!==entry.studentId||assignment.data().subjectId!==subjectId||assignment.data().class!==classId)throw new Error('Student subject assignment missing');
   if(mark.exists()||component.exists())throw new Error('Existing mark cannot be overwritten');
  }
  if(actor.uid!==identity.uid||actor.role!==identity.role||actor.active!==identity.active||actor.schoolId!==identity.schoolId)throw new Error('School identity changed during class marks transaction');
  for(const r of refs)tx.set(r.mark,{...r.entry,schoolId});
 });
 return {saved:complete.count,schoolId,classId,term,subjectId};
}
