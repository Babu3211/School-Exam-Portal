import {schoolCollectionPath,assertSchoolId} from './school-scope.mjs';
// UI must request tenant-scoped collection paths; never top-level students/marks.
export function tenantQueryPath(schoolId,kind) {
  const allowed=['students','marks','attendance','staff','classes','subjects','exams','mark_settings','school_settings','subject_assignments','component_marks','members'];
  assertSchoolId(schoolId);
  if(!allowed.includes(kind)) throw new TypeError('Unapproved tenant collection');
  return schoolCollectionPath(schoolId,kind);
}

// Bounded query specification for tenant-scoped UI pagination.
export function tenantQuerySpec({schoolId,collection,pageSize=50}) {
  const path=tenantQueryPath(schoolId,collection);
  if(!Number.isInteger(pageSize)||pageSize<1||pageSize>100)throw new RangeError('Page size must be 1–100');
  return Object.freeze({path,pageSize,orderBy:'__name__'});
}
