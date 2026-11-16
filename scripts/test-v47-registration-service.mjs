import assert from 'node:assert/strict';
import {registerSchool} from '../v47/registration-service.mjs';
const writes=[];const api={doc:(_db,...path)=>path.join('/'),setDoc:async(...args)=>writes.push(args)};
const form={id:'school_001',name:'Sample School'};
await assert.rejects(()=>registerSchool({db:{},api,actor:{active:true,role:'viewer'},form}));
assert.equal(writes.length,0);
const result=await registerSchool({db:{},api,actor:{active:true,role:'super_admin'},form});
assert.equal(result.active,false);assert.equal(writes[0][0],'schools/school_001');
console.log('V47 registration service authorization and disabled-by-default passed');
