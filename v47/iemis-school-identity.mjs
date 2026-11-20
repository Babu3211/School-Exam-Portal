// V47 school identity is the official IEMIS code, preserved as text.
export const IEMIS_SCHOOL_ID_PATTERN=/^[0-9]{5,20}$/;
export function assertIemisSchoolId(value){
 if(typeof value!=='string'||!IEMIS_SCHOOL_ID_PATTERN.test(value))throw new Error('School ID must be an IEMIS number string (5–20 digits)');
 return value;
}
export function createIemisSchoolRegistration({iemisCode,name}={}){
 const id=assertIemisSchoolId(iemisCode);
 if(typeof name!=='string'||name.trim().length<3||name.trim().length>160)throw new Error('Valid school name required');
 return Object.freeze({id,iemisCode:id,name:name.trim(),active:false});
}
