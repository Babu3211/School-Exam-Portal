import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
for(const module of ["students","staff","marks","attendance"]){
 const html=readFileSync(new URL("../prototypes/v47/spark-school-"+module+".html",import.meta.url),"utf8");
 assert.match(html,/id="workspace-back"/);
 assert.match(html,/const updateBackLink=schoolId=>/);
 assert.match(html,/url\.searchParams\.set\("schoolId",schoolId\)/);
 assert.match(html,/schoolId=id;updateBackLink\(id\)/);
 assert.match(html,/verifyV47BrowserMembership/);
}
const staff=readFileSync(new URL("../prototypes/v47/spark-school-staff.html",import.meta.url),"utf8");
assert.match(staff,/createV46VerifiedReadSession\(/);
assert.match(staff,/tenantRecords\.listPage\("staff",\{pageSize:20,cursor\}\)/);
assert.doesNotMatch(staff,/createV46BrowserTenantGateway/);
const students=readFileSync(new URL("../prototypes/v47/spark-school-students.html",import.meta.url),"utf8");
assert.match(students,/createV46VerifiedReadSession\(/);
assert.match(students,/tenantRecords\.listPage\("students",\{pageSize:20,cursor\}\)/);
assert.doesNotMatch(students,/createV46BrowserTenantGateway/);
assert.match(students,/access\.roles\.includes\("school_admin"\)/);
assert.match(students,/await addDoc\(collection\(db,schoolCollectionPath\(id,"students"\)\)/);
const marks=readFileSync(new URL("../prototypes/v47/spark-school-marks.html",import.meta.url),"utf8");
assert.match(marks,/createV46VerifiedReadSession\(/);
for(const kind of ["marks","students","subjects"])
 assert.ok(marks.includes('.listPage("'+kind+'",'));
assert.doesNotMatch(marks,/createV46BrowserTenantGateway/);
assert.match(marks,/await addDoc\(collection\(db,schoolCollectionPath\(id,"marks"\)\),payload\)/);
const attendance=readFileSync(new URL("../prototypes/v47/spark-school-attendance.html",import.meta.url),"utf8");
assert.match(attendance,/createV46VerifiedReadSession\(/);
assert.match(attendance,/tenantRecords\.listPage\("attendance",\{pageSize:20,cursor\}\)/);
assert.match(attendance,/studentGateway\.listPage\("students",\{pageSize:50,cursor:studentCursor\}\)/);
assert.doesNotMatch(attendance,/createV46BrowserTenantGateway/);
assert.match(attendance,/await addDoc\(collection\(db,schoolCollectionPath\(id,"attendance"\)\),payload\)/);
console.log("V47 school module return-navigation checks passed");
