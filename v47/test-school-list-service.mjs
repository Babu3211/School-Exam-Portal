import assert from 'node:assert/strict';
import {listSchools} from './school-list-service.mjs';
const docs=Array.from({length:65},(_,i)=>({id:'school'+String(i+1).padStart(3,'0'),data(){return {name:'School '+i,active:i%2===0}}}));
const api={
 collection:(_db,path)=>path,
 orderBy:field=>({type:'order',field}),
 limit:n=>({type:'limit',n}),
 startAfter:cursor=>({type:'after',cursor}),
 query:(path,...constraints)=>({path,constraints}),
 getDocs:async q=>{
  assert.equal(q.path,'schools');
  const after=q.constraints.find(x=>x.type==='after')?.cursor;
  const start=after?docs.findIndex(x=>x.id===after.id)+1:0;
  return {docs:docs.slice(start,start+q.constraints.find(x=>x.type==='limit').n)};
 }
};
const actor={role:'super_admin',active:true};
const args={db:{},api,actor,pageSize:30};
const a=await listSchools(args);
assert.equal(a.schools.length,30);assert.equal(a.hasMore,true);
const b=await listSchools({...args,cursor:a.cursor});
assert.equal(b.schools.length,30);assert.equal(b.hasMore,true);
const c=await listSchools({...args,cursor:b.cursor});
assert.equal(c.schools.length,5);assert.equal(c.hasMore,false);
assert.equal(new Set([...a.schools,...b.schools,...c.schools].map(x=>x.id)).size,65);
await assert.rejects(()=>listSchools({...args,actor:{role:'viewer',active:true}}),/Super Admin/);
await assert.rejects(()=>listSchools({...args,pageSize:0}),RangeError);
console.log('V47 Super Admin school pagination tests passed');
