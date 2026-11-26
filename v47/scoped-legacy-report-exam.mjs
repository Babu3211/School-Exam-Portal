// Resolve historical identity only within the already authorized school. Never
// merge exams that share a term, or treat a migrated exam as a canonical term ID.
import {validateSchoolId} from './school-paths.mjs';
const key={ '1st':'first','2nd':'second','3rd':'third',final:'annual' };
export async function resolveScopedReportExam({schoolId,classNo,term,records,readDocument,assertCurrent}){
 validateSchoolId(schoolId);
 if(!/^(?:[1-9]|10)$/.test(classNo)||!Object.hasOwn(key,term)||!Array.isArray(records)||typeof readDocument!=='function'||typeof assertCurrent!=='function')throw Error('Invalid report scope');
 assertCurrent();
 const ids=new Set();
 for(const r of records){
  if(!r||r.schoolId!==schoolId||r.class!==classNo||r.term!==term||typeof r.examId!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(r.examId))throw Error('Foreign or invalid exam record');
  ids.add(r.examId);
 }
 if(ids.size>1)throw Error('Multiple exams in this class and term; explicit exam selection required');
 const examId=ids.values().next().value??term;
 if(examId===term)return term; // Existing V47 canonical term path unchanged.
 const exam=await readDocument('schools/'+schoolId+'/exams/'+examId);assertCurrent();
 if(!exam||exam.schoolId!==schoolId||exam.class!==classNo||String(exam.academicYear)!=='2083'||exam.term!==term||exam.termKey!==key[term]||exam.active===false)throw Error('Historical exam identity or academic year not verified');
 if(records.some(r=>String(r.academicYear)!=='2083'||r.termKey!==key[term]))throw Error('Historical marks year or term mismatch');
 return examId;
}
