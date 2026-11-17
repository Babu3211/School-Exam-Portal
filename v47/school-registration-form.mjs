import {newSchoolRecord} from './registry-schema.mjs';
// Pure form validation: call registerSchool() only from a Super Admin authenticated UI.
export function validateRegistrationForm(form){
 try{return {ok:true,record:newSchoolRecord(form),errors:[]};}
 catch(e){return {ok:false,record:null,errors:[e.message]};}
}
