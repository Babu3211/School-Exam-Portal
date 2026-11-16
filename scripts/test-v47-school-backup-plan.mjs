import assert from "node:assert/strict";
import {planV47SchoolBackup} from "../src/v47/school-backup-plan.mjs";
const a=planV47SchoolBackup({schoolId:"school_2083_a"});
const b=planV47SchoolBackup({schoolId:"school_2083_b"});
assert.equal(a.state,"PLAN_ONLY_NO_EXPORT_OR_RESTORE");
assert.ok(a.collections.length>=8);
assert.ok(a.collections.every(item=>item.path.startsWith("schools/school_2083_a/")&&item.readOnly));
assert.ok(b.collections.every(item=>item.path.startsWith("schools/school_2083_b/")));
assert.ok(a.excluded.includes("user_roles"));
assert.ok(a.excluded.includes("audit_logs"));
assert.ok(a.excluded.includes("public_results"));
for(const name of ["user_roles","audit_logs","public_results","public_result_lookup","unknown"]){
 assert.throws(()=>planV47SchoolBackup({schoolId:"school_2083_a",collections:[name]}),/Unreviewed/);
}
assert.throws(()=>planV47SchoolBackup({schoolId:"school_2083_a",collections:["students","students"]}),/duplicate/);
assert.throws(()=>planV47SchoolBackup({schoolId:"invalid",collections:["students"]}),/Invalid/);
assert.equal(planV47SchoolBackup({schoolId:"school_2083_a",collections:["students"]}).collections.length,1);
console.log("V47 school backup manifest is scoped and planning-only");
