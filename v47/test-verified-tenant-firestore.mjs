import assert from 'node:assert/strict';
import {createVerifiedTenantFirestore} from './verified-tenant-firestore.mjs';
import {createVerifiedTenantContext} from './verified-tenant-context.mjs';
const sid='12345678',uid='teacher123';
const auth={currentUser:{uid}};
let schoolActive=true;
const school={id:sid,active:true};
let membershipActive=true;
const member={uid,schoolId:sid,role:'viewer',active:true};
let membershipRole='viewer';
const readDocument=async p=>p==='schools/'+sid?{...school,active:schoolActive}:{...member,active:membershipActive,role:membershipRole};
const context=await createVerifiedTenantContext({schoolId:sid,auth,readDocument});
const calls=[];
const api={
 collection:(_db,...path)=>{calls.push(['collection',...path]);return path},
 doc:(_db,...path)=>{calls.push(['doc',...path]);return path},
 getDocs:async path=>({docs:[],path}),getDoc:async path=>({exists:()=>false,path})
};
const store=createVerifiedTenantFirestore({db:{},api,context});
assert.deepEqual((await store.list('students')).path,['schools',sid,'students']);
assert.deepEqual((await store.get('staff','abc_1')).path,['schools',sid,'staff','abc_1']);
assert.deepEqual(calls,[['collection','schools',sid,'students'],['doc','schools',sid,'staff','abc_1']]);
await assert.rejects(store.list('members'),/Unreviewed V47 tenant collection/);
await assert.rejects(store.get('students','../foreign'),/Invalid document ID/);
await assert.rejects(store.create('students','abc',{schoolId:sid}),/writes disabled/);
auth.currentUser={uid:'differentUser'};
await assert.rejects(store.list('students'),/Authentication changed/);
await assert.rejects(store.get('students','abc'),/Authentication changed/);
auth.currentUser={uid};
membershipActive=false;
await assert.rejects(store.list('students'),/Membership unavailable/);
await assert.rejects(store.get('students','abc'),/Membership unavailable/);
membershipActive=true;
schoolActive=false;
await assert.rejects(store.list('students'),/School unavailable/);
schoolActive=true;
membershipRole='teacher';
await assert.rejects(store.get('staff','abc_1'),/School role changed/);
membershipRole='viewer';
let resolveRead;
const pending=createVerifiedTenantFirestore({db:{},context,api:{...api,getDocs:()=>new Promise(resolve=>{resolveRead=resolve})}});
const read=pending.list('students');
for(let attempt=0;attempt<20&&typeof resolveRead!=='function';attempt++)await new Promise(resolve=>setImmediate(resolve));
assert.equal(typeof resolveRead,'function','Read request must reach Firestore before revocation');
membershipActive=false;
resolveRead({docs:[]});
await assert.rejects(read,/Membership unavailable/);
membershipActive=true;
let resolveRoleRead;
const rolePending=createVerifiedTenantFirestore({db:{},context,api:{...api,getDoc:()=>new Promise(resolve=>{resolveRoleRead=resolve})}});
const roleRead=rolePending.get('students','abc_1');
for(let attempt=0;attempt<20&&typeof resolveRoleRead!=='function';attempt++)await new Promise(resolve=>setImmediate(resolve));
assert.equal(typeof resolveRoleRead,'function','Read request must reach Firestore before role change');
membershipRole='teacher';
resolveRoleRead({exists:()=>true});
await assert.rejects(roleRead,/School role changed/);
membershipRole='viewer';
const pages=[{docs:[{id:'a'},{id:'b'}]},{docs:[{id:'c'}]}];
const paginated=createVerifiedTenantFirestore({db:{},context,api:{...api,
 query:(ref,...constraints)=>({ref,constraints}),orderBy:field=>['orderBy',field],documentId:()=> '__name__',
 limit:n=>['limit',n],startAfter:id=>['startAfter',id],
 getDocs:async query=>{assert.deepEqual(query.ref,['schools',sid,'students']);return pages.shift();}
}});
assert.deepEqual((await paginated.listAll('students',{pageSize:2})).docs.map(d=>d.id),['a','b','c']);
await assert.rejects(paginated.listAll('students',{pageSize:0}),/pagination limits/);
console.log('Verified V47 read-only tenant Firestore adapter tests passed');
