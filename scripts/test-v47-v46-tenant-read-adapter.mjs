import assert from "node:assert/strict";
import {createV46TenantReadAdapter} from "../src/v47/v46-tenant-read-adapter.mjs";
const db={};
const options={
 db,verifiedSchoolId:"school_A001",
 verifiedMembership:{schoolId:"school_A001",active:true,roles:["viewer"]},
 collectionFn:(_db,path)=>path,
 docFn:(_db,path,id)=>path+"/"+id,
 getDocFn:async path=>({exists:()=>true,id:path.split("/").at(-1),data:()=>({schoolId:"school_A001"})}),
 getDocsFn:async ()=>({docs:[{id:"student1",data:()=>({name:"Test"})}]}),
 queryFn:(path,...clauses)=>({path,clauses}),
 limitFn:n=>({limit:n})
};
const adapter=createV46TenantReadAdapter(options);
assert.deepEqual(await adapter.list("students"),[{name:"Test",id:"student1"}]);
assert.deepEqual(await adapter.get("attendance","entry_1"),{schoolId:"school_A001",id:"entry_1"});
assert.deepEqual(await adapter.get("school_settings","default"),{schoolId:"school_A001",id:"default"});
for(const name of ["audit_logs","user_roles","public_results","school_gallery","unknown","__proto__","constructor","toString","schools/school_B001/students"]){
 await assert.rejects(adapter.list(name));
}
for(const id of ["","/","../student","student/other",".","..","bad\nname","a".repeat(1501)]){
 await assert.rejects(adapter.get("students",id));
}
for(const pageSize of [0,51,-1,1.5]){
 await assert.rejects(adapter.list("students",{pageSize}));
}
assert.throws(()=>createV46TenantReadAdapter({...options,verifiedMembership:{...options.verifiedMembership,schoolId:"school_B001"}}));
assert.throws(()=>createV46TenantReadAdapter({...options,verifiedMembership:{...options.verifiedMembership,roles:["viewer","school_admin"]}}));
for(const forbidden of ["collection","doc","write","delete","set","update"]){
 assert.equal(Object.hasOwn(adapter,forbidden),false);
}
console.log("V46 tenant bounded read adapter isolation passed");
