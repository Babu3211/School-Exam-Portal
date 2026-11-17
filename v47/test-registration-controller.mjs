import assert from 'node:assert/strict';
import {createRegistrationController} from './registration-controller.mjs';
const data=new Map();
const controller=createRegistrationController({
 db:{},
 doc:(_,path)=>({path}),
 runTransaction:async(_,f)=>{
  const pending=[];
  const result=await f({get:async r=>({exists:()=>data.has(r.path)}),set:(r,v)=>pending.push([r.path,v])});
  for(const [p,v] of pending)data.set(p,v);
  return result;
 }
});
const school=await controller.registerSchool({id:'schoolA',name:'Example School'});
assert.equal(school.active,false);
await assert.rejects(()=>controller.registerSchool({id:'schoolA',name:'Example School'}));
const member=await controller.provisionMember({uid:'adminA',schoolId:'schoolA',role:'school_admin'});
assert.equal(member.active,false);
assert.equal(data.size,2);
console.log('V47 registration controller tests passed');
