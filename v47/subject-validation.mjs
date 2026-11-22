import {validSchoolClass} from './class-catalog.mjs';
const ID=/^[A-Za-z0-9_-]{1,128}$/;
export function validateSchoolSubject(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new TypeError('Subject required');
 const {id,name}=input;
 if(typeof id!=='string'||!ID.test(id))throw new Error('Invalid subject ID');
 if(typeof name!=='string'||name.trim().length<2||name.trim().length>160)throw new Error('Invalid subject name');
 if(!validSchoolClass(input.class))throw new Error('Invalid subject class');
 if(input.active!==undefined&&typeof input.active!=='boolean')throw new Error('Invalid subject active flag');
 const marks={};
 for(const key of ['theoryFullMarks','practicalFullMarks']){
  const value=input[key];
  if(value===undefined||value===null||value==='')throw new Error('Examination Settings full marks required: '+key);
  if(typeof value!=='number'&&typeof value!=='string')throw new Error('Invalid Examination Settings full marks: '+key);
  if(typeof value==='string'&&!/^(?:\\d+(?:\\.\\d+)?|\\.\\d+)$/.test(value.trim()))throw new Error('Invalid Examination Settings full marks: '+key);
  const number=Number(value);
  if(!Number.isFinite(number)||number<0)throw new Error('Invalid Examination Settings full marks: '+key);
  marks[key]=number;
 }
 return {id,name:name.trim(),class:input.class,active:input.active??true,...marks};
}
