import assert from "node:assert/strict";
import {validateV47ReadQuery as valid} from "../src/v47/read-query-validation.mjs";
const m={schoolId:"school_A001",className:"9",subject:"Computer"};
const a={schoolId:"school_A001",className:"9",date:"2083-01-01"};
assert.equal(valid(m,"marks"),true);
assert.equal(valid({...m,section:"A"},"marks"),true);
assert.equal(valid(a,"attendance"),true);
assert.equal(valid({...a,attendanceType:"daily"},"attendance"),true);
for(const [query,kind] of [
 [{...m,subject:""},"marks"],
 [{...m,subject:"x".repeat(129)},"marks"],
 [{...m,subject:["Computer"]},"marks"],
 [{...m,uid:"forged"},"marks"],
 [{...m,schoolId:"../other"},"marks"],
 [{...m,subject:"Computer\nOther"},"marks"],
 [{...a,date:"not-a-date"},"attendance"],
 [{...a,attendanceType:["daily"]},"attendance"],
 [{...a,role:"school_admin"},"attendance"],
 [{...a,schoolId:""},"attendance"],
 [null,"marks"],[[],"attendance"]
 ])assert.equal(valid(query,kind),false,JSON.stringify(query));
console.log("V47 bounded HTTP read query validation tests passed");
