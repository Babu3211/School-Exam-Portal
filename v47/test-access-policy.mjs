import assert from 'node:assert/strict';
import {effectiveSchoolRole,mayPerform} from './access-policy.mjs';
for(const role of ['viewer','teacher','school_admin']){
 const args={schoolId:'schoolA',schoolActive:true,membership:{schoolId:'schoolA',active:true,role}};
 assert.equal(effectiveSchoolRole(args),role);
 assert.equal(mayPerform({...args,action:'read'}),true);
 assert.equal(mayPerform({...args,action:'write'}),role==='school_admin');
 assert.equal(mayPerform({...args,action:'manage'}),role==='school_admin');
 assert.equal(mayPerform({...args,action:'delete'}),false);
 assert.equal(mayPerform({...args,schoolId:'schoolB',action:'read'}),false);
 assert.equal(mayPerform({...args,schoolActive:false,action:'read'}),false);
 assert.equal(mayPerform({...args,membership:{...args.membership,active:false},action:'read'}),false);
}
console.log('V47 UI access policy checks passed; server rules are authoritative');
