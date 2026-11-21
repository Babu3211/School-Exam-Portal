import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const rules=readFileSync(new URL('./firestore.rules',import.meta.url),'utf8');
const studentRules=rules.split('match /students/{id} {')[1]?.split('function teacherMarkAllowed')[0];
assert.ok(studentRules,'Student rules must exist');
const fields=['studentIemisId','admissionNo','studentNameNepali','gender','fatherName','motherName','section','permanentAddress','temporaryAddress','dob','dobAD','motherTongue','disabilityType','guardianName','phone','symbolNo','birthRegistrationNo','nebRegNo','sourceYear'];
for(const field of fields){
 assert.ok(studentRules.includes("'"+field+"'"),'Missing student import field: '+field);
 assert.ok(studentRules.includes("request.resource.data.get('"+field+"','') is string"),'Missing string validation: '+field);
}
assert.match(studentRules,/allow create: if canAdmin\(sid\) && validStudent\(\)/);
assert.match(studentRules,/allow delete: if false/);
assert.match(studentRules,/immutableSchool\(sid\)/);
console.log('PASS: V47 student import fields covered by school-scoped create/update rules');
