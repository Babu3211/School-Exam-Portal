import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const builder=read("scripts/build-v47-spark-staging.mjs");
for(const kind of ["marks","attendance"]){
 const path="prototypes/v47/spark-school-"+kind+".html",html=read(path);
 assert.match(builder,new RegExp(path.replaceAll("/","\\/").replaceAll(".","\\.")));
 assert.ok(html.includes('schoolCollectionPath(id,"'+kind+'")'));
 assert.ok(html.includes('await verify(id,user)'));
 assert.ok(html.includes('m.data().schoolId!==id'));
 assert.ok(html.includes('m.data().uid!==user.uid'));
 assert.ok(html.includes('orderBy("__name__")'));
 assert.ok(html.includes('limit(20)'));
 assert.ok(html.includes('td.textContent=String(value)'));
 assert.ok(html.includes('config.projectId!=="smss-exam-portal-v47"'));
 assert.doesNotMatch(html,/exam-portal-smss-95016|addDoc\(|updateDoc\(|setDoc\(|deleteDoc\(/);
}
console.log("V47 marks and attendance browser isolation static checks passed");
