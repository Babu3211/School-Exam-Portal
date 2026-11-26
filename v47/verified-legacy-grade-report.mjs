// Authenticated, bounded V47 class report reader; never writes or publishes marks.
// Incompatible raw marks produce an explicit error rather than fabricated V46 GPA.
import {verifySchoolSession} from './verified-school-session.mjs';
import {loadCompleteClassRoster} from './complete-class-roster.mjs';
import {loadAllClassMarks} from './complete-class-marks-query.mjs';
import {prepareLegacyGradeReport} from './legacy-grade-report-preview.mjs';
import {validateSchoolId} from './school-paths.mjs';
import {resolveScopedReportExam} from './scoped-legacy-report-exam.mjs';
export async function loadVerifiedLegacyGradeReport({db,api,auth,actor,schoolId,classNo,term,readDocument,assertCurrent,onProgress=()=>{}}){
 validateSchoolId(schoolId);
 if(typeof assertCurrent!=='function'||typeof readDocument!=='function'||typeof onProgress!=='function')throw TypeError('Verified report callbacks required');
 const uid=auth?.currentUser?.uid;
 if(!uid||actor?.uid!==uid||actor?.schoolId!==schoolId)throw Error('Verified school sign-in required');
 const check=()=>{assertCurrent();if(auth.currentUser?.uid!==uid)throw Error('Authentication changed during report load')};
 check();
 const before=await verifySchoolSession({schoolId,uid,readDocument});check();
 if(before.role!==actor.role)throw Error('School role changed');
 if(!/^(?:[1-9]|10)$/.test(String(classNo))||!['1st','2nd','3rd','final'].includes(term))throw Error('Only verified V46 IEMIS class and term preview supported');
 const school=await readDocument('schools/'+schoolId);check();
 if(!school||school.id!==schoolId||school.active!==true)throw Error('School inactive');
 const profile=await readDocument('schools/'+schoolId+'/school_settings/profile');check();
 if(profile&&profile.schoolId!==schoolId)throw Error('Cross-school profile blocked');
 const branding={nameEnglish:profile?.nameEnglish||school.name,nameNepali:profile?.nameNepali||'',addressEnglish:profile?.addressEnglish||'',addressNepali:profile?.addressNepali||''};
 const roster=await loadCompleteClassRoster({db,api,actor,schoolId,classId:String(classNo)});check();
 onProgress('Full class roster: '+roster.count+' students');
 const response=await api.getDocs(api.query(api.collection(db,'schools',schoolId,'subjects'),
   api.where('class','==',String(classNo)),api.orderBy('__name__'),api.limit(31)));check();
 if(!Array.isArray(response?.docs)||response.docs.length<1||response.docs.length>30)throw Error('Complete class subject catalog unavailable or over 30 subjects');
 const subjects=response.docs.map(doc=>({...doc.data(),id:doc.id}));
 if(subjects.some(s=>s.schoolId!==schoolId||s.class!==String(classNo)))throw Error('Foreign or wrong-class subject');
 onProgress('Class subjects: '+subjects.length);
 const marks=await loadAllClassMarks({db,api,actor,schoolId,schoolClass:String(classNo),term,maxRecords:30000});check();
 onProgress('Read-only V46-compatible marks: '+marks.count+' records');
 const examId=await resolveScopedReportExam({schoolId,classNo:String(classNo),term,records:marks.records,readDocument,assertCurrent:check});check();
 const after=await verifySchoolSession({schoolId,uid,readDocument});check();
 if(after.role!==before.role)throw Error('School membership changed during report load');
 const result=prepareLegacyGradeReport({schoolId,school:branding,classNo:String(classNo),term,examId,students:roster.students,subjects,records:marks.records});
 check();
 return result;
}
