// V47 staging: reuse V46 read-only data views with V47 Firebase Auth and Firestore.
// No legacy V46 config, admin UID, raw writes or automatic data migration.
import {createVerifiedTenantContext} from './verified-tenant-context.mjs';
import {createVerifiedTenantFirestore} from './verified-tenant-firestore.mjs';
export async function createV46ReadOnlyBridge({schoolId,auth,db,firestoreApi}){
 if(!auth?.currentUser?.uid||!db||!firestoreApi)throw new Error('Authenticated V47 Firebase services required');
 const {doc,getDoc}=firestoreApi;
 if(typeof doc!=='function'||typeof getDoc!=='function')throw new TypeError('Firestore document methods required');
 const readDocument=async path=>{
  const segments=path.split('/');
  if(segments.length!==2&&segments.length!==4)throw new Error('Invalid membership path');
  const snap=await getDoc(doc(db,...segments));
  return snap.exists()?snap.data():null;
 };
 const context=await createVerifiedTenantContext({schoolId,auth,readDocument});
 const records=createVerifiedTenantFirestore({db,api:firestoreApi,context});
 return Object.freeze({schoolId:context.schoolId,role:context.role,uid:context.uid,
  listStudents:()=>records.list('students'),
  listStaff:()=>records.list('staff'),
  listSubjects:()=>records.list('subjects'),
  listExams:()=>records.list('exams'),
  listAttendance:()=>records.list('attendance'),
  listMarks:()=>records.list('marks'),
  getSchoolSettings:id=>records.get('school_settings',id),
  getStudent:id=>records.get('students',id),
  getStaff:id=>records.get('staff',id)
 });
}
