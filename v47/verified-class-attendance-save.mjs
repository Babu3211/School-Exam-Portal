import {validateCompleteClassAttendance} from './class-attendance-completeness.mjs';
import {saveLoadedClassAttendance} from './attendance-class-save.mjs';

// Safe entry point for class attendance: validation completes before first batch.
// Multi-batch writes are NOT atomic; PartialAttendanceSaveError reports progress.
export async function saveVerifiedClassAttendance({db,api,actor,schoolId,classId,date,expectedStudentIds,entries,onProgress}){
 if(!Array.isArray(expectedStudentIds)||expectedStudentIds.length===0)throw new Error('Authoritative roster required');
 const complete=validateCompleteClassAttendance({schoolId,classId,date,expectedStudentIds,entries});
 return saveLoadedClassAttendance({db,api,actor,schoolId,entries:complete.entries,onProgress});
}
