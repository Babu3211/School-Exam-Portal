import assert from "node:assert/strict";
import {listVerifiedUserSchools} from "../src/v47/verified-school-list.mjs";
const docs=new Map([
 ["v47_user_school_index/user1",{memberships:[{uid:"user1",schoolId:"school_A001",active:true,roles:["viewer"]}]}],
 ["schools/school_A001",{name:"School A",status:"active"}],
 ["schools/school_A001/members/user1",{active:true,roles:["viewer"]}]
]);
const firestore={doc:path=>({get:async()=>({exists:docs.has(path),data:()=>docs.get(path)})})};
const auth={verifyIdToken:async(_token,revoked)=>{assert.equal(revoked,true);return {uid:"user1"};}};
const args={idToken:"token",auth,firestore};
assert.equal((await listVerifiedUserSchools(args)).length,1);
docs.set("schools/school_A001/members/user1",{active:true,uid:"user2",schoolId:"school_A001",roles:["viewer"]});
assert.deepEqual(await listVerifiedUserSchools(args),[]);
docs.set("schools/school_A001/members/user1",{active:true,uid:"user1",schoolId:"school_B001",roles:["viewer"]});
assert.deepEqual(await listVerifiedUserSchools(args),[]);
docs.set("schools/school_A001/members/user1",{active:true,uid:"user1",schoolId:"school_A001",roles:["viewer"]});
assert.equal((await listVerifiedUserSchools(args))[0].schoolId,"school_A001");
docs.set("v47_user_school_index/user1",{memberships:[{uid:"user1",schoolId:"school_A001",active:true,roles:["school_admin"]}]});
assert.deepEqual((await listVerifiedUserSchools(args))[0].roles,["viewer"],"Stale index admin role must not override verified school membership");
docs.set("schools/school_A001/members/user1",{active:false,uid:"user1",schoolId:"school_A001",roles:["school_admin"]});
assert.deepEqual(await listVerifiedUserSchools(args),[],"Inactive school membership must never appear in chooser");
docs.set("schools/school_A001/members/user1",{active:true,uid:"user1",schoolId:"school_A001",roles:["viewer"]});
docs.set("v47_user_school_index/user1",{memberships:[
 {uid:"user1",schoolId:"invalid/school",active:true,roles:["viewer"]},
 {uid:"user1",schoolId:"school_A001",active:true,roles:["viewer"]}
]});
assert.deepEqual((await listVerifiedUserSchools(args)).map(s=>s.schoolId),["school_A001"],"Malformed index entry must not hide valid school");
console.log("V47 school chooser membership identity tests passed");
