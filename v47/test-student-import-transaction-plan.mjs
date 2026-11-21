import assert from 'node:assert/strict';
import {planStudentImportTransaction,isVerifiedStudentTransactionPlan} from './student-import-transaction-plan.mjs';
import {previewAgainstSchoolStudents} from './verified-student-import-preview.mjs';
import {prepareVerifiedStudentSave} from './verified-student-import-save-gate.mjs';
const schoolId='300160003',uid='admin-1';
const auth={currentUser:{uid}};
const rows=[{'IEMIS Code':schoolId,'Student IEMIS Id':'00002','Admission Number':'A-2','Student Name':'Student B','Class':'6'}];
const readDocument=async path=>path==='schools/'+schoolId?{id:schoolId,active:true}:path==='schools/'+schoolId+'/members/'+uid?{uid,schoolId,role:'school_admin',active:true}:null;
const verifiedPreview=await previewAgainstSchoolStudents({auth,schoolId,rows,readDocument,readStudents:async()=>[]});
const prepared=await prepareVerifiedStudentSave({auth,schoolId,rows,verifiedPreview,readDocument,confirmed:true});
const existingStudents=[{schoolId,studentIemisNo:'00001',admissionNo:'A-1'}];
const plan=planStudentImportTransaction({prepared,existingStudents});
const expiredNow=Date.now;
try {
 Date.now=()=>expiredNow()+5*60*1000+1;
 assert.throws(()=>planStudentImportTransaction({prepared,existingStudents}),/Verified prepared import/);
} finally {Date.now=expiredNow}
assert.equal(isVerifiedStudentTransactionPlan(plan),true);
const planNow=Date.now;
try {
 Date.now=()=>planNow()+5*60*1000+1;
 assert.equal(isVerifiedStudentTransactionPlan(plan),false);
} finally {Date.now=planNow}
assert.equal(isVerifiedStudentTransactionPlan(plan),true);
assert.equal(isVerifiedStudentTransactionPlan({...plan}),false);
assert.equal(isVerifiedStudentTransactionPlan(Object.freeze({schoolId,records:plan.records,createOnly:true})),false);
assert.equal(plan.count,1);assert.equal(plan.createOnly,true);assert.equal(plan.transactionRequired,true);
assert.deepEqual(plan.path,['schools',schoolId,'students']);
assert.equal(plan.records[0].schoolId,schoolId);
assert.equal(prepared.records[0].schoolId,undefined);
assert.throws(()=>planStudentImportTransaction({prepared:{...prepared},existingStudents}),/Verified prepared import/);
assert.throws(()=>planStudentImportTransaction({prepared,existingStudents:[{schoolId,studentIemisId:'',studentIemisNo:'00002'}]}),/Duplicate Student IEMIS/);
assert.throws(()=>planStudentImportTransaction({prepared,existingStudents:[{schoolId,studentIemisNo:'00002'}]}),/Duplicate Student IEMIS/);
assert.throws(()=>planStudentImportTransaction({prepared,existingStudents:[{schoolId,studentIemisId:'OTHER',studentIemisNo:'00002'}]}),/Duplicate Student IEMIS/);
assert.throws(()=>planStudentImportTransaction({prepared,existingStudents:[{schoolId,admissionNumber:'OTHER',admissionNo:'A-2'}]}),/Duplicate Admission/);
assert.throws(()=>planStudentImportTransaction({prepared,existingStudents:[{schoolId,admissionNumber:'',admissionNo:'A-2'}]}),/Duplicate Admission/);
assert.throws(()=>planStudentImportTransaction({prepared,existingStudents:[{schoolId,admissionNo:'A-2'}]}),/Duplicate Admission/);
const unicodeRows=[{'IEMIS Code':schoolId,'Student IEMIS Id':'é-101','Admission Number':'A-3','Student Name':'Unicode Student','Class':'6'}];
const unicodePreview=await previewAgainstSchoolStudents({auth,schoolId,rows:unicodeRows,readDocument,readStudents:async()=>[]});
const unicodePrepared=await prepareVerifiedStudentSave({auth,schoolId,rows:unicodeRows,verifiedPreview:unicodePreview,readDocument,confirmed:true});
assert.throws(()=>planStudentImportTransaction({prepared:unicodePrepared,existingStudents:[{schoolId,studentIemisNo:'e\u0301-101'}]}),/Duplicate Student IEMIS/);

assert.throws(()=>planStudentImportTransaction({prepared,existingStudents:[{schoolId:'999999999'}]}),/Cross-school/);
assert.throws(()=>planStudentImportTransaction({prepared:{...prepared,requiresTransactionalDuplicateRecheck:false},existingStudents}),/Verified prepared import/);
console.log('PASS: verified-only create-only student import plan rejects forged plans and fresh duplicates');
