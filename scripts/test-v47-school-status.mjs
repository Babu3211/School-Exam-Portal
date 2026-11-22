import assert from 'node:assert/strict';
import {setSchoolActive} from '../v47/school-status-service.mjs';
const changes=[];let exists=true;
const api={doc:(_db,...segments)=>segments.join('/'),runTransaction:async(_db,fn)=>fn({get:async()=>({exists:()=>exists,data:()=>({id:'12345678',iemisCode:'12345678',name:'Sample School',active:false})}),update:(...args)=>changes.push(args)})};
const actor={uid:'super123',role:'super_admin',active:true};
await assert.rejects(()=>setSchoolActive({db:{},api,actor:{role:'school_admin',active:true},schoolId:'12345678',active:true}));
assert.equal(changes.length,0);
await setSchoolActive({db:{},api,actor,schoolId:'12345678',active:true});
assert.deepEqual(changes[0],['schools/12345678',{active:true}]);
exists=false;
await assert.rejects(()=>setSchoolActive({db:{},api,actor,schoolId:'12345678',active:false}),/does not exist/);
assert.equal(changes.length,1);
// Mid-transaction revoked or switched Super Admin cannot activate a school.
for(const mutate of [
 admin=>{admin.uid='different_user'},
 admin=>{admin.role='viewer'},
 admin=>{admin.active=false}
]){
 const current={...actor},pending=[];
 const racingApi={doc:api.doc,runTransaction:async(_db,callback)=>callback({
  get:async()=>{mutate(current);return {exists:()=>true,data:()=>({id:'12345678',iemisCode:'12345678',name:'Sample School',active:false})}},
  update:(...args)=>pending.push(args)
 })};
 await assert.rejects(()=>setSchoolActive({db:{},api:racingApi,actor:current,schoolId:'12345678',active:true}),/identity changed/);
 assert.equal(pending.length,0,'Revoked Super Admin must not change school active state');
}
await assert.rejects(()=>setSchoolActive({db:{},api,actor:{role:'super_admin',active:true},schoolId:'12345678',active:true}),/Super Admin required/);
console.log('V47 activation and deactivation authorization tests passed');
