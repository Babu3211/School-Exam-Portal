/** Read-only compatibility audit. Never deploy V47 prototype rules from this test. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const rules=readFileSync(new URL("../firestore.v47.prototype.rules",import.meta.url),"utf8");
// V46 uses human-readable className, subject and optional section for marks queries.
assert.match(html,/collection\(db,"marks"\),where\("className","==",x\.className\),where\("subject","==",x\.subject\)/);
assert.match(html,/where\("section","==",String\(x\.section\)\.trim\(\)\)/);
// V47 prototype expects a different shape, with classId/subjectId/studentId/score.
assert.match(rules,/function marksShape\(schoolId\)/);
assert.match(rules,/hasAll\(\['schoolId','classId','subjectId','term','studentId','score'\]\)/);
console.log("V47 V46 marks schema audit: legacy className/subject queries differ from prototype mark identity; migration requires adapter and emulator verification");
