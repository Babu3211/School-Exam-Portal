import {assertSchoolId} from './school-scope.mjs';
export const SCHOOL_ROLES=Object.freeze(['school_admin','teacher','viewer']);
export function newSchoolRecord({id,name,iemisCode=''}) {
  assertSchoolId(id);
  if(id.length<3) throw new TypeError('School ID must be at least 3 characters');
  if(typeof name!=='string'||name.trim().length<3||name.trim().length>160) throw new TypeError('Invalid school name');
  if(typeof iemisCode!=='string'||(iemisCode!==''&&!/^[0-9]{5,20}$/.test(iemisCode))) throw new TypeError('Invalid IEMIS code');
  return {id,name:name.trim(),iemisCode,active:false};
}
export function newMembership({uid,schoolId,role}) {
  assertSchoolId(uid);assertSchoolId(schoolId);
  if(!SCHOOL_ROLES.includes(role)) throw new TypeError('Invalid school role');
  return {uid,schoolId,role,active:false};
}
