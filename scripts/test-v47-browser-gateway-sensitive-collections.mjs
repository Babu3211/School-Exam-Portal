import assert from "node:assert/strict";
import {createV46BrowserTenantGateway} from "../src/v47/v46-browser-tenant-gateway.mjs";
const gateway=createV46BrowserTenantGateway({
 db:{},verifiedSchoolId:"school_A001",
 collectionFn:(_db,...parts)=>parts.join("/"),
 docFn:(_db,...parts)=>parts.join("/"),
 getDocsFn:async()=>({docs:[]}),
 getDocFn:async()=>({exists:()=>false}),
 queryFn:(...args)=>args,
 limitFn:n=>n
});
for(const name of ["students","marks","attendance","staff","school_settings"]){
 assert.equal(gateway.forCollection("schools/school_A001/"+name).path,"schools/school_A001/"+name);
}
for(const name of ["audit_logs","user_roles","public_results","public_result_lookup","public_result_exams","school_gallery","school_public_branding"]){
 assert.throws(()=>gateway.forCollection("schools/school_A001/"+name),/Sensitive V46 collection/);
}
for(const path of ["schools/school_B001/students","students","schools/school_A001/students/other","schools/school_A001/unknown"]){
 assert.throws(()=>gateway.forCollection(path),/Unreviewed or cross-school/);
}
console.log("V47 browser tenant gateway blocks sensitive and cross-school collections");
