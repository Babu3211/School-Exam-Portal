import assert from 'node:assert/strict';
import {getSchoolDetails} from '../v47/school-detail-service.mjs';
const api={doc:(_db,...p)=>p.join('/'),getDoc:async()=>({exists:()=>true,id:'12345678',data:()=>({id:'spoof',name:'A'})})};
const args={db:{},api,actor:{role:'viewer',active:true,schoolId:'12345678'},schoolId:'12345678'};
await assert.rejects(()=>getSchoolDetails({...args,schoolId:'87654321'}));
assert.equal((await getSchoolDetails(args)).id,'12345678');
console.log('V47 school detail scope passed');
