import assert from "node:assert/strict";
import {normalizeMembership,mayAccessSchool,mayManageSchool} from "../src/v47/tenant-access.mjs";
const admin=normalizeMembership({uid:"admin-1",schoolId:"school_A001",roles:["school_admin"]});
const teacher=normalizeMembership({uid:"teacher-1",schoolId:"school_A001",roles:["subject_teacher"]});
const viewer=normalizeMembership({uid:"viewer-1",schoolId:"school_A001",roles:["viewer"]});
assert.throws(()=>normalizeMembership({uid:"mixed-1",schoolId:"school_A001",roles:["viewer","school_admin"]}),/Viewer role cannot be combined/);
for(const member of [admin,teacher,viewer]){
 assert.equal(mayAccessSchool(member,"school_B001","read"),false);
 assert.equal(mayAccessSchool(member,"school_B001","write"),false);
 assert.equal(mayAccessSchool(member,"school_A001","read"),true);
}
assert.equal(mayManageSchool(admin,"school_A001"),true);
assert.equal(mayManageSchool(teacher,"school_A001"),false);
assert.equal(mayAccessSchool(viewer,"school_A001","write"),false);

assert.equal(mayAccessSchool({...admin,active:false},"school_A001","read"),false);
assert.equal(mayAccessSchool(admin,"school_A001","delete"),false);
for(const malformed of [{...admin,roles:["viewer","school_admin"]},{...admin,roles:["school_admin","school_admin"]},{...admin,roles:["unknown"]},{...admin,roles:"school_admin"},{...admin,roles:[]},{...admin,active:"true"}]){
 assert.equal(mayAccessSchool(malformed,"school_A001","read"),false);
 assert.equal(mayAccessSchool(malformed,"school_A001","write"),false);
 assert.equal(mayManageSchool(malformed,"school_A001"),false);
}
assert.throws(()=>normalizeMembership({uid:"a",schoolId:"school_A001",roles:["super_admin"]}));
assert.throws(()=>normalizeMembership({uid:"a",schoolId:"school_A001",roles:["viewer","viewer"]}),/Duplicate school roles/);
assert.throws(()=>normalizeMembership({uid:"a",schoolId:"school_A001",roles:["school_admin","school_admin"]}),/Duplicate school roles/);
console.log("V47 membership isolation policy unit tests passed");
