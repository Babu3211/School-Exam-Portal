import {validateSchoolId} from './school-paths.mjs';
import {canAccessSchool} from './permissions.mjs';
import {validateMarkEntry,markEntryId} from './marks-service.mjs';
import {validateSubjectMarkLimits} from './subject-mark-limits.mjs';
// A client-side preflight is supplementary: Firestore rules remain authoritative.
export async function preflightRawMarkSave({db,api,actor,schoolId,input}){
 validateSchoolId(schoolId);
 if(actor?.role!=='school_admin'||!canAccessSchool(actor,schoolId,'write'))throw new Error('School Admin permission required');
 const identity={uid:actor.uid,role:actor.role,active:actor.active,schoolId:actor.schoolId};
 const sameSession=()=>canAccessSchool(actor,schoolId,'write')&&Object.keys(identity).every(key=>actor[key]===identity[key]);
 const entry=validateMarkEntry(input);
 if(typeof api?.doc!=='function'||typeof api?.getDoc!=='function')throw new TypeError('Missing Firestore methods');
 const base=['schools',schoolId];
 const [student,subject,assignment,existing,component]=await Promise.all([
  api.getDoc(api.doc(db,...base,'students',entry.studentId)),
  api.getDoc(api.doc(db,...base,'subjects',entry.subjectId)),
  api.getDoc(api.doc(db,...base,'subject_assignments',entry.studentId+':'+entry.subjectId)),
  api.getDoc(api.doc(db,...base,'marks',markEntryId(entry))),
  api.getDoc(api.doc(db,...base,'component_marks',markEntryId(entry)))
 ]);
 if(!sameSession())throw new Error('School Admin identity changed during mark preflight');
 if(!student.exists()||student.data().schoolId!==schoolId||student.data().class!==entry.class)throw new Error('Student missing or belongs to another class');
 if(!subject.exists()||subject.data().schoolId!==schoolId||subject.data().active!==true||subject.data().class!==entry.class)throw new Error('Subject missing, inactive or belongs to another class');
 const configuredSubject=subject.data();
 if(Array.isArray(configuredSubject.components)&&configuredSubject.components.length)throw new Error('Configured subject requires Assessment Settings component marks; raw marks cannot be saved');
 validateSubjectMarkLimits(configuredSubject,entry);
 if(!assignment.exists()||assignment.data().schoolId!==schoolId||assignment.data().active===false||assignment.data().studentId!==entry.studentId||assignment.data().subjectId!==entry.subjectId||assignment.data().class!==entry.class)throw new Error('Student subject assignment required');
 if(!sameSession())throw new Error('School Admin identity changed during mark preflight');
 return {entry,existing:existing.exists()||component.exists()};
}
