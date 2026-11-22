import assert from 'node:assert/strict';
import {listSchoolMembers,listSchoolMembersPage} from './member-list-service.mjs';

const schoolId='12345',otherSchoolId='67890';
const actor=()=>({uid:'admin_123',role:'school_admin',active:true,schoolId});
const member=(id,school=schoolId,onData=()=>{})=>({id,
 ref:{path:'schools/'+school+'/members/'+id},
 data:()=>{onData();return {uid:id,role:'teacher',active:true,schoolId:school}}
});
const docs=[member('teacher_1'),member('teacher_2')];
const makeApi=(getDocs=async()=>({docs}))=>({
 collection:(_db,...segments)=>segments.join('/'),
 query:(ref,...constraints)=>({ref,constraints}),
 documentId:()=> '__name__',
 orderBy:key=>({key}),limit:n=>({limit:n}),
 startAfter:cursor=>({cursor}),getDocs
});
for(const list of [listSchoolMembers,listSchoolMembersPage]){
 const valid=await list({db:{},api:makeApi(),actor:actor(),schoolId,pageSize:2});
 assert.equal((valid.records??valid).length,2,'Valid admin may read 2 members');
 for(const modify of [
  a=>{a.role='viewer'},
  a=>{a.active=false},
  a=>{a.uid='other_admin'},
  a=>{a.schoolId=otherSchoolId}
 ]){
  const current=actor();
  const api=makeApi(async()=>{modify(current);return {docs}});
  await assert.rejects(()=>list({db:{},api,actor:current,schoolId,pageSize:2}),/Admin session changed/);
 }
 for(const modify of [
  a=>{a.role='viewer'},a=>{a.active=false},a=>{a.uid='other_admin'}
 ]){
  const current=actor();
  const mutated=[member('teacher_1',schoolId,()=>modify(current)),member('teacher_2')];
  await assert.rejects(()=>list({db:{},api:makeApi(async()=>({docs:mutated})),actor:current,schoolId,pageSize:2}),/Admin session changed/);
 }
 await assert.rejects(()=>list({
  db:{},api:makeApi(async()=>({docs:[member('foreign',otherSchoolId)]})),actor:actor(),schoolId,pageSize:2
 }),/Cross-school/);
}
await assert.rejects(()=>listSchoolMembersPage({
 db:{},api:makeApi(async()=>({docs:[member('teacher_1'),member('foreign',otherSchoolId)]})),
 actor:actor(),schoolId,pageSize:1
}),/Cross-school/,'Lookahead member from another school must not be accepted');
await assert.rejects(()=>listSchoolMembersPage({
 db:{},api:makeApi(),actor:actor(),schoolId,pageSize:2,
 cursor:member('teacher_1',otherSchoolId)
}),/Invalid pagination cursor|Cross-school/);
await assert.rejects(()=>listSchoolMembersPage({
 db:{},api:makeApi(),actor:actor(),schoolId,pageSize:2,
 cursor:{id:'../wrong',data:()=>({schoolId,uid:'../wrong'})}
}),/Invalid pagination cursor/);
// Reject inconsistent role/status data and all forms of ordering drift.
for(const data of [
 {uid:'teacher_1',schoolId,role:'owner',active:true},
 {uid:'teacher_1',schoolId,role:'viewer',active:'yes'}
]){
 await assert.rejects(()=>listSchoolMembersPage({
  db:{},actor:actor(),schoolId,pageSize:2,api:makeApi(async()=>({
   docs:[{id:'teacher_1',data:()=>data}]
  }))
 }),/Cross-school or malformed/);
}
for(const docs of [
 [member('teacher_2'),member('teacher_1')],
 [member('teacher_1'),member('teacher_1')],
 [member('teacher_1'),member('teacher_1',otherSchoolId)]
]){
 await assert.rejects(()=>listSchoolMembersPage({
  db:{},actor:actor(),schoolId,pageSize:2,api:makeApi(async()=>({docs}))
 }),/out-of-order|Cross-school/);
}
{
 let reads=0;
 const docs=[member('teacher_1',schoolId,()=>reads++),member('teacher_2',schoolId,()=>reads++)];
 const page=await listSchoolMembersPage({db:{},actor:actor(),schoolId,pageSize:1,api:makeApi(async()=>({docs}))});
 assert.equal(page.records.length,1);
 assert.equal(page.hasMore,true);
 assert.equal(reads,2,'Lookahead and visible member must be read exactly once');
}
// A role flag is not sufficient without a validated Firebase UID.
for(const list of [listSchoolMembers,listSchoolMembersPage]){
 for(const invalidUid of [undefined,null,'','invalid/uid']){
  let queries=0;
  const api=makeApi(async()=>{queries++;return {docs}});
  await assert.rejects(()=>list({db:{},api,actor:{...actor(),uid:invalidUid},schoolId,pageSize:2}),/Admin access/);
  assert.equal(queries,0,'Unauthorized list must not reach Firestore');
 }
}
console.log('V47 school member listing: session races, revoked roles, cross-school data, lookahead and cursor guards passed');
