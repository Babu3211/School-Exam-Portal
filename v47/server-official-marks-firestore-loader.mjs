// Trusted Firebase Admin SDK reader for committed V47 class marks.
// Never accepts browser-provided marks, memberships, pointers or staging pages.
// Not a public API and never touches V46; release remains blocked.
import {officialClassPointerId} from './server-publication-authoritative-preflight.mjs';
import {resolveOfficialClassMarks} from './server-official-marks-reader.mjs';

const schoolIdPattern=/^[0-9]{5,20}$/;
const segment=/^[A-Za-z0-9_-]{1,128}$/;
const publicationIdPattern=/^[A-Za-z0-9_-]{8,128}$/;
const classes=new Set(['ECD','LKG','UKG',...Array.from({length:12},(_,i)=>String(i+1))]);
const terms=new Set(['weekly','monthly','1st','2nd','3rd','final']);
const exists=s=>typeof s?.exists==='function'?s.exists():s?.exists===true;
const value=s=>exists(s)?s.data():null;
const fieldNames=value=>Object.keys(value).sort().join(',');
const pageFields=['format','schoolId','publicationId','classId','subjectId','examId','digest','index','count','firstStudentId','lastStudentId','entries'].sort().join(',');

/**
 * Reads the school membership, official pointer, publication, audit, manifest
 * and all staged mark pages in one consistent Admin SDK transaction.
 * A Viewer may read, but only within their OWN active school membership.
 * There is no fallback to unfinished staging or browser drafts.
 */
export async function loadCommittedOfficialClassMarks({firestore,schoolId,classId,subjectId,examId,actorUid}){
 if(!schoolIdPattern.test(schoolId??'')||!classes.has(classId)||
    !segment.test(subjectId??'')||!terms.has(examId)||!segment.test(actorUid??''))
  throw new Error('Verified school, class, subject, term and user ID required');
 if(typeof firestore?.doc!=='function'||typeof firestore?.runTransaction!=='function')
  throw new TypeError('Trusted Firebase Admin Firestore required');
 const scope={schoolId,classId,subjectId,examId};
 const ref=(...path)=>firestore.doc(['schools',schoolId,...path].join('/'));
 return firestore.runTransaction(async tx=>{
  if(typeof tx?.get!=='function')throw new TypeError('Trusted read transaction required');
  const school=value(await tx.get(ref()));
  const member=value(await tx.get(ref('members',actorUid)));
  if(school?.active!==true||school.id!==schoolId||
     member?.schoolId!==schoolId||member?.uid!==actorUid||member.active!==true||
     !['school_admin','teacher','viewer'].includes(member.role))
   throw new Error('Active school membership required for official marks');
  const pointerId=officialClassPointerId(scope);
  const pointer=value(await tx.get(ref('official_marks_pointers',pointerId)));
  if(pointer===null)return resolveOfficialClassMarks({...scope,pointer:null,publication:null,entries:[]});
  if(typeof pointer.publicationId!=='string'||!publicationIdPattern.test(pointer.publicationId))
   throw new Error('Unverified official publication ID');
  const publicationId=pointer.publicationId;
  const publication=value(await tx.get(ref('official_marks_publications',publicationId)));
  const audit=value(await tx.get(ref('official_marks_audit',publicationId)));
  const manifest=value(await tx.get(ref('marks_staging',publicationId)));
  if(!publication||!audit||!manifest||
     publication.state!=='committed'||publication.publicationId!==publicationId||
     audit.action!=='official_class_marks_publish'||audit.publicationId!==publicationId||
     audit.approvedBy!==publication.approvedBy||audit.digest!==pointer.digest||
     audit.rosterCount!==pointer.rosterCount||
     publication.digest!==pointer.digest||publication.rosterCount!==pointer.rosterCount||
     !Number.isInteger(publication.batchCount)||publication.batchCount<1||publication.batchCount>15||
     manifest.format!=='smss-v47-verified-staging-manifest-v1'||
     manifest.state!=='staged_verified_not_published'||manifest.publicationId!==publicationId||
     manifest.digest!==pointer.digest||manifest.rosterCount!==pointer.rosterCount||
     manifest.batchCount!==publication.batchCount||
     manifest.writeAuthorized!==false||manifest.publicationAllowed!==false||
     publication.batchCount!==Math.ceil(pointer.rosterCount/100))
   throw new Error('Official publication, audit or verified staging manifest mismatch');
  for(const record of [pointer,publication,audit,manifest]){
   for(const [key,expected] of Object.entries(scope)){
    if(record[key]!==expected)throw new Error('Cross-school official publication scope mismatch');
   }
  }
  const entries=[];
  for(let i=0;i<publication.batchCount;i++){
   const page=value(await tx.get(ref('marks_staging',publicationId,'batches','b'+String(i).padStart(4,'0'))));
   if(!page||fieldNames(page)!==pageFields||
      page.format!=='smss-v47-staged-page-v1'||page.index!==i||
      page.schoolId!==schoolId||page.publicationId!==publicationId||
      page.classId!==classId||page.subjectId!==subjectId||page.examId!==examId||
      page.digest!==pointer.digest||!Array.isArray(page.entries)||
      page.count!==page.entries.length||page.count<1||page.count>100||
      page.firstStudentId!==page.entries[0]?.studentId||
      page.lastStudentId!==page.entries.at(-1)?.studentId)
    throw new Error('Missing, altered or out-of-order official staging page: '+i);
   for(const row of page.entries){
    if(!row||fieldNames(row)!=='isAbsent,studentId,totalObtained,values'||
       (entries.length&&row.studentId<=entries.at(-1).studentId))
     throw new Error('Invalid or out-of-order published student rows');
    entries.push({...row,publicationId});
   }
  }
  return resolveOfficialClassMarks({...scope,pointer,publication,entries});
 });
}
