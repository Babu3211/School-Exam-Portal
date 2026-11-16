import assert from 'node:assert/strict';
import {getSchoolDetails} from '../v47/school-detail-service.mjs';
const api={doc:(_db,...p)=>p.join('/'),getDoc:async()=>({exists:()=>true,id:'school_001',data:()=>({id:'spoof',name:'A'})})};
const args={db:{},api,actor:{role:'viewer',active:true,schoolId:'school_001'},schoolId:'school_001'};
await assert.rejects(()=>getSchoolDetails({...args,schoolId:'school_002'}));
assert.equal((await getSchoolDetails(args)).id,'school_001');
console.log('V47 school detail scope passed');
