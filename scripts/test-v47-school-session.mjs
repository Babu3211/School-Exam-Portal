import assert from "node:assert/strict";
import {availableSchoolsForUser,resolveSchoolSession} from "../src/v47/school-session.mjs";
const memberships=[
 {uid:"user1",schoolId:"school_A001",roles:["viewer"],active:true},
 {uid:"user1",schoolId:"school_B001",roles:["school_admin"],active:false},
 {uid:"user2",schoolId:"school_C001",roles:["school_admin"],active:true},
 {uid:"user1",schoolId:"school_A001",roles:["viewer"],active:true}
];
assert.deepEqual(availableSchoolsForUser("user1",memberships).map(x=>x.schoolId),["school_A001"]);
assert.equal(resolveSchoolSession({authUid:"user1",schoolId:"school_A001",serverMemberships:memberships}).roles[0],"viewer");
assert.throws(()=>resolveSchoolSession({authUid:"user1",schoolId:"school_B001",serverMemberships:memberships}));
assert.throws(()=>resolveSchoolSession({authUid:"user1",schoolId:"school_C001",serverMemberships:memberships}));
assert.throws(()=>resolveSchoolSession({authUid:"user1",schoolId:"../",serverMemberships:memberships}));
assert.throws(()=>availableSchoolsForUser("",memberships));
console.log("V47 school session isolation tests passed");
