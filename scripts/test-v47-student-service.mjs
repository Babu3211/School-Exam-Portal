import assert from 'node:assert/strict';import {createSchoolStudent} from '../v47/student-service.mjs';
let path;const api={collection:(_db,...segments)=>{path=segments.join('/');return path},addDoc:async()=>({id:'student1'})};
const args={db:{},api,actor:{role:'school_admin',active:true,schoolId:'12345678'},schoolId:'12345678',input:{name:'Ram',class:'1'}};
assert.equal((await createSchoolStudent(args)).id,'student1');assert.equal(path,'schools/12345678/students');
for(const role of ['viewer','teacher'])await assert.rejects(()=>createSchoolStudent({...args,actor:{...args.actor,role}}));
await assert.rejects(()=>createSchoolStudent({...args,schoolId:'87654321'}));
console.log('V47 school-scoped student create service passed');
