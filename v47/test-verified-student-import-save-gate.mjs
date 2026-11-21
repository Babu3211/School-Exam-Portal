import assert from 'node:assert/strict';
import {previewAgainstSchoolStudents} from './verified-student-import-preview.mjs';
import {prepareVerifiedStudentSave,isVerifiedStudentSavePlan} from './verified-student-import-save-gate.mjs';
const schoolId='300160003',uid='admin-1';
const auth={currentUser:{uid}};
const rows=[{'IEMIS Code':schoolId,'Student IEMIS Id':'00001','Student Name':'Student A','Class':'6'},
 {'IEMIS Code':schoolId,'Student IEMIS Id':'00002','Student Name':'Student B','Class':'6'}];
const readDocument=async path=>path==='schools/'+schoolId?{id:schoolId,active:true}:path==='schools/'+schoolId+'/members/'+uid?{uid,schoolId,role:'school_admin',active:true}:null;
const readStudents=async()=>[{schoolId,studentIemisId:'00001'}];
const verifiedPreview=await previewAgainstSchoolStudents({auth,schoolId,rows,readDocument,readStudents});
const args={auth,schoolId,rows,verifiedPreview,readDocument};
await assert.rejects(prepareVerifiedStudentSave(args),/Admin confirmation/);
await assert.rejects(prepareVerifiedStudentSave({...args,confirmed:true,verifiedPreview:{...verifiedPreview}}),/Fresh verified/);
await assert.rejects(prepareVerifiedStudentSave({...args,confirmed:true,schoolId:'999999999'}),/Fresh verified/);
const otherAuth={currentUser:{uid:'admin-2'}};
const otherReadDocument=async path=>path==='schools/'+schoolId?{id:schoolId,active:true}:
 path==='schools/'+schoolId+'/members/admin-2'?{uid:'admin-2',schoolId,role:'school_admin',active:true}:null;
await assert.rejects(prepareVerifiedStudentSave({...args,auth:otherAuth,readDocument:otherReadDocument,confirmed:true}),/another account/);
const prepared=await prepareVerifiedStudentSave({...args,confirmed:true});
assert.equal(isVerifiedStudentSavePlan(prepared),true);
assert.equal(isVerifiedStudentSavePlan({...prepared}),false);
const planNow=Date.now;
try {
 Date.now=()=>planNow()+5*60*1000+1;
 assert.equal(isVerifiedStudentSavePlan(prepared),false);
} finally {Date.now=planNow}
assert.equal(prepared.count,1);
assert.equal(prepared.records[0]['Student IEMIS Id'],'00002');
assert.equal(prepared.requiresTransactionalDuplicateRecheck,true);
const emptyRows=[{'IEMIS Code':schoolId,'Student IEMIS Id':'00001','Student Name':'Student A','Class':'6'}];
const emptyPreview=await previewAgainstSchoolStudents({auth,schoolId,rows:emptyRows,readDocument,readStudents});
await assert.rejects(prepareVerifiedStudentSave({auth,schoolId,rows:emptyRows,verifiedPreview:emptyPreview,readDocument,confirmed:true}),/No new students/);
const oversizedRows=Array.from({length:401},(_,i)=>({'IEMIS Code':schoolId,'Student IEMIS Id':String(10000+i),'Student Name':'Student '+i,'Class':'6'}));
const oversizedPreview=await previewAgainstSchoolStudents({auth,schoolId,rows:oversizedRows,readDocument,readStudents});
await assert.rejects(prepareVerifiedStudentSave({auth,schoolId,rows:oversizedRows,verifiedPreview:oversizedPreview,readDocument,confirmed:true}),/maximum 400/);
const switchedAuth={currentUser:{uid}};
const switchedPreview=await previewAgainstSchoolStudents({auth:switchedAuth,schoolId,rows,readDocument,readStudents});
await assert.rejects(prepareVerifiedStudentSave({auth:switchedAuth,schoolId,rows,verifiedPreview:switchedPreview,confirmed:true,readDocument:async path=>{switchedAuth.currentUser={uid:'other'};return readDocument(path)}}),/Authentication changed/);
const originalNow=Date.now;
try{
 Date.now=()=>originalNow()+5*60*1000+1;
 await assert.rejects(prepareVerifiedStudentSave({...args,confirmed:true}),/Fresh verified/);
}finally{Date.now=originalNow}
const revokedDocument=async path=>path.endsWith('/members/'+uid)?{uid,schoolId,role:'school_admin',active:false}:readDocument(path);
await assert.rejects(prepareVerifiedStudentSave({...args,confirmed:true,readDocument:revokedDocument}),/Membership unavailable/);
const teacherDocument=async path=>path.endsWith('/members/'+uid)?{uid,schoolId,role:'teacher',active:true}:readDocument(path);
await assert.rejects(prepareVerifiedStudentSave({...args,confirmed:true,readDocument:teacherDocument}),/administrator membership/);
rows[1]['Student Name']='Changed';
await assert.rejects(prepareVerifiedStudentSave({...args,confirmed:true}),/Fresh verified/);
console.log('PASS: verified import save gate rejects unconfirmed, forged, cross-school and changed rows');
