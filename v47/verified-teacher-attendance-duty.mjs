// Verifies a class attendance duty; unlike academic subjects, "attendance"
// is a reserved assignment key and does not require a subject catalog record.
// This function never authorizes mark or attendance writes.
import {validateSchoolId} from './school-paths.mjs';
import {validSchoolClass} from './class-catalog.mjs';
export async function verifyTeacherAttendanceDuty({db,api,actor,schoolId,classId,revalidate}){
 validateSchoolId(schoolId);
 if(!validSchoolClass(classId))throw new Error('Invalid attendance class');
 if(actor?.role!=='teacher'||actor.active!==true||actor.schoolId!==schoolId||typeof actor.uid!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(actor.uid))throw new Error('Active school teacher required');
 if(!db||typeof api?.doc!=='function'||typeof api?.getDoc!=='function'||typeof revalidate!=='function')throw new Error('Verified Firestore duty lookup required');
 const identity={uid:actor.uid,role:actor.role,active:actor.active,schoolId:actor.schoolId};
 const check=()=>{if(Object.keys(identity).some(key=>actor[key]!==identity[key]))throw new Error('Teacher session changed')};
 await revalidate();check();
 const id=schoolId+':'+actor.uid+':'+classId+':attendance';
 const snap=await api.getDoc(api.doc(db,'schools',schoolId,'teacher_assignments',id));
 await revalidate();check();
 if(!snap?.exists?.())throw new Error('No verified attendance duty');
 const data=snap.data();
 if(!data||data.schoolId!==schoolId||data.uid!==actor.uid||data.classId!==classId||data.subjectId!=='attendance'||data.active!==true)throw new Error('Attendance duty inactive or mismatched');
 return Object.freeze({schoolId,classId,uid:actor.uid,duty:'attendance',verified:true,writeAuthorized:false});
}
