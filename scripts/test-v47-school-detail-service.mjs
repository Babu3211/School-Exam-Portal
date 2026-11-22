import assert from 'node:assert/strict';
import {getSchoolDetails} from '../v47/school-detail-service.mjs';
const schoolId='12345678',record={id:schoolId,iemisCode:schoolId,name:'Example School',active:true};
const api={doc:(_db,...p)=>p.join('/'),getDoc:async()=>({exists:()=>true,id:schoolId,data:()=>record})};
const args={db:{},api,actor:{uid:'viewer-a',role:'viewer',active:true,schoolId:'12345678'},schoolId:'12345678'};
await assert.rejects(()=>getSchoolDetails({...args,schoolId:'87654321'}));
await assert.rejects(()=>getSchoolDetails({...args,actor:{role:'viewer',active:true,schoolId:'12345678'}}),/School access denied/);
assert.equal((await getSchoolDetails(args)).id,'12345678');
// Reject revoked or reassigned roles while the Firestore document is loading.
for(const mutate of [
 a=>{a.uid='switched'},a=>{a.active=false},a=>{a.role='invalid'},a=>{a.schoolId='87654321'}
]){
 const actor={...args.actor};
 const raced={...api,getDoc:async()=>{mutate(actor);return {exists:()=>true,id:schoolId,data:()=>record}}};
 await assert.rejects(()=>getSchoolDetails({...args,actor,api:raced}),/membership changed/);
}
for(const data of [
 {...record,id:'87654321'}, {...record,iemisCode:'87654321'},
 {...record,name:'A'},null,[]
]){
 await assert.rejects(()=>getSchoolDetails({...args,api:{...api,getDoc:async()=>({exists:()=>true,id:schoolId,data:()=>data})}}),/registry identity mismatch/);
}
await assert.rejects(()=>getSchoolDetails({...args,api:{...api,getDoc:async()=>({exists:()=>true,id:'87654321',data:()=>record})}}),/registry identity mismatch/);
await assert.rejects(()=>getSchoolDetails({...args,api:{...api,getDoc:async()=>({exists:()=>true,id:schoolId,data:()=>({...record,active:false})})}}),/School unavailable/);
console.log('V47 school detail scope passed');
