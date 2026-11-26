// Resolve historical identity only within the already authorized school. Never
// merge exams that share a term, or treat a migrated exam as a canonical term ID.
import {validateSchoolId} from './school-paths.mjs';
import {verifySchoolSession} from './verified-school-session.mjs';
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


// Historical identities remain separate. Only the verified school/class/term/year
// may contribute an exam option. Never infer a new exam or publish any result.
export async function listScopedReportExams({db,api,actor,schoolId,classNo,term,assertCurrent}){
 validateSchoolId(schoolId);
 if(actor?.schoolId!==schoolId||actor.active!==true||!['school_admin','viewer','teacher'].includes(actor.role)||!/^(?:[1-9]|10)$/.test(classNo)||!Object.hasOwn(key,term)||typeof assertCurrent!=='function')throw Error('Invalid verified exam selection');
 const {uid,role}=actor;
 const check=()=>{assertCurrent();if(actor.uid!==uid||actor.role!==role||actor.schoolId!==schoolId||actor.active!==true)throw Error('Exam selection session changed')};
 const verify=async()=>{check();const s=await verifySchoolSession({schoolId,uid,readDocument:async path=>{const snap=await api.getDocFromServer(api.doc(db,...path.split('/')));check();return snap.exists()?snap.data():null}});check();if(s.role!==role)throw Error('Exam selection role changed')};
 await verify();
 const q=api.query(api.collection(db,'schools',schoolId,'exams'),api.where('class','==',classNo),api.where('term','==',term),api.limit(101));
 const snap=await api.getDocsFromServer(q);check();
 if(!Array.isArray(snap.docs)||snap.docs.length>100)throw Error('Historical exam selection limit exceeded');
 const seen=new Set(),rows=[];
 for(const doc of snap.docs){
  if(!/^[A-Za-z0-9_-]{1,128}$/.test(doc.id)||seen.has(doc.id)||doc.ref?.path!==undefined&&doc.ref.path!=='schools/'+schoolId+'/exams/'+doc.id)throw Error('Invalid historical exam document');
  seen.add(doc.id);const d=doc.data();
  if(!d||d.schoolId!==schoolId||d.class!==classNo||d.term!==term)throw Error('Foreign historical exam');
  if(String(d.academicYear)!=='2083'||d.active===false)continue;
  if(d.termKey!==key[term]||Object.hasOwn(key,doc.id))throw Error('Invalid historical exam identity');
  rows.push(Object.freeze({id:doc.id,label:String(d.examName??d.name??d.title??doc.id)}));
 }
 await verify();check();return Object.freeze(rows);
}
