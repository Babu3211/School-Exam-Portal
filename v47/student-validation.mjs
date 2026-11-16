import {SCHOOL_CLASSES} from './class-catalog.mjs';
export function validateStudent(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new TypeError('Student details required');
 const name=String(input.name??'').trim();const className=String(input.class??'').trim();
 if(name.length<2||name.length>160)throw new RangeError('Student name must be 2–160 characters');
 if(!SCHOOL_CLASSES.includes(className))throw new RangeError('Invalid class');
 const rollNo=String(input.rollNo??'').trim();if(rollNo.length>30)throw new RangeError('Roll number too long');
 return {name,class:className,...(rollNo?{rollNo}:{})};
}
