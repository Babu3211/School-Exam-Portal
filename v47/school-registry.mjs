import {validateSchoolId} from './school-paths.mjs';
export function validateSchoolRegistration(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new TypeError('Invalid school');
 const id=validateSchoolId(input.id);
 const name=String(input.name??'').trim();
 if(name.length<3||name.length>160)throw new RangeError('Invalid school name');
 const iemis=String(input.iemisCode??'').trim();
 if(iemis&&!/^[0-9]{5,20}$/.test(iemis))throw new Error('Invalid IEMIS code');
 return {id,name,iemisCode:iemis,active:false};
}
