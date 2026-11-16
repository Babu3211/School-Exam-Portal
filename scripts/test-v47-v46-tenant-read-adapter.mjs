import assert from "node:assert/strict";
import {createV46TenantReadAdapter} from "../src/v47/v46-tenant-read-adapter.mjs";
const db={};
const options={
 db,verifiedSchoolId:"school_A001",
 verifiedMembership:{schoolId:"school_A001",active:true,roles:["viewer"]},
 collectionFn:(_db,path)=>path,
 docFn:(_db,path,id)=>path+"/"+id
};
const adapter=createV46TenantReadAdapter(options);
assert.equal(adapter.collection("students"),"schools/school_A001/students");
assert.equal(adapter.collection("marks"),"schools/school_A001/marks");
assert.equal(adapter.doc("attendance","entry_1"),"schools/school_A001/attendance/entry_1");
assert.equal(adapter.doc("school_settings","default"),"schools/school_A001/school_settings/default");
for(const name of ["audit_logs","user_roles","public_results","school_gallery","unknown","schools/school_B001/students"]){
 assert.throws(()=>adapter.collection(name));
}
for(const id of ["","/","../student","student/other",".",".."]){
 assert.throws(()=>adapter.doc("students",id));
}
assert.throws(()=>createV46TenantReadAdapter({...options,verifiedMembership:{...options.verifiedMembership,schoolId:"school_B001"}}));
assert.throws(()=>createV46TenantReadAdapter({...options,verifiedMembership:{...options.verifiedMembership,roles:["viewer","school_admin"]}}));
assert.equal(Object.hasOwn(adapter,"write"),false);
assert.equal(Object.hasOwn(adapter,"delete"),false);
console.log("V46 tenant read reference adapter isolation passed");
