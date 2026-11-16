import assert from 'node:assert/strict';
import {listSchoolMembers} from '../v47/member-list-service.mjs';
const api={collection:(_db,...p)=>p.join('/'),query:(...x)=>x,limit:x=>x,getDocs:async()=>({docs:[{id:'teacher123',data:()=>({uid:'spoof',role:'teacher'})}]})};
const args={db:{},api,actor:{active:true,role:'school_admin',schoolId:'school_001'},schoolId:'school_001'};
await assert.rejects(()=>listSchoolMembers({...args,actor:{active:true,role:'viewer',schoolId:'school_001'}}));
assert.equal((await listSchoolMembers(args))[0].uid,'teacher123');
console.log('V47 school member list authorization passed');
