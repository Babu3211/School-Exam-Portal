import assert from 'node:assert/strict';
import {createSchoolStore} from './firestore-adapter.mjs';
const schoolId='12345678';
const member={uid:'admin-1',schoolId,role:'school_admin',active:true};
const makeApi=(docs)=>({
 collection:(_db,path)=>path,doc:(_db,path)=>path,
 query:(...args)=>args,limit:n=>({limit:n}),orderBy:x=>({orderBy:x}),startAfter:x=>({after:x}),
 getDocs:async()=>({docs})
});
const record=(id,data={schoolId,name:id})=>({id,data:()=>data});
let active=true;
const store=createSchoolStore({db:{},api:makeApi([record('a'),record('b')]),member,schoolId,assertSession:()=>{if(!active)throw Error('Session revoked')}});
assert.deepEqual((await store.listPage('students',{pageSize:2})).records.map(x=>x.id),['a','b']);
for(const bad of [
 [record('a',{schoolId:'87654321'})],
 [record('a'),record('a')],
 [record('b'),record('a')],
 [null],
 [{id:'a'}],
 [record('a',[])],
 [record('a',null)]
]){
 const unsafe=createSchoolStore({db:{},api:makeApi(bad),member,schoolId});
 await assert.rejects(unsafe.listPage('students'),/Cross-school|Malformed|out-of-order/);
}
const revoked=createSchoolStore({db:{},api:makeApi([{
 id:'a',data:()=>{active=false;return {schoolId,name:'A'}}
}]),member,schoolId,assertSession:()=>{if(!active)throw Error('Session revoked')}});
await assert.rejects(revoked.listPage('students'),/Session revoked/);
console.log('V47 shared school records tenant and session tests passed');
