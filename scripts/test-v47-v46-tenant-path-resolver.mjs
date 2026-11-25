import assert from "node:assert/strict";
import {createV46TenantPathResolver} from "../src/v47/v46-tenant-path-resolver.mjs";
const id="school_2083_a",other="school_2083_b";
const admin=createV46TenantPathResolver({verifiedSchoolId:id,verifiedMembership:{schoolId:id,active:true,roles:["school_admin"]}});
for(const name of ["students","staff","classes","subjects","exams","marks","attendance","certificates","school_settings","mark_settings"]){
 assert.equal(admin.collection(name),"schools/"+id+"/"+name);
 assert.ok(!admin.collection(name).startsWith("schools/"+other+"/"));
}
for(const name of ["cdc_serofero_indicators","user_roles","audit_logs","public_results","public_result_lookup","public_result_exams","school_gallery","school_public_branding"]){
 assert.throws(()=>admin.collection(name),/server-side migration review/);
}
for(const name of ["../students","schools/"+other+"/students","unknown",""]){
 assert.throws(()=>admin.collection(name),/Unreviewed legacy collection/);
}
for(const membership of [
 null,{schoolId:other,active:true,roles:["school_admin"]},
 {schoolId:id,active:false,roles:["school_admin"]},
 {schoolId:id,active:true,roles:["viewer","school_admin"]},
 {schoolId:id,active:true,roles:[]},
 {schoolId:id,active:true,roles:["school_admin","school_admin"]},
 {schoolId:id,active:true,roles:["unknown"]}
]){
 assert.throws(()=>createV46TenantPathResolver({verifiedSchoolId:id,verifiedMembership:membership}),/Verified school membership required/);
}
const viewer=createV46TenantPathResolver({verifiedSchoolId:id,verifiedMembership:{schoolId:id,active:true,roles:["viewer"]}});
assert.equal(viewer.collection("students"),"schools/"+id+"/students");
console.log("V46 private collection tenant resolver checks passed");
