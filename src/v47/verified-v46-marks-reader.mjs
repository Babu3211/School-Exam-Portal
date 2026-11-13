/**
 * Server-only V46 marks reader. School selection is untrusted until
 * Firebase token + active school membership are verified.
 * The query gateway must be an Admin SDK-backed, read-only implementation.
 */
import {loadVerifiedSchoolSession} from "./verified-school-session.mjs";
import {readV46MarksForSchool} from "./v46-marks-query-adapter.mjs";
export async function readVerifiedV46SchoolMarks({
 idToken,schoolId,className,subject,section="",auth,firestore,gateway
}) {
 const session=await loadVerifiedSchoolSession({idToken,schoolId,auth,firestore});
 if(!session || session.schoolId!==schoolId) throw new Error("School membership verification failed");
 return readV46MarksForSchool({schoolId:session.schoolId,className,subject,section,gateway});
}
