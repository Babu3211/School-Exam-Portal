import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const builder=read("scripts/build-v47-spark-staging.mjs");
for(const kind of ["students","staff","marks","attendance"]){
 const path="prototypes/v47/spark-school-"+kind+".html",html=read(path);
 assert.ok(builder.includes(path),"staging includes "+kind);
 assert.ok(html.includes('schoolCollectionPath(id,"'+kind+'")')||html.includes('tenantRecords.listPage("'+kind+'",{pageSize:20,cursor})'),"tenant collection "+kind);
 assert.ok(html.includes("verifyV47BrowserMembership({schoolId:id,uid:user.uid,school:s.data(),member:m.data()})"),"school membership identity "+kind);
 assert.ok(html.includes("verifyV47BrowserMembership({schoolId:id,uid:user.uid,school:s.data(),member:m.data()})"),"user membership identity "+kind);
 assert.ok(html.includes('if(token===epoch){loading=false;more.disabled=false;}'),"stale request guard "+kind);
 assert.ok(html.includes('td.textContent=String(value)'),"safe text rendering "+kind);
 assert.ok(html.includes('tenantRecords.listPage("'+kind+'",{pageSize:20,cursor})'),"bounded reads "+kind);
 assert.ok(html.includes("createV46VerifiedReadSession({"),"verified school read session "+kind);
 assert.doesNotMatch(html,/createV46BrowserTenantGateway/,"legacy gateway not used directly "+kind);
 assert.doesNotMatch(html,/exam-portal-smss-95016|deleteDoc\(/,"no production access or deletion "+kind);
 if(kind==="staff")assert.doesNotMatch(html,/addDoc\(|updateDoc\(|setDoc\(/,"read-only "+kind);
}
console.log("V47 four school-scoped pages pass static isolation, stale-response and read-only checks");
