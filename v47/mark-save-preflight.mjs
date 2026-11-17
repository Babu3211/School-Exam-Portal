import {validateSchoolId} from './school-paths.mjs';
import {canAccessSchool} from './permissions.mjs';
import {validateMarkEntry,markEntryId} from './marks-service.mjs';
// A client-side preflight is supplementary: Firestore rules remain authoritative.
export async function preflightRawMarkSave({db,api,actor,schoolId,input}){
 validateSchoolId(schoolId);
 if(!canAccessSchool(actor,schoolId,'write'))throw new Error('School Admin permission required');
 const entry=validateMarkEntry(input);
 if(typeof api?.doc!=='function'||typeof api?.getDoc!=='function')throw new TypeError('Missing Firestore methods');
 const base=['schools',schoolId];
 const [student,subject,assignment,existing]=await Promise.all([
  api.getDoc(api.doc(db,...base,'students',entry.studentId)),
  api.getDoc(api.doc(db,...base,'subjects',entry.subjectId)),
  api.getDoc(api.doc(db,...base,'subject_assignments',entry.studentId+':'+entry.subjectId)),
  api.getDoc(api.doc(db,...base,'marks',markEntryId(entry)))
 ]);
 if(!student.exists()||student.data().class!==entry.class)throw new Error('Student missing or belongs to another class');
 if(!subject.exists()||subject.data().active!==true||subject.data().class!==entry.class)throw new Error('Subject missing, inactive or belongs to another class');
 if(!assignment.exists()||assignment.data().studentId!==entry.studentId||assignment.data().subjectId!==entry.subjectId||assignment.data().class!==entry.class)throw new Error('Student subject assignment required');
 return {entry,existing:existing.exists()};
}
