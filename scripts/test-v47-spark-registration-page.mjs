import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const html=readFileSync(new URL("../prototypes/v47/spark-school-registration.html",import.meta.url),"utf8");
for(const expected of ["smss-exam-portal-v47","checkSparkPlatformAdmin","bootstrapSparkSchool","activateSparkSchool","enrollSparkSchoolMember","createSparkTeacherAssignment","assignment-form","setSparkSchoolMemberActive","member-status-form","member-status-save","school-admin-check","members-panel","members-list","refresh-members","getDocs","collection","refreshMembers","Manage access","scrollIntoView","managementAllowed","verifiedSchoolId","hideManagement","member-form","setDoc","activation-form","updateDoc","activationForm.hidden=!authorized","signInWithEmailAndPassword","onAuthStateChanged","schoolAdminUid:auth.currentUser.uid","writeBatch","form.hidden=!authorized"]){
 assert.ok(html.includes(expected),"Missing "+expected);
}
assert.ok(!html.includes("exam-portal-smss-95016"),"No V46 production reference allowed");
assert.ok(!html.includes("firebase-admin"),"No Admin SDK in browser");
console.log("V47 Spark school registration page static safety checks passed");
