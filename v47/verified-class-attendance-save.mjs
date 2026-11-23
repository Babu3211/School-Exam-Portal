import {loadCompleteClassRoster} from './complete-class-roster.mjs';
import {validateCompleteClassAttendance} from './class-attendance-completeness.mjs';
import {saveLoadedClassAttendance} from './attendance-class-save.mjs';

// Every write batch may be acknowledged even if the class roster changes
// while saving. An acknowledged write is never misreported as a failed write,
// but the result MUST remain unverified until the complete roster is checked.
export class AttendancePostSaveReviewError extends Error {
 constructor(saved,total,cause){
  super('Attendance batches acknowledged ('+saved+'/'+total+'), but the complete class roster could not be reverified. Review the saved records before retrying.');
  this.name='AttendancePostSaveReviewError';
  this.saved=saved;
  this.total=total;
  this.reviewRequired=true;
  this.cause=cause;
 }
}

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
 const result=await saveVerifiedClassAttendance({db,api,actor,schoolId,classId,date,
  expectedStudentIds:roster.studentIds,entries,onProgress,assertSession});
 // For multiple commits, never label a class COMPLETE based only on the
 // pre-save snapshot: enrollment can change during the save. This second
 // authoritative, paginated read detects additions, removals and transfers.
 // A post-commit network/session failure is a REVIEW state, not a failed write.
 try{
  assertSession?.();
  const after=await loadCompleteClassRoster({db,api,actor,schoolId,classId});
  assertSession?.();
  if(after.studentIds.length!==roster.studentIds.length||
     after.studentIds.some((id,index)=>id!==roster.studentIds[index])||
     after.students.some((student,index)=>JSON.stringify(student)!==JSON.stringify(roster.students[index])))
   throw new Error('Student roster changed during attendance save');
 }catch(cause){
  throw new AttendancePostSaveReviewError(result.saved,result.total,cause);
 }
 return {...result,rosterReverified:true};
}
