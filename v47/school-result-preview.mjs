import {validateSchoolId} from './school-paths.mjs';
import {canAccessSchool} from './permissions.mjs';
import {validSchoolClass} from './class-catalog.mjs';
import {validateExamTerm} from './term-catalog.mjs';
import {previewV46SubjectResult} from './v46-result-adapter.mjs';
// Read-only diagnostic bridge. No GPA, result publication, or primary-school mapping.
// It deliberately rejects absent settings and unverified component schemas.
export async function previewSchoolRawMarksWithV46({db,api,actor,schoolId,schoolClass,term,records}){
 validateSchoolId(schoolId);
 if(!canAccessSchool(actor,schoolId,'read'))throw new Error('School membership required');
 if(!validSchoolClass(schoolClass))throw new Error('Invalid class');
 validateExamTerm(term);
 if(term!=='final'||![6,7,8,9,10].includes(Number(schoolClass)))throw new Error('Diagnostic V46 mapping currently limited to final-term Classes 6–10');
 if(!Array.isArray(records)||records.length>1500)throw new Error('Invalid raw marks page');
 if(typeof api?.doc!=='function'||typeof api?.getDoc!=='function')throw new TypeError('Missing Firestore read SDK');
 const cache=new Map(),results=[],seen=new Set();
 for(const record of records){
  if(!record||record.class!==schoolClass||record.term!==term||typeof record.subjectId!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(record.subjectId))throw new Error('Marks outside selected class or term');
  if(typeof record.studentId!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(record.studentId))throw new Error('Invalid student ID');
  const recordKey=record.studentId+':'+record.subjectId;
  if(seen.has(recordKey))throw new Error('Duplicate student and subject mark entry');
  seen.add(recordKey);
  if(record.isAbsent===true)throw new Error('Absent marks require verified V46 absence mapping');
  if(!cache.has(record.subjectId)){
   const snap=await api.getDoc(api.doc(db,'schools',schoolId,'subjects',record.subjectId));
   if(!snap.exists())throw new Error('Missing subject Examination Settings');
   const subject=snap.data();
   if(subject.schoolId!==schoolId||subject.class!==schoolClass||subject.active!==true)throw new Error('Subject is not active for selected school and class');
   if(!(Number.isFinite(subject.theoryFullMarks)&&subject.theoryFullMarks>0&&Number.isFinite(subject.practicalFullMarks)&&subject.practicalFullMarks>0))throw new Error('Diagnostic mapping requires positive numeric theory and internal full marks');
   if(Array.isArray(subject.components)&&subject.components.length)throw new Error('Component-based subject requires its verified IEMIS component mapping');
   cache.set(record.subjectId,subject);
  }
  const subject=cache.get(record.subjectId);
  const components=[{key:'practical',name:'Internal',fullMarks:subject.practicalFullMarks},{key:'theory',name:'TH (Theory)',fullMarks:subject.theoryFullMarks}];
  const summary=previewV46SubjectResult({components,obtained:{practical:record.practical,theory:record.theory},annual:true});
  results.push({studentId:record.studentId,subjectId:record.subjectId,summary});
 }
 return results;
}
