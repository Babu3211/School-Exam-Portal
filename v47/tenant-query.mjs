import {schoolCollectionPath,assertSchoolId} from './school-scope.mjs';
// UI must request tenant-scoped collection paths; never top-level students/marks.
export function tenantQueryPath(schoolId,kind) {
  const allowed=['students','marks','attendance','staff','classes','subjects','exams','mark_settings','school_settings','subject_assignments','component_marks','members'];
  assertSchoolId(schoolId);
  if(!allowed.includes(kind)) throw new TypeError('Unapproved tenant collection');
  return schoolCollectionPath(schoolId,kind);
}
