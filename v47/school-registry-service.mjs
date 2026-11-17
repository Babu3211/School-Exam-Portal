import {newSchoolRecord,newMembership} from './registry-schema.mjs';
import {schoolDocumentPath} from './school-scope.mjs';
// Dependency-injected data adapter; no Firebase project or live database is touched here.
// Adapter must implement create(path,data) with create-only (never overwrite) semantics.
export async function registerSchool(adapter, details) {
  if(typeof adapter?.create!=='function') throw new TypeError('Create-only adapter required');
  const record=newSchoolRecord(details);
  await adapter.create('schools/'+record.id,record);
  return record;
}
export async function provisionSchoolMember(adapter, details) {
  if(typeof adapter?.create!=='function') throw new TypeError('Create-only adapter required');
  const record=newMembership(details);
  await adapter.create(schoolDocumentPath(record.schoolId,'members',record.uid),record);
  return record;
}
