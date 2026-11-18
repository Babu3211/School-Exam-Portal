import {validateSchoolId} from './school-paths.mjs';
export function prepareSchoolActivation(schoolId,confirmed){
 validateSchoolId(schoolId);
 if(confirmed!==true)throw new Error('Explicit school activation confirmation required');
 return {path:'schools/'+schoolId,patch:{active:true},requiresSuperAdmin:true};
}
