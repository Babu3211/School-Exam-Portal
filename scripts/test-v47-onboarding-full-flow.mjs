import assert from "node:assert/strict";
import {Readable} from "node:stream";
import {createV47NodeOnboardingHandler} from "../src/v47/node-onboarding-handler.mjs";
const records=new Map([["platform_admins/root_admin",{active:true}]]);
let nextId=0;
const snapshot=path=>({exists:records.has(path),data:()=>records.get(path)});
const firestore={
 doc:path=>({path,get:async()=>snapshot(path)}),
 collection:path=>({doc:()=>({path:path+"/"+(++nextId)})}),
 runTransaction:async callback=>{
  const operations=[];
  const tx={
   get:async ref=>snapshot(ref.path),
   create:(ref,data)=>{if(records.has(ref.path))throw Error("Document already exists");operations.push(["create",ref.path,data]);},
   update:(ref,data)=>operations.push(["update",ref.path,data])
  };
  const result=await callback(tx);
  for(const [action,path,data] of operations)records.set(path,action==="update"?{...records.get(path),...data}:data);
  return result;
 }
};
const auth={
 verifyIdToken:async token=>({uid:token==="root"?"root_admin":"ordinary_user",firebase:{sign_in_provider:"password"}}),
 getUserByEmail:async email=>({uid:"teacher_admin",disabled:false,email})
};
const handle=createV47NodeOnboardingHandler({auth,firestore});
async function call(route,body,token="root"){
 const req=Readable.from([Buffer.from(JSON.stringify(body))]);
 req.url="/api/v47/platform/schools/"+route;
 req.method="POST";
 req.headers={authorization:"Bearer "+token,"content-type":"application/json"};
 const res={statusCode:200,writableEnded:false,setHeader(){},end(data){this.writableEnded=true;this.body=JSON.parse(data);}};
 await handle(req,res);
 return res;
}
const input={schoolId:"school_A001",name:"First School",iemisCode:"IEMIS001",adminEmail:"admin@example.com"};
assert.equal((await call("register",{input},"ordinary")).statusCode,403);
assert.equal(records.has("schools/school_A001"),false);
const registered=await call("register",{input});
assert.equal(registered.statusCode,201);
assert.equal(registered.body.result.schoolId,"school_A001");
assert.equal(records.get("schools/school_A001").status,"pending");
assert.equal(records.get("v47_iemis_index/IEMIS001").schoolId,"school_A001");
assert.equal((await call("register",{input:{...input,schoolId:"school_B001"}})).statusCode,403,"IEMIS must be unique");
assert.equal(records.has("schools/school_B001"),false);
assert.equal((await call("register",{input})).statusCode,403,"School ID must be unique");
assert.equal((await call("invite-admin",{schoolId:"school_A001",adminEmail:"admin@example.com"},"ordinary")).statusCode,403);
assert.equal(records.has("schools/school_A001/members/teacher_admin"),false);
const invited=await call("invite-admin",{schoolId:"school_A001",adminEmail:"admin@example.com"});
assert.equal(invited.statusCode,201);
assert.deepEqual(records.get("schools/school_A001/members/teacher_admin").roles,["school_admin"]);
assert.equal(records.get("v47_user_school_index/teacher_admin").memberships[0].schoolId,"school_A001");
assert.equal((await call("invite-admin",{schoolId:"school_A001",adminEmail:"admin@example.com"})).statusCode,403,"Duplicate invitation blocked");
assert.equal((await call("invite-admin",{schoolId:"school_A001",adminEmail:"wrong@example.com"})).statusCode,403,"Registered admin email required");
assert.equal(records.get("v47_user_school_index/teacher_admin").memberships.length,1);
assert.equal([...records.keys()].filter(path=>path.startsWith("v47_registration_audit/")).length,2);
console.log("V47 school registration and admin invitation full transaction flow passed");
