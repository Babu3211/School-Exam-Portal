// Firebase SDK adapter for authenticated, read-only student import preview.
// Requires the V47 app to supply its already initialized auth and firestore.
import {previewAgainstSchoolStudents} from './verified-student-import-preview.mjs';
import {assertIemisSchoolId} from './iemis-school-identity.mjs';
export async function previewFirebaseSchoolStudents({auth,firestore,schoolId,rows}={}){
 assertIemisSchoolId(schoolId);
 if(!auth?.currentUser?.uid||!firestore)throw new Error('Firebase sign-in required');
 const {doc,getDoc,collection,getDocs}=await import('firebase/firestore');
 return previewAgainstSchoolStudents({auth,schoolId,rows,
  readDocument:async path=>{
   const snap=await getDoc(doc(firestore,...path.split('/')));
   return snap.exists()?snap.data():null;
  },
  readStudents:async ({path})=>{
   const snap=await getDocs(collection(firestore,...path));
   // A query snapshot must be complete; never use a paginated subset for duplicate detection.
   return snap.docs.map(item=>item.data());
  }
 });
}
