import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const rules=readFileSync(new URL("../firestore.v47.prototype.rules",import.meta.url),"utf8");
const studentBlock=rules.match(/match \/students\/\{id\} \{([\s\S]*?)\n      \}/)?.[1];
assert.ok(studentBlock,"student rules present");
assert.match(studentBlock,/allow create: if admin\(schoolId\) && studentCreateShape\(schoolId\)/);
assert.match(studentBlock,/resource\.data\.get\('schoolId', schoolId\) == schoolId/);
assert.match(studentBlock,/request\.resource\.data\.schoolId == schoolId/);
assert.match(studentBlock,/allow delete: if false/);
const shape=rules.match(/function studentCreateShape\(schoolId\) \{([\s\S]*?)\n    \}/)?.[1];
assert.ok(shape,"student shape validation present");
for(const required of ["request.resource.data.schoolId == schoolId","request.resource.data.classId == request.resource.data.class","request.resource.data.active == true","request.resource.data.nameEnglish.size() <= 150","'Class 12'","'ECD'"]){
 assert.ok(shape.includes(required),required);
}
const form=readFileSync(new URL("../prototypes/v47/spark-school-students.html",import.meta.url),"utf8");
assert.ok(form.includes("nameEnglish:name,class:className,classId:className,active:true,schoolId:id"),"student form matches rule");
console.log("V47 draft student Firestore rule and UI shape contract passed (emulator validation still required)");
