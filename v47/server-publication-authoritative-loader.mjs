// Standalone Firebase Admin SDK reader for the REAL V47 school collections.
// Does not accept browser-submitted roster, marks, membership or settings.
// Not wired to a public HTTP endpoint. No Firebase calls happen at import time.
import {createHash} from 'node:crypto';
import {completeClassDraftId} from './complete-class-draft-document.mjs';
import {verifyStoredCompleteClassDraft} from './restore-complete-class-draft.mjs';
import {isActiveEnrolledStudent} from './student-enrollment-status.mjs';
import {validateConfiguredMarkComponents} from './configured-mark-preflight.mjs';

const schoolPattern=/^[0-9]{5,20}$/;
const segment=/^[A-Za-z0-9_-]{1,128}$/;
const classes=new Set(['ECD','LKG','UKG',...Array.from({length:12},(_,i)=>String(i+1))]);
const validTerms=new Set(['weekly','monthly','1st','2nd','3rd','final']);
const active=s=>typeof s?.exists==='function'?s.exists():s?.exists===true;
const data=s=>active(s)?s.data():null;
function canonical(value){
 if(value===null||value===undefined)return value??null;
 if(Array.isArray(value))return value.map(canonical);
 if(value instanceof Date)return {date:value.toISOString()};
 if(typeof value==='object'){
  if(typeof value.toMillis==='function')return {timestampMillis:value.toMillis()};
  if(typeof value.path==='string')return {referencePath:value.path};
  return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));
 }
 if(typeof value==='number'&&!Number.isFinite(value))throw Error('Non-finite authoritative Firestore number');
 return value;
}
const digest=value=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');

/**
 * Actual V47 layout:
 * schools/{schoolId}, members/{uid}, subjects/{subjectId},
 * mark_settings/{classId_subjectId_examId}, class_mark_drafts/{sameId},
 * and students queried by class, ordered by document ID.
 *
 * A Firestore transaction re-runs exactly the same reader via tx.get. It
 * must fail closed if the class exceeds 1500 records or any record is stale.
 */
export function createAdminClassPublicationReaders({
 firestore,schoolId,classId,subjectId,examId,actorUid
}){
 if(typeof schoolId!=='string'||!schoolPattern.test(schoolId)||
    !classes.has(classId)||typeof subjectId!=='string'||!segment.test(subjectId)||
    !validTerms.has(examId)||typeof actorUid!=='string'||!segment.test(actorUid))
  throw Error('Verified numeric school, class, subject, exam and admin UID required');
 if(typeof firestore?.doc!=='function'||typeof firestore?.collection!=='function'||
    typeof firestore?.runTransaction!=='function')
  throw TypeError('Isolated Firebase Admin Firestore required');
 const draftId=completeClassDraftId({classId,subjectId,examId});
 const path=(...parts)=>['schools',schoolId,...parts].join('/');
 const refs={
  school:firestore.doc(path()),member:firestore.doc(path('members',actorUid)),
  subject:firestore.doc(path('subjects',subjectId)),
  settings:firestore.doc(path('mark_settings',draftId)),
  draft:firestore.doc(path('class_mark_drafts',draftId))
 };
 const schoolCollection=firestore.collection(path('students'));
 if(typeof schoolCollection?.where!=='function')throw TypeError('Admin school student query required');
 const rosterQuery=schoolCollection.where('class','==',classId).orderBy('__name__').limit(1501);
 const requireScope=(args,full)=>{
  if(args?.schoolId!==schoolId||args?.uid!==actorUid||
     (full&&(args.classId!==classId||args.subjectId!==subjectId||args.examId!==examId)))
   throw Error('Cross-school or wrong-class publication source request');
 };
 const checkAdmin=(school,member)=>{
  if(school?.active!==true||school.id!==schoolId||
     member?.schoolId!==schoolId||member.uid!==actorUid||
     member.role!=='school_admin'||member.active!==true)
   throw Error('Active verified School Admin and school required');
  return {uid:actorUid,schoolId,role:'school_admin',active:true};
 };
 const load=async(get)=>{
  const school=data(await get(refs.school));
  const member=data(await get(refs.member));
  const actor=checkAdmin(school,member);
  const subject=data(await get(refs.subject));
  if(subject?.schoolId!==schoolId||subject.class!==classId||
     subject.active!==true)throw Error('Verified active subject required');
  const rawSettings=data(await get(refs.settings));
  if(rawSettings?.schoolId!==schoolId||rawSettings.id!==draftId||
     rawSettings.classId!==classId||rawSettings.subjectId!==subjectId||
     rawSettings.examId!==examId)
   throw Error('Authoritative Examination Settings missing or mismatched');
  const settings={...rawSettings,settingsId:draftId};
  validateConfiguredMarkComponents(settings,{schoolId,classId,subjectId,examId});
  const saved=data(await get(refs.draft));
  const roster=await get(rosterQuery);
  if(!Array.isArray(roster?.docs)||roster.docs.length<1||roster.docs.length>1500)
   throw Error('Authoritative class roster empty or exceeds 1500-student limit');
  const ids=[],students=[];
  for(const student of roster.docs){
   if(typeof student.id!=='string'||!segment.test(student.id)||!active(student)||
      student.ref?.path!==path('students',student.id))
    throw Error('Unverified student document in class roster');
   const record=student.data();
   if(!record||record.schoolId!==schoolId||record.class!==classId||
      !isActiveEnrolledStudent(record)||
      (ids.length&&student.id<=ids.at(-1)))
    throw Error('Out-of-order, inactive or cross-school student in roster');
   ids.push(student.id);
   students.push({id:student.id,record});
  }
  // Hard stop on very large roster payloads before hashing and transaction
  // retries: Firestore transactions also have an overall document size limit.
  if(Buffer.byteLength(JSON.stringify(canonical(students)),'utf8')>5_000_000)
   throw Error('Authoritative roster too large for safe transaction');
  const restored=verifyStoredCompleteClassDraft({
   schoolId,classId,subjectId,examId,settings,expectedStudentIds:ids,stored:saved
  });
  const drafts=restored.entries.map(row=>row.isAbsent
   ?{studentId:row.studentId,isAbsent:true}
   :{studentId:row.studentId,isAbsent:false,values:{...row.values}});
  return {
   schoolId,classId,subjectId,examId,actor,settings,expectedStudentIds:ids,drafts,
   // Draft revision is intentionally included so even a same-value re-save
   // cannot silently reuse a previously confirmed publication review.
   settingsRevision:'s'+digest({settings:rawSettings,draftRevision:restored.revision}),
   rosterRevision:'r'+digest(students)
  };
 };
 const verifyAdmin=async args=>{
  requireScope(args,false);
  const school=data(await refs.school.get());
  const member=data(await refs.member.get());
  const actor=checkAdmin(school,member);
  return {...actor,schoolActive:true};
 };
 const loadAuthoritative=async args=>{
  requireScope(args,false);
  return load(ref=>ref.get());
 };
 const loadTransactionalAuthoritative=async args=>{
  requireScope(args,true);
  if(typeof args?.transaction?.get!=='function')throw TypeError('Trusted Admin transaction required');
  return load(ref=>args.transaction.get(ref));
 };
 // The adapter intentionally uses Admin SDK methods, not the Firebase client
 // SDK. It enables the existing verified preflight/staging/commit modules.
 const api=Object.freeze({
  doc:(_db,...parts)=>firestore.doc(parts.join('/')),
  getDoc:ref=>ref.get(),
  runTransaction:(_db,handler)=>firestore.runTransaction(handler)
 });
 return Object.freeze({
  db:firestore,api,verifyAdmin,loadAuthoritative,loadTransactionalAuthoritative,
  schoolId,classId,subjectId,examId,actorUid
 });
}
