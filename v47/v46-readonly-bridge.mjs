// V47 staging: reuse V46 read-only data views with V47 Firebase Auth and Firestore.
// No legacy V46 config, admin UID, raw writes or automatic data migration.
import {createVerifiedTenantContext} from './verified-tenant-context.mjs';
import {createVerifiedTenantFirestore} from './verified-tenant-firestore.mjs';
import {prepareV46ReportSnapshot} from './v46-report-snapshot.mjs';
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
 const loadExamReportInputs=async()=>{
  const [students,subjects,exams,marks,markSettings]=await Promise.all([
   records.listAll('students'),records.listAll('subjects'),records.listAll('exams'),
   records.listAll('marks'),records.listAll('mark_settings')
  ]);
  await context.revalidateRead();
  return Object.freeze({schoolId:context.schoolId,students,subjects,exams,marks,markSettings});
 };
 return Object.freeze({schoolId:context.schoolId,role:context.role,uid:context.uid,
  // Read-only parity endpoints for V46 school reports, branding and ledgers.
  listClasses:()=>records.list('classes'),
  listMarkSettings:()=>records.list('mark_settings'),
  listCertificates:()=>records.list('certificates'),
  listPublicResultExams:()=>records.list('public_result_exams'),
  listPublicResultLookup:()=>records.list('public_result_lookup'),
  listPublicResults:()=>records.list('public_results'),
  listSchoolGallery:()=>records.list('school_gallery'),
  listSchoolPublicBranding:()=>records.list('school_public_branding'),
  listStudents:()=>records.list('students'),
  listStaff:()=>records.list('staff'),
  listSubjects:()=>records.list('subjects'),
  listExams:()=>records.list('exams'),
  listAttendance:()=>records.list('attendance'),
  listMarks:()=>records.list('marks'),
  // Raw school-scoped inputs for future V46 ledger/grade-sheet rendering.
  // No GPA calculation or official result publication occurs here.
  loadExamReportInputs,
  // Pagination now reads all pages or rejects on document cap. Publication remains
  // disabled until V46 CDC/IEMIS calculations and full-class save are verified.
  loadExamReportRows:async()=>Object.freeze({...prepareV46ReportSnapshot(await loadExamReportInputs()),complete:false,publicationAllowed:false}),
  // V46 report views can retrieve individual tenant-scoped records without writes.
  getMark:id=>records.get('marks',id),
  getExam:id=>records.get('exams',id),
  getSubject:id=>records.get('subjects',id),
  getAttendance:id=>records.get('attendance',id),
  getMarkSettings:id=>records.get('mark_settings',id),
  getSchoolSettings:id=>records.get('school_settings',id),
  getStudent:id=>records.get('students',id),
  getStaff:id=>records.get('staff',id)
 });
}
