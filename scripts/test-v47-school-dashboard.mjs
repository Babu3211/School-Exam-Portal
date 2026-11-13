import assert from "node:assert/strict";
import {buildSchoolDashboard} from "../src/v47/school-dashboard.mjs";
const memberships=[
 {uid:"teacher1",schoolId:"school_A001",roles:["viewer"],active:true},
 {uid:"teacher1",schoolId:"school_B001",roles:["subject_teacher"],active:true},
 {uid:"other",schoolId:"school_C001",roles:["school_admin"],active:true}
];
const schools=[
 {schoolId:"school_A001",name:"School A"},
 {schoolId:"school_B001",name:"School B"},
 {schoolId:"school_C001",name:"Private School C"}
];
const dashboard=buildSchoolDashboard({authUid:"teacher1",selectedSchoolId:"school_A001",memberships,schools});
assert.equal(dashboard.readOnly,true);
assert.equal(dashboard.schoolName,"School A");
assert.deepEqual(dashboard.availableSchools.map(s=>s.schoolId),["school_A001","school_B001"]);
assert.equal(JSON.stringify(dashboard).includes("Private School C"),false);
assert.throws(()=>buildSchoolDashboard({authUid:"teacher1",selectedSchoolId:"school_C001",memberships,schools}),/No active membership/);
const other=buildSchoolDashboard({authUid:"teacher1",selectedSchoolId:"school_B001",memberships,schools});
assert.equal(other.readOnly,false);
console.log("V47 school dashboard view-model tests passed");
