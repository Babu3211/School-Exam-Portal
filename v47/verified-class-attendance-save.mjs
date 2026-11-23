import {loadCompleteClassRoster} from './complete-class-roster.mjs';
import {validateCompleteClassAttendance} from './class-attendance-completeness.mjs';
import {saveLoadedClassAttendance} from './attendance-class-save.mjs';

// Safe entry point for class attendance: validation completes before first batch.
// Multi-batch writes are NOT atomic; PartialAttendanceSaveError reports progress.
export async function saveVerifiedClassAttendance({db,api,actor,schoolId,classId,date,expectedStudentIds,entries,onProgress,assertSession}){
 if(!Array.isArray(expectedStudentIds)||expectedStudentIds.length===0)throw new Error('Authoritative roster required');
 const complete=validateCompleteClassAttendance({schoolId,classId,date,expectedStudentIds,entries});
 return saveLoadedClassAttendance({db,api,actor,schoolId,entries:complete.entries,onProgress,assertSession});
}

// Authoritative full-class entry point: never trust a UI-selected subset as the
// complete roster. A single <=10-student class uses one atomic Firestore batch;
// larger classes still use non-atomic chunks and must NOT be advertised as atomic.
export async function saveAuthoritativeClassAttendance({db,api,actor,schoolId,classId,date,entries,onProgress,assertSession}){
 if(assertSession!==undefined&&typeof assertSession!=='function')throw new TypeError('Attendance session verifier required');
 assertSession?.();
 const identity={uid:actor?.uid,role:actor?.role,active:actor?.active,schoolId:actor?.schoolId};
 if(actor?.role!=='school_admin'||actor?.active!==true||actor?.schoolId!==schoolId||typeof actor?.uid!=='string'||!actor.uid.trim())
  throw new Error('School Admin permission required');
 const roster=await loadCompleteClassRoster({db,api,actor,schoolId,classId});
 assertSession?.();
 if(actor?.uid!==identity.uid||actor?.role!==identity.role||actor?.active!==identity.active||actor?.schoolId!==identity.schoolId)
  throw new Error('School Admin identity changed during roster verification');
 return saveVerifiedClassAttendance({db,api,actor,schoolId,classId,date,expectedStudentIds:roster.studentIds,entries,onProgress,assertSession});
}
