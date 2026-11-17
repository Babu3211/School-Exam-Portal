import {validSchoolClass} from './class-catalog.mjs';
const ID=/^[A-Za-z0-9_-]{1,128}$/;
export function validateSchoolSubject(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new TypeError('Subject required');
 const {id,name}=input;
 if(typeof id!=='string'||!ID.test(id))throw new Error('Invalid subject ID');
 if(typeof name!=='string'||name.trim().length<2||name.trim().length>160)throw new Error('Invalid subject name');
 if(!validSchoolClass(input.class))throw new Error('Invalid subject class');
 if(input.active!==undefined&&typeof input.active!=='boolean')throw new Error('Invalid subject active flag');
 return {id,name:name.trim(),class:input.class,active:input.active??true};
}
