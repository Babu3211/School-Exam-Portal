import {validateSchoolId} from './school-paths.mjs';
import {canAccessSchool} from './permissions.mjs';
import {validSchoolClass} from './class-catalog.mjs';
export function validateAttendance(input){
 if(!input||typeof input!=='object')throw new TypeError('Attendance required');
 const date=input.date,studentId=input.studentId,schoolClass=input.class;
 if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)throw new Error('Invalid ISO date');
 if(typeof studentId!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(studentId))throw new Error('Invalid student ID');
 if(!validSchoolClass(schoolClass))throw new Error('Invalid class');
 if(typeof input.present!=='boolean')throw new Error('Present must be boolean');
 return {date,studentId,class:schoolClass,present:input.present};
}
export async function saveSchoolAttendance({db,api,actor,schoolId,input}){
 validateSchoolId(schoolId);if(actor?.role!=='school_admin'||!canAccessSchool(actor,schoolId,'write'))throw new Error('School Admin permission required');
 const identity={uid:actor.uid,role:actor.role,active:actor.active,schoolId:actor.schoolId};
 const attendance=validateAttendance(input);
 if(typeof api?.doc!=='function'||typeof api?.setDoc!=='function'||typeof api?.getDoc!=='function')throw new TypeError('Missing Firebase SDK');
 const student=await api.getDoc(api.doc(db,'schools',schoolId,'students',attendance.studentId));
 if(!student.exists()||student.data().schoolId!==schoolId||student.data().class!==attendance.class)throw new Error('Student roster changed or school mismatch');
 if(actor.uid!==identity.uid||actor.role!==identity.role||actor.active!==identity.active||actor.schoolId!==identity.schoolId||!canAccessSchool(actor,schoolId,'write'))throw new Error('School Admin identity changed during attendance roster verification');
 const id=attendance.date+'_'+attendance.studentId;
 const attendanceRef=api.doc(db,'schools',schoolId,'attendance',id);
 if(actor.uid!==identity.uid||actor.role!==identity.role||actor.active!==identity.active||actor.schoolId!==identity.schoolId||!canAccessSchool(actor,schoolId,'write'))throw new Error('School Admin identity changed before attendance write');
 await api.setDoc(attendanceRef,{...attendance,schoolId});
 return {id,...attendance,schoolId};
}
