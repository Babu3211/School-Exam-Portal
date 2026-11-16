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
// A cursor belongs to exactly one collection and must not be replayed.
const pageDoc={id:"student_1",ref:{path:"schools/school_A001/students/student_1"},data:()=>({name:"Student"})};
let pageCalls=0;
const paged=createV46BrowserTenantGateway({
 db:{},verifiedSchoolId:"school_A001",
 collectionFn:(_db,...parts)=>parts.join("/"),
 docFn:(_db,...parts)=>parts.join("/"),
 getDocsFn:async()=>({docs:pageCalls++===0?[pageDoc]:[]}),
 getDocFn:async()=>({exists:()=>false}),
 queryFn:(path,...clauses)=>({path,clauses}),limitFn:n=>({limit:n}),
 orderByFn:field=>({field}),startAfterFn:cursor=>({after:cursor.id})
});
const students=paged.forCollection("schools/school_A001/students");
const first=await students.listPage({pageSize:1});
assert.equal(first.nextCursor,pageDoc);
await assert.rejects(paged.forCollection("schools/school_A001/students").listPage({pageSize:1,cursor:first.nextCursor}),/Invalid Firestore page cursor/);
const next=await students.listPage({pageSize:1,cursor:first.nextCursor});
assert.deepEqual(next.records,[]);
await assert.rejects(students.listPage({pageSize:1,cursor:first.nextCursor}),/Invalid Firestore page cursor/);
console.log("V47 browser tenant gateway blocks sensitive collections and cursor replay");
