import assert from 'node:assert/strict';
import {listSchools} from '../v47/school-list-service.mjs';
const api={collection:(_db,p)=>p,query:(...x)=>x,orderBy:x=>x,limit:x=>x,startAfter:x=>x,getDocs:async()=>({docs:[{id:'school_001',data:()=>({name:'A',id:'fake'})},{id:'school_002',data:()=>({name:'B'})}]})};
const args={db:{},api,actor:{role:'super_admin',active:true},pageSize:1};
await assert.rejects(()=>listSchools({...args,actor:{role:'school_admin',active:true}}));
const result=await listSchools(args);
assert.equal(result.schools[0].id,'school_001');assert.equal(result.hasMore,true);
console.log('V47 Super Admin school list paging passed');
