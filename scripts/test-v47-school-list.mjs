import assert from "node:assert/strict";
import {listVerifiedUserSchools} from "../src/v47/verified-school-list.mjs";
import {createV47SchoolsHttpHandler} from "../src/v47/schools-http-handler.mjs";
const index={memberships:[
 {uid:"u1",schoolId:"school_A001",active:true,roles:["viewer"]},
 {uid:"u1",schoolId:"school_B001",active:true,roles:["teacher"]},
 {uid:"u2",schoolId:"school_C001",active:true,roles:["admin"]}
]};
const docs={
 "v47_user_school_index/u1":index,
 "schools/school_A001":{name:"School A",status:"active"},
 "schools/school_B001":{name:"School B",status:"suspended"},
 "schools/school_A001/members/u1":{active:true,roles:["viewer"]}
};
const firestore={doc:path=>({get:async()=>({exists:Object.hasOwn(docs,path),data:()=>docs[path]})})};
const auth={verifyIdToken:async()=>({uid:"u1"})};
const schools=await listVerifiedUserSchools({idToken:"token",auth,firestore});
assert.deepEqual(schools.map(x=>x.schoolId),["school_A001"]);
assert.deepEqual(schools[0].roles,["viewer"]);
const handle=createV47SchoolsHttpHandler({auth,firestore});
assert.equal((await handle({method:"GET",headers:{authorization:"Bearer token"},query:{}})).status,200);
assert.equal((await handle({method:"GET",headers:{},query:{}})).status,401);
assert.equal((await handle({method:"GET",headers:{authorization:"Bearer token"},query:{uid:"u2"}})).status,400);
assert.equal((await handle({method:"POST",headers:{},query:{}})).status,405);
console.log("V47 school chooser verified membership tests passed");
