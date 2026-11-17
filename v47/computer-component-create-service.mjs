import {validateSchoolId} from './school-paths.mjs';
import {canAccessSchool} from './permissions.mjs';
import {validateComputerComponentEntry,computerComponentEntryId} from './computer-component-validation.mjs';
// Development-only create; never publish grades or overwrite marks.
export async function createComputerComponentMark({db,api,actor,schoolId,input}){
 validateSchoolId(schoolId);
 if(actor?.role!=='school_admin'||!canAccessSchool(actor,schoolId,'write'))throw new Error('School Admin required');
 const entry=validateComputerComponentEntry(input),id=computerComponentEntryId(entry);
 if(typeof api?.doc!=='function'||typeof api?.runTransaction!=='function')throw new TypeError('Missing transaction API');
 const ref=(collection,key)=>api.doc(db,'schools',schoolId,collection,key);
 await api.runTransaction(db,async tx=>{
  const [student,subject,assignment,raw,existing]=await Promise.all([
   tx.get(ref('students',entry.studentId)),tx.get(ref('subjects',entry.subjectId)),
   tx.get(ref('subject_assignments',entry.studentId+':'+entry.subjectId)),
   tx.get(ref('marks',id)),tx.get(ref('component_marks',id))
  ]);
  if(!student.exists()||student.data().class!==entry.class)throw new Error('Student missing or wrong class');
  if(!subject.exists()||subject.data().class!==entry.class||subject.data().active!==true||subject.data().name!=='Computer')throw new Error('Active Computer subject required');
  if(!assignment.exists()||assignment.data().studentId!==entry.studentId||assignment.data().subjectId!==entry.subjectId||assignment.data().class!==entry.class)throw new Error('Computer subject assignment required');
  if(raw.exists()||existing.exists())throw new Error('Existing raw or component mark; overwrite blocked');
  tx.set(ref('component_marks',id),entry);
 });
 return Object.freeze({id,...entry});
}
