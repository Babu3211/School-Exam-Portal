import {loadCompleteClassRoster} from './complete-class-roster.mjs';
import {validateCompleteClassMarks} from './class-mark-completeness.mjs';
import {saveCompleteClassMarks} from './class-mark-save.mjs';
import {validateSchoolId} from './school-paths.mjs';
// This UI workflow is deliberately limited to <=3 students until the Firebase
// Emulator verifies a larger all-or-nothing write design. Never chunk marks.
export async function saveVerifiedSmallClassMarks({db,api,actor,schoolId,classId,term,subjectId,entries}){
 validateSchoolId(schoolId);
 if(actor?.active!==true||actor?.role!=='school_admin'||actor?.schoolId!==schoolId)throw new Error('School Admin permission required');
 const originalUid=actor.uid;
 const roster=await loadCompleteClassRoster({db,api,actor,schoolId,classId});
 if(actor.active!==true||actor.role!=='school_admin'||actor.schoolId!==schoolId||actor.uid!==originalUid)throw new Error('School Admin identity changed during roster load');
 const complete=validateCompleteClassMarks({schoolId,classId,term,subjectId,expectedStudentIds:roster.studentIds,entries});
 if(complete.count>3)throw new RangeError('Full-class atomic Save is not available for classes above 3 students. Nothing saved.');
 return saveCompleteClassMarks({db,api,actor,schoolId,classId,term,subjectId,expectedStudentIds:roster.studentIds,entries:complete.entries});
}
