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
console.log("V47 school module return-navigation checks passed");
