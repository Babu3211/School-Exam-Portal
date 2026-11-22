import {validateSchoolId} from './school-paths.mjs';

// School ID and the registry's IEMIS identity are immutable in this form.
// This profile is deliberately scoped to the verified school's settings document.
export const SCHOOL_PROFILE_FIELDS=['nameEnglish','nameNepali','addressEnglish','addressNepali'];
function clean(value,max,label,required=false){
 if(typeof value!=='string')throw new TypeError(label+' must be text');
 const text=value.trim().replace(/\s+/g,' ');
 if((required&&text.length<3)||text.length>max)throw new RangeError(label+' length is invalid');
 if(/[\u0000-\u001f\u007f]/.test(text))throw new Error(label+' contains unsupported characters');
 return text;
}
export function schoolProfileView(profile={},registryName=''){
 const source=profile&&typeof profile==='object'&&!Array.isArray(profile)?profile:{};
 const text=key=>typeof source[key]==='string'?source[key]:'';
 return Object.freeze({
  nameEnglish:text('nameEnglish')||String(registryName||''),
  nameNepali:text('nameNepali'),
  addressEnglish:text('addressEnglish'),
  addressNepali:text('addressNepali')
 });
}
export function validateSchoolProfile(input,schoolId){
 const id=validateSchoolId(schoolId);
 if(!input||typeof input!=='object'||Array.isArray(input))throw new TypeError('School profile required');
 if(input.schoolId!==undefined&&input.schoolId!==id)throw new Error('School ID cannot be changed');
 return Object.freeze({
  schoolId:id,
  nameEnglish:clean(input.nameEnglish,160,'English school name',true),
  nameNepali:clean(input.nameNepali,160,'Nepali school name'),
  addressEnglish:clean(input.addressEnglish,300,'English address'),
  addressNepali:clean(input.addressNepali,300,'Nepali address')
 });
}
export function canEditSchoolProfile(role){return role==='school_admin'}
export function profileSignature(profile){
 return JSON.stringify(SCHOOL_PROFILE_FIELDS.map(key=>String(profile?.[key]??'')));
}
