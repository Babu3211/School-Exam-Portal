import assert from 'node:assert/strict';
import {onboardSchool} from './school-onboarding.mjs';
import {setSchoolActive} from './school-status-service.mjs';
import {listSchools} from './school-list-service.mjs';

const admin={role:'super_admin',active:true};
const viewer={role:'viewer',active:true,schoolId:'12345'};
const school={id:'12345',name:'Sample School',iemisCode:'12345'};
const makeDb=()=>({schools:new Map(),members:new Map(),updates:[]});
function mockApi(state){
 const key=(parts)=>parts.join('/');
 return {
  doc:(_db,...parts)=>key(parts),
  collection:(_db,...parts)=>key(parts),
  query:(collection,...constraints)=>({collection,constraints}),
  orderBy:(field)=>({orderBy:field}),
  limit:(size)=>({limit:size}),
  startAfter:(cursor)=>({startAfter:cursor}),
  getDocs:async(query)=>{const docs=[...state.schools.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([id,data])=>({id,data:()=>data}));const cursor=query.constraints.find(x=>x.startAfter)?.startAfter;const size=query.constraints.find(x=>x.limit)?.limit??30;const offset=cursor?docs.findIndex(x=>x.id===cursor.id)+1:0;return {docs:docs.slice(offset,offset+size)}},
  runTransaction:async(_db,callback)=>{
   const writes=[];
   const tx={
    get:async(ref)=>({exists:()=>ref.startsWith('schools/')&&!ref.includes('/members/')&&state.schools.has(ref.split('/')[1]),data:()=>state.schools.get(ref.split('/')[1])}),
    set:(ref,data)=>writes.push(['set',ref,data]),
    update:(ref,data)=>writes.push(['update',ref,data])
   };
   const result=await callback(tx);
   for(const [type,ref,data] of writes){
    const parts=ref.split('/');
    if(parts.length===2){const prev=state.schools.get(parts[1])??{};state.schools.set(parts[1],type==='update'?{...prev,...data}:data)}
    else if(parts.length===4)state.members.set(ref,data);
    state.updates.push([type,ref,data]);
   }
   return result;
  }
 };
}
const state=makeDb(),api=mockApi(state),db={};
let checks=0;
async function ok(name,fn){await fn();checks++;console.log('OK '+checks+' '+name)}
await ok('1 reject viewer school registration',async()=>{await assert.rejects(onboardSchool({db,api,actor:viewer,form:school,adminUid:'admin001'}))});
await ok('2 reject inactive Super Admin',async()=>{await assert.rejects(onboardSchool({db,api,actor:{...admin,active:false},form:school,adminUid:'admin001'}))});
await ok('3 reject invalid IEMIS ID',async()=>{await assert.rejects(onboardSchool({db,api,actor:admin,form:{...school,id:'abc'},adminUid:'admin001'}))});
await ok('4 reject invalid admin UID',async()=>{await assert.rejects(onboardSchool({db,api,actor:admin,form:school,adminUid:'x'}))});
await ok('5 reject missing transaction SDK',async()=>{await assert.rejects(onboardSchool({db,api:{doc:api.doc},actor:admin,form:school,adminUid:'admin001'}))});
await ok('6 register school atomically',async()=>{await onboardSchool({db,api,actor:admin,form:school,adminUid:'admin001'});assert.equal(state.schools.size,1);assert.equal(state.members.size,1)});
await ok('7 school starts inactive',async()=>{assert.equal(state.schools.get('12345').active,false)});
await ok('8 first admin role scoped',async()=>{assert.deepEqual(state.members.get('schools/12345/members/admin001'),{uid:'admin001',schoolId:'12345',role:'school_admin',active:true})});
await ok('9 reject duplicate school',async()=>{await assert.rejects(onboardSchool({db,api,actor:admin,form:school,adminUid:'admin002'}));assert.equal(state.members.size,1)});
await ok('10 reject viewer school activation',async()=>{await assert.rejects(setSchoolActive({db,api,actor:viewer,schoolId:'12345',active:true}))});
await ok('11 reject invalid active value',async()=>{await assert.rejects(setSchoolActive({db,api,actor:admin,schoolId:'12345',active:'yes'}))});
await ok('12 reject nonexistent school activation',async()=>{await assert.rejects(setSchoolActive({db,api,actor:admin,schoolId:'67890',active:true}))});
await ok('13 activate existing school',async()=>{await setSchoolActive({db,api,actor:admin,schoolId:'12345',active:true});assert.equal(state.schools.get('12345').active,true)});
await ok('14 reject viewer school listing',async()=>{await assert.rejects(listSchools({db,api,actor:viewer}))});
await ok('15 school listing retains IEMIS document ID',async()=>{const result=await listSchools({db,api,actor:admin,pageSize:1});assert.equal(result.schools[0].id,'12345');assert.equal(result.hasMore,false)});
await ok('16 reject oversized page',async()=>{await assert.rejects(listSchools({db,api,actor:admin,pageSize:1000000}))});
await ok('17 paginate with cursor without duplicates',async()=>{state.schools.set('23456',{...school,id:'23456',iemisCode:'23456'});const first=await listSchools({db,api,actor:admin,pageSize:1});assert.equal(first.hasMore,true);const second=await listSchools({db,api,actor:admin,pageSize:1,cursor:first.cursor});assert.equal(second.schools[0].id,'23456')});
console.log('PASS '+checks+' V47 school admin service checks (mock SDK; Firebase emulator verification still required)');
