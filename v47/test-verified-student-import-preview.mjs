import assert from 'node:assert/strict';
import {previewAgainstSchoolStudents} from './verified-student-import-preview.mjs';
const schoolId='300160003';
const auth={currentUser:{uid:'admin-1'}};
const rows=[{'IEMIS Code':schoolId,'Student IEMIS Id':'00001','Student Name':'सीता','Class':'6'},{'IEMIS Code':schoolId,'Admission Number':'A-2','Student Name':'गीता','Class':'LKG'}];
const readDocument=async()=>{throw new Error('Preflight document reader fixture must be provided by verified-school-session contract')};
assert.rejects(previewAgainstSchoolStudents({auth,schoolId,rows,readDocument,readStudents:async()=>[]}),/Preflight document reader fixture/);
assert.rejects(previewAgainstSchoolStudents({auth,schoolId,rows,readDocument,readStudents:null}),/reader required/);
console.log('PASS: read-only school preview fails closed when verified session cannot be established');
