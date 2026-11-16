import assert from "node:assert/strict";
import {planV46SchoolMigration} from "../src/v47/v46-school-migration-planner.mjs";
const base={schoolId:"school_2083_a",sourceProject:"exam-portal-smss-95016",targetProject:"smss-exam-portal-v47"};
const p=planV46SchoolMigration({...base,counts:{students:1500,marks:12000,attendance:9000,public_results:500,audit_logs:30}});
assert.equal(p.totalRecords,23030);
assert.equal(p.readyToExecute,false);
assert.deepEqual(p.blockedCollections,["public_results","audit_logs"]);
assert.equal(p.entries[0].targetPath,"schools/school_2083_a/students");
assert.ok(p.entries.every(e=>e.writeAllowed===false));
for(const input of [
 {...base,counts:{students:-1}},
 {...base,counts:{unknown:1}},
 {...base,counts:{marks:1.5}},
 {...base,sourceProject:"smss-exam-portal-v47",counts:{students:1}},
 {...base,schoolId:"../other",counts:{students:1}}
])assert.throws(()=>planV46SchoolMigration(input));
console.log("V47 offline migration planner is tenant-scoped, fail-closed and read-only");
