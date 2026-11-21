// Firebase Firestore read adapter for V47 school-scoped student import preview.
// Read-only. The caller provides the Firebase SDK functions to avoid coupling
// this module to a particular bundler/CDN. Rules authorize every read.
import {assertIemisSchoolId} from './iemis-school-identity.mjs';
import {previewAgainstSchoolStudents} from './verified-student-import-preview.mjs';
export function createStudentPreviewFirestoreReaders({firestore,doc,getDoc,collection,getDocs}={}){
 if(!firestore||[doc,getDoc,collection,getDocs].some(fn=>typeof fn!=='function'))throw new TypeError('Firestore instance and document/collection read SDK functions required');
 const readDocument=async path=>{
  if(typeof path!=='string'||!/^schools\/[0-9]{5,20}(?:\/members\/[^/]+)?$/.test(path))throw new Error('Unsupported document read path');
  const snapshot=await getDoc(doc(firestore,...path.split('/')));
  return snapshot.exists()?snapshot.data():null;
 };
 const readStudents=async ({path,schoolId})=>{
  assertIemisSchoolId(schoolId);
  if(!Array.isArray(path)||path.length!==3||path[0]!=='schools'||path[1]!==schoolId||path[2]!=='students')throw new Error('Cross-school collection path rejected');
  const snapshot=await getDocs(collection(firestore,...path));
  if(!snapshot||!Array.isArray(snapshot.docs))throw new TypeError('Complete Firestore query snapshot required');
  return snapshot.docs.map(item=>item.data());
 };
 return Object.freeze({readDocument,readStudents});
}
export async function previewStudentsFromFirestore({auth,schoolId,rows,firestore,sdk}={}){
 const readers=createStudentPreviewFirestoreReaders({firestore,...sdk});
 return previewAgainstSchoolStudents({auth,schoolId,rows,...readers});
}
