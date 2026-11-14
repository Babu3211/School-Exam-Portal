/**
 * Server-only V47 student create/update. No browser direct writes.
 * Requires verified Firebase ID token, active school and school_admin membership.
 * Deliberately limited to safe student profile fields, never bulk replaces data.
 */
import {loadVerifiedSchoolSession} from "./verified-school-session.mjs";
import {schoolRecordPath} from "./school-data-paths.mjs";
const FIELDS=new Set(["name","nameNepali","className","section","rollNo","iemisId","guardianName","guardianPhone"]);
const ID=/^[A-Za-z0-9_-]{1,128}$/;
export async function writeVerifiedStudent({idToken,schoolId,studentId,values,mode,auth,firestore}) {
 if(!["create","update"].includes(mode))throw new TypeError("Invalid write mode");
 if(typeof studentId!=="string" || !ID.test(studentId))throw new TypeError("Invalid student ID");
 if(!values || typeof values!=="object" || Array.isArray(values))throw new TypeError("Student fields required");
 const entries=Object.entries(values);
 if(!entries.length || entries.some(([key,value])=>!FIELDS.has(key) || typeof value!=="string" || value.length>200))
  throw new TypeError("Invalid or privileged student fields");
 if((Object.hasOwn(values,"name") && !values.name.trim()) ||
    (Object.hasOwn(values,"className") && !values.className.trim()))
  throw new TypeError("Student name and class cannot be blank");
 if(mode==="create" && (!values.name?.trim() || !values.className?.trim()))
  throw new TypeError("Student name and class required");
 const session=await loadVerifiedSchoolSession({idToken,schoolId,auth,firestore});
 if(!session.roles.includes("school_admin") || session.roles.includes("viewer"))throw new Error("School admin required for student changes");
 if(typeof firestore?.runTransaction!=="function")throw new TypeError("Admin Firestore transaction required");
 const ref=firestore.doc(schoolRecordPath(session.schoolId,"students",studentId));
 const audit=firestore.collection("schools/"+session.schoolId+"/audit_logs").doc();
 await firestore.runTransaction(async tx=>{
  const school=await tx.get(firestore.doc("schools/"+session.schoolId));
  const member=await tx.get(firestore.doc("schools/"+session.schoolId+"/members/"+session.uid));
  if(!school.exists || school.data()?.status!=="active" || !member.exists || member.data()?.active!==true || member.data()?.uid!==session.uid || member.data()?.schoolId!==session.schoolId || (!member.data()?.roles?.includes("school_admin") || member.data()?.roles?.includes("viewer")))
   throw new Error("School admin authorization changed");
  const current=await tx.get(ref);
  if(mode==="create" && current.exists)throw new Error("Student already exists");
  if(mode==="update" && !current.exists)throw new Error("Student does not exist");
  if(mode==="update" && Object.hasOwn(current.data()||{},"schoolId") &&
     current.data().schoolId!==session.schoolId)
   throw new Error("Student tenant identity mismatch");
  const data=Object.fromEntries(entries.map(([key,value])=>[key,value.trim()]));
  if(mode==="create")tx.create(ref,{...data,schoolId:session.schoolId,createdBy:session.uid});
  else tx.update(ref,{...data,updatedBy:session.uid});
  tx.create(audit,{action:"student_"+mode,schoolId:session.schoolId,studentId,actorUid:session.uid});
 });
 return Object.freeze({schoolId:session.schoolId,studentId,mode});
}
