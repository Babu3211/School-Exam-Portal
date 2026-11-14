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
const mixed=[
 {uid:"user1",schoolId:"invalid/school",roles:["viewer"],active:true},
 {uid:"user1",schoolId:"school_A001",roles:["viewer"],active:true},
 {uid:"user1",schoolId:"school_B001",roles:["unrecognized_role"],active:true},
 {uid:"user1",schoolId:"school_C001",roles:["school_admin"],active:true}
];
assert.deepEqual(availableSchoolsForUser("user1",mixed).map(x=>x.schoolId),["school_A001","school_C001"],"Malformed memberships must not hide valid schools");
assert.equal(resolveSchoolSession({authUid:"user1",schoolId:"school_C001",serverMemberships:mixed}).roles[0],"school_admin");
const crossUser=[
 {uid:"user2",schoolId:"school_A001",roles:["school_admin"],active:true},
 {uid:"user1",schoolId:"school_A001",roles:["viewer"],active:true}
];
assert.deepEqual(resolveSchoolSession({authUid:"user1",schoolId:"school_A001",serverMemberships:crossUser}).roles,["viewer"],"Another user's admin membership must never elevate this user");
assert.throws(()=>resolveSchoolSession({authUid:"user3",schoolId:"school_A001",serverMemberships:crossUser}),/No active membership/);
console.log("V47 school session isolation tests passed");
