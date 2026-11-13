/** Server-only V46 batch attendance reader; no writes or V46 production changes. */
import {loadVerifiedSchoolSession} from "./verified-school-session.mjs";
import {schoolResourcePath} from "./school-data-paths.mjs";
export async function readVerifiedV46Attendance({
 idToken,schoolId,className,date,attendanceType="daily",auth,firestore
}) {
 if(typeof className!=="string" || !className.trim() ||
    typeof date!=="string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    typeof attendanceType!=="string" || !attendanceType.trim())
  throw new TypeError("Invalid attendance filters");
 const session=await loadVerifiedSchoolSession({idToken,schoolId,auth,firestore});
 if(session.schoolId!==schoolId) throw new Error("School membership verification failed");
 if(typeof firestore.collection!=="function") throw new TypeError("Firestore Admin SDK required");
 const snapshot=await firestore.collection(schoolResourcePath(session.schoolId,"attendance"))
  .where("className","==",className)
  .where("date","==",date)
  .where("attendanceType","==",attendanceType)
  .get();
 return snapshot.docs.map(doc=>({...doc.data(),id:doc.id}));
}
