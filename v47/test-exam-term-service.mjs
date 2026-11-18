import assert from 'node:assert/strict';
import {createSchoolExamTerm,deleteSchoolExamTerm} from './exam-term-service.mjs';
const writes=[];let exists=false;
const api={doc:(_db,...parts)=>parts.join('/'),runTransaction:async(_db,fn)=>fn({get:async()=>({exists:()=>exists}),set:(path,data)=>writes.push({path,data})})};
const admin={role:'school_admin',active:true,schoolId:'school_A'};
for(const term of ['1st','2nd','final']){
 const result=await createSchoolExamTerm({db:{},api,actor:admin,schoolId:'school_A',term});
 assert.equal(result.id,term);
 assert.equal(writes.at(-1).path,'schools/school_A/exams/'+term);
 assert.deepEqual(writes.at(-1).data,{schoolId:'school_A',term});
}
exists=true;
await assert.rejects(()=>createSchoolExamTerm({db:{},api,actor:admin,schoolId:'school_A',term:'1st'}),/already exists/i);
exists=false;
for(const invalid of ['midterm','Final','',null])await assert.rejects(()=>createSchoolExamTerm({db:{},api,actor:admin,schoolId:'school_A',term:invalid}),/term/i);
await assert.rejects(()=>createSchoolExamTerm({db:{},api,actor:admin,schoolId:'school_B',term:'1st'}),/permission/i);
await assert.rejects(()=>createSchoolExamTerm({db:{},api,actor:{role:'viewer',active:true,schoolId:'school_A'},schoolId:'school_A',term:'1st'}),/permission/i);
await assert.rejects(()=>deleteSchoolExamTerm(),/deletion unavailable/i);
console.log('V47 exam term creation and deletion guard tests passed');
