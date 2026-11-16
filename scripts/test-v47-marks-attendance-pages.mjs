import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const builder=read("scripts/build-v47-spark-staging.mjs");
for(const kind of ["marks","attendance"]){
 const path="prototypes/v47/spark-school-"+kind+".html",html=read(path);
 assert.ok(builder.includes(path),"staging includes "+kind);
 assert.ok(html.includes('schoolCollectionPath(id,"'+kind+'")'));
 assert.ok(html.includes("verifyV47BrowserMembership({schoolId:id,uid:user.uid,school:s.data(),member:m.data()})"));
 assert.ok(html.includes("createV46BrowserTenantGateway({"));
 assert.ok(html.includes("tenantRecords.listPage({pageSize:20,cursor})"));
 assert.ok(html.includes("const after=await verify(id,user)"));
 assert.ok(html.includes('after.roles.join(",")!==before.roles.join(",")'));
 assert.ok(html.includes('td.textContent=String(value)'));
 assert.ok(html.includes('config.projectId!=="smss-exam-portal-v47"'));
 assert.ok(html.includes('entryForm.addEventListener("submit"'));
 assert.ok(html.includes('await addDoc(collection(db,schoolCollectionPath(id,"'+kind+'")),payload)'));
 assert.ok(html.includes('if(token!==epoch||auth.currentUser?.uid!==user.uid)throw Error("School selection changed")'));
 assert.ok(html.includes('entryPanel.hidden=!canEnter'));
 assert.ok(html.includes('canEnter=!access.roles.includes("viewer")'));
 assert.ok(html.includes('entryForm.querySelector(\'button[type="submit"]\')'));
 assert.ok(html.includes('<button type="submit">Save '));
 assert.ok(html.includes("if(!studentGateway)studentGateway=createV46BrowserTenantGateway({"));
 assert.ok(html.includes("studentGateway.listPage({pageSize:50,cursor:studentCursor})"));
 assert.ok(html.includes("option.dataset.classId="));
 assert.ok(html.includes("selectedClass!==classId"));
 assert.ok(html.includes('getDoc(doc(db,"schools",id,"students",studentId))'));
 assert.ok(html.includes('selectedStudent.data().classId!==classId'));
 assert.ok(html.includes("studentLoading=true"));
 assert.ok(html.includes("studentGateway=null;studentCursor=null"));
 assert.ok(html.includes("studentChoice.addEventListener(\"change\""));
 assert.ok(html.includes('before.roles.includes("viewer")'));
 assert.doesNotMatch(html,/exam-portal-smss-95016|updateDoc\(|setDoc\(|deleteDoc\(/);
 if(kind==="marks"){
  assert.ok(html.includes('access.roles.includes("subject_teacher")'));
  assert.ok(html.includes("Number.isFinite(payload.score)"));
  assert.ok(html.includes("payload.score>100"));
  assert.ok(html.includes('subjectChoice.value!==payload.subjectId'));
  assert.ok(html.includes('subjectGateway.listPage({pageSize:50,cursor:subjectCursor})'));
  assert.ok(html.includes('schoolCollectionPath(id,"subjects")'));
  assert.ok(html.includes('subjectChoice.replaceChildren(...options)'));
  assert.ok(html.includes('void loadSubjectsForEntry()'));
 }else{
  assert.ok(html.includes('access.roles.includes("class_teacher")'));
  assert.ok(html.includes('present:fields.get("present")==="true"'));
 }
}
console.log("V47 marks and attendance tenant-scoped write/read UI static checks passed");
