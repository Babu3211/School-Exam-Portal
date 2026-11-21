import assert from 'node:assert/strict';
import {previewAgainstSchoolStudents,isVerifiedCloudPreview} from './verified-student-import-preview.mjs';
const schoolId='300160003',uid='admin-1';
const auth={currentUser:{uid}};
const rows=[{'IEMIS Code':schoolId,'Student IEMIS Id':'00001','Student Name':'सीता','Class':'6'},{'IEMIS Code':schoolId,'Admission Number':'A-2','Student Name':'गीता','Class':'LKG'},{'IEMIS Code':schoolId,'Student IEMIS Id':'00003','Student Name':'राम','Class':'UKG'}];
const readDocument=async path=>path==='schools/'+schoolId?{id:schoolId,active:true}:path==='schools/'+schoolId+'/members/'+uid?{uid,schoolId,role:'school_admin',active:true}:null;
const readStudents=async ({path,schoolId:scope,uid:reader})=>{
 assert.deepEqual(path,['schools',schoolId,'students']);assert.equal(scope,schoolId);assert.equal(reader,uid);
 return [{schoolId,studentIemisId:'00001',admissionNumber:'A-2'}];
};
const result=await previewAgainstSchoolStudents({auth,schoolId,rows,readDocument,readStudents});
assert.equal(result.cloudChecked,true);
assert.equal(isVerifiedCloudPreview(result,rows),true);
assert.equal(isVerifiedCloudPreview(result,[...rows]),false);
const originalNow=Date.now;
try{Date.now=()=>originalNow()+5*60*1000+1;assert.equal(isVerifiedCloudPreview(result,rows),false)}finally{Date.now=originalNow}
assert.equal(isVerifiedCloudPreview(result,rows),true);
const alteredRows=rows.map(row=>({...row}));
const altered=await previewAgainstSchoolStudents({auth,schoolId,rows:alteredRows,readDocument,readStudents});
assert.equal(isVerifiedCloudPreview(altered,alteredRows),true);
alteredRows[0]['Student Name']='Changed';
assert.equal(isVerifiedCloudPreview(altered,alteredRows),false);assert.equal(result.existingCount,1);
assert.equal(result.preview.ready,1);assert.equal(result.preview.skipped,2);
assert.equal(result.preview.records[0].status,'skip');assert.equal(result.preview.records[1].status,'skip');
await assert.rejects(previewAgainstSchoolStudents({auth,schoolId,rows,readDocument,readStudents:async()=>[{schoolId:'999999999',studentIemisId:'00001'}]}),/Cross-school/);
await assert.rejects(previewAgainstSchoolStudents({auth,schoolId,rows,readDocument,readStudents:async()=>({docs:[]})}),/Complete student array/);
await assert.rejects(previewAgainstSchoolStudents({auth,schoolId,rows,readDocument,readStudents:null}),/reader required/);
const legacyRows=[{'IEMIS Code':schoolId,'Student IEMIS Id':'00099','Student Name':'Legacy','Class':'6'}];
const legacy=await previewAgainstSchoolStudents({auth,schoolId,rows:legacyRows,readDocument,
 readStudents:async()=>[{schoolId,studentIemisNo:'00099'}]});
assert.equal(legacy.preview.ready,0);
assert.equal(legacy.preview.skipped,1);
assert.match(legacy.preview.records[0].errors.join(' '),/already exists/);
const teacherAuth={currentUser:{uid:'teacher-1'}};
const teacherDocs=async path=>path==='schools/'+schoolId?{id:schoolId,active:true}:path==='schools/'+schoolId+'/members/teacher-1'?{uid:'teacher-1',schoolId,role:'teacher',active:true}:null;
await assert.rejects(previewAgainstSchoolStudents({auth:teacherAuth,schoolId,rows,readDocument:teacherDocs,readStudents}),/administrator membership/);
const switched={currentUser:{uid}};
await assert.rejects(previewAgainstSchoolStudents({auth:switched,schoolId,rows,readDocument,readStudents:async params=>{switched.currentUser={uid:'other'};return readStudents(params)}}),/Authentication changed/);
console.log('PASS: authenticated school-only preview; IEMIS and admission duplicates; cross-school, teacher, pagination and session rejection');
