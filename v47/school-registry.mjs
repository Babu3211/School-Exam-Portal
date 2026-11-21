import {validateSchoolId} from './school-paths.mjs';
export function validateSchoolRegistration(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new TypeError('Invalid school');
 const id=validateSchoolId(input.id);
 if(typeof input.name!=='string')throw new TypeError('School name must be text');
 const name=input.name.trim();
 if(name.length<3||name.length>160)throw new RangeError('Invalid school name');
 if(typeof input.iemisCode!=='string')throw new TypeError('IEMIS Code must be text');
 const iemis=input.iemisCode;
 if(iemis!==id)throw new Error('School ID and IEMIS Code must match');
 return {id,name,iemisCode:iemis,active:false};
}

export function schoolRegistryPath(id){return 'schools/'+validateSchoolId(id);}
export function normalizeSchool(input){
 const validated=validateSchoolRegistration(input);
 const address=String(input.address??'').trim();
 if(address.length>240)throw new RangeError('Invalid school address');
 return {...validated}; // Persist only fields accepted by V47 Firestore rules; address is not yet supported.
}
