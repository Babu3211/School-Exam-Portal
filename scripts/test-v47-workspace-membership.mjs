import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {verifyV47BrowserMembership} from "../src/v47/browser-membership-guard.mjs";
const html=readFileSync(new URL("../prototypes/v47/spark-school-workspace.html",import.meta.url),"utf8");
assert.match(html,/createV46TenantPathResolver\\(\\{verifiedSchoolId:verified\\.schoolId/);
assert.equal((html.match(/tenantPaths\\.collection\\(kind\\)/g)||[]).length,2);
assert.doesNotMatch(html,/schoolCollectionPath\\(schoolId,kind\\)/);
assert.match(html,/verifyV47BrowserMembership\(\{schoolId,uid:user\.uid,school:school\.data\(\),member:member\.data\(\)\}\)/);
assert.equal((html.match(/verifyV47BrowserMembership\\(\\{schoolId,uid:user\\.uid,school:/g)||[]).length,4,"Membership must be verified on initial load, before and after pagination, and final render");
assert.doesNotMatch(html,/validRoles\\(/,"No weaker alternate membership checks allowed");
const schoolId="school_2083_a",uid="teacher_user";
const school={schoolId,status:"active"};
const member={schoolId,uid,active:true,roles:["viewer"]};
assert.equal(verifyV47BrowserMembership({schoolId,uid,school,member}).readOnly,true);
for(const bad of [
 {school:{...school,schoolId:"school_2083_b"}},
 {school:{...school,status:"pending"}},
 {member:{...member,schoolId:"school_2083_b"}},
 {member:{...member,uid:"other_user"}},
 {member:{...member,active:false}},
 {member:{...member,roles:["viewer","school_admin"]}},
 {member:{...member,roles:["viewer","viewer"]}},
 {member:{...member,roles:[]}},
 {member:{...member,roles:["unknown"]}}
]){
 assert.throws(()=>verifyV47BrowserMembership({schoolId,uid,school,member,...bad}),/School access not verified/);
}
const kinds=html.match(/const PREVIEW_KINDS=\[([^\]]+)\]/);
assert.ok(kinds);
assert.doesNotMatch(kinds[1],/public_results|user_roles|audit_logs/);
assert.ok(html.includes('beforePage.roles.join(",")!==verified.roles.join(",")'));
assert.ok(html.includes('afterPage.roles.join(",")!==verified.roles.join(",")'));
console.log("V47 workspace verified identity, role, and sensitive collection exclusion");
