import assert from 'node:assert/strict';
import {collectSchoolAuditExcel,AUDIT_COLLECTIONS} from './school-records-audit-excel.mjs';
const schoolId='300160003',actor={uid:'adminA',role:'school_admin',active:true,schoolId};
const data={
 students:[{id:'s1',schoolId,name:'=FORMULA',password:'secret'}, {id:'s2',schoolId,name:'नमूना'}],
 subject_assignments:[{id:'s1:math',schoolId,studentId:'s1',subjectId:'math'}],
 class_mark_drafts:[{id:'9_math_final',schoolId,entries:[{studentId:'s1',values:{practical:36}}]}]
};
function source(d=data){
 let calls=0;
 return {store:{schoolId,async listPage(name,{pageSize,cursor}){
   assert.equal(pageSize,1);
   calls++;
   const all=d[name]??[];
   const start=cursor?all.findIndex(x=>x.id===cursor.id)+1:0;
   const records=all.slice(start,start+1);
   return {records,hasMore:start+1<all.length,cursor:records.at(-1)??null};
 }},get calls(){return calls}};
}
const m=source();
let checks=0;
const result=await collectSchoolAuditExcel({store:m.store,schoolId,actor,assertSession:()=>{checks++},
  collections:['students','subject_assignments','class_mark_drafts'],pageSize:1,createdAt:'2026-11-23T00:00:00.000Z'});
assert.equal(result.complete,true);
assert.equal(result.recordCount,4);
assert.equal(result.counts.students,2);
assert.equal(result.counts.subject_assignments,1);
assert.equal(result.counts.class_mark_drafts,1);
assert.equal(result.notDatabaseBackup,true);
assert.equal(result.redactedFields,1);
assert.equal(result.filename,'smss-v47-school-records-AUDIT-'+schoolId+'.xlsx');
assert(checks>=7);
const bytes=new Uint8Array(await result.blob.arrayBuffer());
assert.deepEqual([...bytes.slice(0,2)],[80,75]);
const content=new TextDecoder().decode(bytes);
assert.match(content,/xl\/worksheets\/sheet1\.xml/);
assert.match(content,/notDatabaseBackup|officialBackup/);
assert.match(content,/s1:math/);
assert.match(content,/नमूना/);
assert.match(content,/\[REDACTED\]/);
assert.doesNotMatch(content,/secret/);
assert.doesNotMatch(content,/<f>/);
assert.equal(AUDIT_COLLECTIONS.includes('class_mark_drafts'),true);
const call=({records={},...extra}={})=>collectSchoolAuditExcel({
 store:source(records).store,schoolId,actor,assertSession:()=>{},
 collections:['students'],pageSize:1,createdAt:'2026-11-23T00:00:00.000Z',...extra
});
await assert.rejects(call({actor:{...actor,role:'viewer'}}),/School Admin/);
await assert.rejects(call({actor:{...actor,schoolId:'123456789'}}),/School Admin/);
await assert.rejects(call({store:{schoolId:'123456789',listPage:async()=>({records:[],hasMore:false})}}),/same-school/);
await assert.rejects(call({records:{students:[{id:'x',schoolId:'123456789'}]}}),/cross-school/);
await assert.rejects(call({records:{students:[{id:'a',schoolId},{id:'b',schoolId}]},maxPerCollection:1}),/limit/);
await assert.rejects(call({records:{students:[{id:'b',schoolId},{id:'a',schoolId}]}}),/unsorted/);
await assert.rejects(call({collections:['marks','marks']}),/duplicate/);
await assert.rejects(call({assertSession:()=>{throw Error('Logout')}}),/Logout/);
let cancelled=false;
await assert.rejects(call({onProgress:()=>{cancelled=true},assertSession:()=>{if(cancelled)throw Error('Session changed')}}),/Session changed/);
const unicode='🙂'.repeat(14000);
const large=await call({records:{students:[{id:'a',schoolId,name:unicode}]}});
const raw=new TextDecoder().decode(new Uint8Array(await large.blob.arrayBuffer()));
assert.match(raw,/<v>2<\/v>/);
assert.doesNotMatch(raw,/�/);
console.log('PASS V47 School Records audit Excel: verified School Admin, complete tenant pagination, redaction and large Unicode segmentation');
