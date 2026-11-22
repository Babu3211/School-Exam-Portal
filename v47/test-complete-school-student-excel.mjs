import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {collectCompleteSchoolStudentExport,MAX_SCHOOL_STUDENT_EXPORT} from './complete-school-student-excel.mjs';
import {STUDENT_EXCEL_HEADERS} from './v46-student-excel-schema.mjs';
const schoolId='300160003';
let calls=0,checks=0,progress=[];
const pageStore={
 schoolId,async listPage(collection,{pageSize,cursor}){
  assert.equal(collection,'students');assert.equal(pageSize,100);
  const start=cursor?Number(cursor.id.slice(2)):0;
  const amount=Math.min(100,1500-start),records=Array.from({length:amount},(_,i)=>{
   const index=start+i+1;
   return {schoolId,id:'st'+String(index).padStart(6,'0'),name:'Student '+index,studentIemisNo:String(index).padStart(8,'0'),class:'9'};
  });
  calls++;
  return {records,hasMore:start+amount<1500,cursor:records.at(-1)??null};
 }
};
const result=await collectCompleteSchoolStudentExport({store:pageStore,assertSession:()=>{checks++},onProgress:n=>progress.push(n)});
assert.equal(result.count,1500);assert.equal(result.pages,15);
assert.equal(result.rows.length,1500);assert.equal(result.rows[0].length,STUDENT_EXCEL_HEADERS.length);
assert.equal(result.rows[0][3],'00000001');assert.equal(result.rows.at(-1)[3],'00001500');
assert.deepEqual(progress,[100,200,300,400,500,600,700,800,900,1000,1100,1200,1300,1400,1500]);
assert.equal(calls,15);assert(checks>=46);
assert.equal(MAX_SCHOOL_STUDENT_EXPORT,5000);
const scope=async page=>collectCompleteSchoolStudentExport({store:{schoolId,listPage:async()=>page},assertSession:()=>{}});
await assert.rejects(scope({records:[{schoolId:'999999999',id:'s1'}],hasMore:false}),/cross-school/);
await assert.rejects(scope({records:[{schoolId,id:'s1'},{schoolId,id:'s1'}],hasMore:false}),/Duplicate/);
await assert.rejects(scope({records:[],hasMore:true,cursor:{id:'s1'}}),/did not advance/);
await assert.rejects(scope({records:[{schoolId,id:'s1'}],hasMore:true,cursor:null}),/did not advance/);
await assert.rejects(collectCompleteSchoolStudentExport({store:pageStore,assertSession:()=>{},maxRecords:1499}),/5000 students/);
await assert.rejects(collectCompleteSchoolStudentExport({store:pageStore,assertSession:()=>{throw new Error('logout')} }),/logout/);
let changed=false;
const race=await assert.rejects(collectCompleteSchoolStudentExport({store:pageStore,assertSession:()=>{if(changed)throw Error('School changed')},onProgress:()=>{changed=true}}),/School changed/);
let cursorPage=0;
await assert.rejects(collectCompleteSchoolStudentExport({store:{schoolId,async listPage(){cursorPage++;return {records:[{schoolId,id:'s1'}],hasMore:true,cursor:{id:'s1'}}}},assertSession:()=>{}}),/did not advance|cursor order invalid|Duplicate/);
const ui=readFileSync(new URL('./students-console.mjs',import.meta.url),'utf8');
const page=readFileSync(new URL('./students.html',import.meta.url),'utf8');
assert.match(page,/id="exportAllExcel" disabled/);
assert.match(ui,/collectCompleteSchoolStudentExport\(/);
assert.match(ui,/verifySchoolSession\(/);
assert.match(ui,/after\.role!==before\.role/);
assert.match(ui,/records\.map\(studentExcelRow\)/,'Existing loaded Excel export must be preserved');
assert.match(ui,/downloadExcel\(file,'smss-v47-all-students-/);
assert.doesNotMatch(ui,/\.csv\b/);
console.log('PASS: 1500-school-student paginated Excel rows, tenant and auth rejection, bounds, UI wiring');
