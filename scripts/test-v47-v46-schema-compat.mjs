/** Guard against treating the prototype attendance rules as production-ready. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const rules=readFileSync(new URL("../firestore.v47.prototype.rules",import.meta.url),"utf8");
// Actual V46 attendance saves one class/date record containing a students array.
assert.match(html,/const payload=\{date:key\.date,className:key\.className,attendanceType:key\.type,subject:key\.subject\|\|null,students,totalStudents:/);
assert.match(html,/addDoc\(collection\(db,"attendance"\),\{\.\.\.payload,createdAt:/);
// Prototype V47 rules expect one student per attendance record, which is incompatible.
assert.match(rules,/function attendanceShape\(schoolId\)/);
assert.match(rules,/request\.resource\.data\.keys\(\)\.hasAll\(\['schoolId','classId','term','studentId','present'\]\)/);
console.log("V47 migration compatibility guard: V46 batch attendance differs from prototype single-student schema; DO NOT DEPLOY prototype rules");
