import assert from 'node:assert/strict';
import {createSchoolStore} from './firestore-adapter.mjs';
const sid='12345678';
const member={schoolId:sid,role:'viewer',active:true};
let signedIn=true,resolveQuery,queryCalls=0;
const api={
 collection:(_db,path)=>path,doc:(_db,path)=>path,
 orderBy:()=>({orderBy:'__name__'}),limit:n=>({limit:n}),startAfter:c=>({cursor:c}),
 query:(path,...constraints)=>({path,constraints}),
 getDocs:()=>{queryCalls++;return new Promise(resolve=>{resolveQuery=resolve})}
};
const store=createSchoolStore({db:{},api,member,schoolId:sid,assertSession:()=>{if(!signedIn)throw new Error('Authentication changed')}});
const pending=store.listPage('students',{pageSize:30});
assert.equal(queryCalls,1);
signedIn=false;
resolveQuery({docs:[{id:'s1',data:()=>({schoolId:sid,name:'Test Student'})}]});
await assert.rejects(pending,/Authentication changed/);
await assert.rejects(store.listPage('students',{pageSize:30}),/Authentication changed/);
assert.equal(queryCalls,1,'No new query after sign out');
signedIn=true;
const next=store.listPage('students',{pageSize:30});
resolveQuery({docs:[{id:'s2',data:()=>({schoolId:sid,name:'Another Student'})}]});
const result=await next;
assert.equal(result.records.length,1);
assert.equal(result.records[0].id,'s2');
assert.equal(result.hasMore,false);
assert.equal(queryCalls,2);
assert.throws(()=>createSchoolStore({db:{},api,member,schoolId:sid,assertSession:true}),/Session verifier/);
console.log('V47 paginated School Records authentication race checks passed');
