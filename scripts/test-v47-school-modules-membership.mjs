import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
for(const name of ["students","staff","marks","attendance"]){
 const html=readFileSync(new URL("../prototypes/v47/spark-school-"+name+".html",import.meta.url),"utf8");
 assert.ok(html.includes('import {verifyV47BrowserMembership} from "../../src/v47/browser-membership-guard.mjs";'),name+" guard import");
 assert.ok(html.includes("verifyV47BrowserMembership({schoolId:id,uid:user.uid,school:s.data(),member:m.data()})"),name+" verifies school identity");
 assert.ok(!html.includes('m.data().roles.some(role=>'),name+" must not duplicate weaker role validation");
 assert.ok(html.includes('schoolCollectionPath(id,"'+name+'")'),name+" scoped collection");
 assert.ok(html.includes("createV46VerifiedReadSession({"),name+" tenant gateway");
 assert.ok(html.includes('tenantRecords.listPage("'+name+'",{pageSize:20,cursor})'),name+" bounded cursor paging");
 assert.ok(html.includes("cursor=page.nextCursor"),name+" next cursor");
 assert.ok(html.includes("const before=await verify(id,user)"),name+" prefetch verification");
 assert.ok(html.includes("const after=await verify(id,user)"),name+" postfetch verification");
 assert.ok(html.includes('after.roles.join(",")!==before.roles.join(",")'),name+" rejects role changes");
 assert.ok(!html.includes("const snap=await getDocs(base)"),name+" bypasses gateway");
}
console.log("V47 students/staff/marks/attendance shared membership guard checks passed");
