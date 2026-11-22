import assert from 'node:assert/strict';
import {loadCompleteSchoolSubjects} from './complete-school-subjects.mjs';
const schoolId='12345678',actor={uid:'u1',schoolId,role:'school_admin',active:true};
let calls=0;
const api={collection:(_db,...path)=>path.join('/'),where:(...x)=>x,orderBy:(...x)=>x,limit:n=>n,startAfter:x=>x,query:(...x)=>x,getDocs:async q=>{calls++;assert.equal(q[0],'schools/12345678/subjects');const after=q.find(x=>x&&typeof x==='object'&&x.id)?.id;const ids=after==='b'?['c']:['a','b','c'];return {docs:ids.map(id=>({id,data:()=>({schoolId,class:'9',active:true,creditHour:4})}))}}};
const base={db:{},api,actor,schoolId,schoolClass:'9',pageSize:2};
const result=await loadCompleteSchoolSubjects(base);
assert.deepEqual(result.subjects.map(s=>s.id),['a','b','c']);
assert.equal(result.pages,2);
assert.deepEqual(result.subjects.map(s=>s.creditHour),[4,4,4]);
const missingCredit={...api,getDocs:async()=>({docs:[{id:'a',data:()=>({schoolId,class:'9',active:true})}]})};
await assert.rejects(()=>loadCompleteSchoolSubjects({...base,api:missingCredit}),/creditHour missing/);
const invalidCredit={...api,getDocs:async()=>({docs:[{id:'a',data:()=>({schoolId,class:'9',active:true,creditHour:0})}]})};
await assert.rejects(()=>loadCompleteSchoolSubjects({...base,api:invalidCredit}),/creditHour missing/);
await assert.rejects(()=>loadCompleteSchoolSubjects({...base,maxSubjects:2}),/bound/);
const excessiveCredit={...api,getDocs:async()=>({docs:[{id:'a',data:()=>({schoolId,class:'9',active:true,creditHour:101})}]})};
await assert.rejects(()=>loadCompleteSchoolSubjects({...base,api:excessiveCredit}),/creditHour missing/);
const invalidLookahead={...api,getDocs:async()=>({docs:[{id:'a',data:()=>({schoolId,class:'9',active:true,creditHour:4})},{id:'b',data:()=>({schoolId,class:'9',active:true,creditHour:4})},{id:'c',data:()=>({schoolId,class:'9',active:true,creditHour:0})}]})};
await assert.rejects(()=>loadCompleteSchoolSubjects({...base,api:invalidLookahead}),/lookahead/);
await assert.rejects(()=>loadCompleteSchoolSubjects({...base,actor:{...actor,schoolId:'99999999'}}),/membership/);
const bad={...api,getDocs:async()=>({docs:[{id:'a',data:()=>({schoolId:'99999999',class:'9',active:true})}]})};
await assert.rejects(()=>loadCompleteSchoolSubjects({...base,api:bad}),/Foreign/);
const inactive={...api,getDocs:async()=>({docs:[{id:'a',data:()=>({schoolId,class:'9',active:false})}]})};
await assert.rejects(()=>loadCompleteSchoolSubjects({...base,api:inactive}),/Inactive/);

// 18 fail-closed subject roster and tenant cases, including lookahead records.
const row=(id,data)=>({id,data:()=>data});
const good={schoolId,class:'9',active:true,creditHour:4};
const badCases=[
 ['null snapshot',null,/Invalid subject page/],
 ['missing docs',{},/Invalid subject page/],
 ['non-array docs',{docs:{}},/Invalid subject page/],
 ['null subject',{docs:[row('a',null)]},/Malformed subject/],
 ['array subject',{docs:[row('a',[])]},/Malformed subject/],
 ['missing accessor',{docs:[{id:'a'}]},/Malformed subject/],
 ['invalid id',{docs:[row('../a',good)]},/pagination order/],
 ['duplicate ids',{docs:[row('a',good),row('a',good)]},/pagination order/],
 ['out of order',{docs:[row('b',good),row('a',good)]},/pagination order/],
 ['wrong class',{docs:[row('a',{...good,class:'8'})]},/Foreign subject/],
 ['foreign school',{docs:[row('a',{...good,schoolId:'87654321'})]},/Foreign subject/],
 ['inactive subject',{docs:[row('a',{...good,active:false})]},/Inactive subject/],
 ['missing credit',{docs:[row('a',{...good,creditHour:undefined})]},/creditHour/],
 ['negative credit',{docs:[row('a',{...good,creditHour:-1})]},/creditHour/],
 ['lookahead foreign',{docs:[row('a',good),row('b',good),row('c',{...good,schoolId:'87654321'})]},/Foreign subject/],
 ['lookahead inactive',{docs:[row('a',good),row('b',good),row('c',{...good,active:false})]},/lookahead/],
 ['lookahead missing credit',{docs:[row('a',good),row('b',good),row('c',{...good,creditHour:undefined})]},/lookahead/],
 ['oversized page',{docs:[row('a',good),row('b',good),row('c',good),row('d',good)]},/Invalid subject page/]
];
assert.equal(badCases.length,18);
for(const [label,snapshot,pattern] of badCases){
 const failing={...api,getDocs:async()=>snapshot};
 await assert.rejects(loadCompleteSchoolSubjects({...base,api:failing}),pattern,label);
}
for(const uid of [null,undefined,'','  ']){
 await assert.rejects(loadCompleteSchoolSubjects({...base,actor:{...actor,uid}}),/School membership required/);
}
let dataCalls=0;
const stable={...api,getDocs:async()=>({docs:[{id:'a',data:()=>{
 dataCalls++;
 return dataCalls===1?good:{...good,schoolId:'87654321'};
}}]})};
const once=await loadCompleteSchoolSubjects({...base,api:stable});
assert.equal(once.count,1);
assert.equal(dataCalls,1,'Each subject must be materialized once');
for(const mutate of [
 a=>{a.uid='other'},a=>{a.active=false},a=>{a.role='viewer';a.schoolId='87654321'}
]){
 const changing={...actor};
 const revoked={...api,getDocs:async()=>({docs:[{id:'a',data:()=>{
  mutate(changing);
  return good;
 }}]})};
 await assert.rejects(loadCompleteSchoolSubjects({...base,actor:changing,api:revoked}),/membership changed/);
}
// Three-page pagination must neither skip nor duplicate the lookahead subject.
const allIds=['a','b','c','d','e'];
const multi={...api,getDocs:async q=>{
 const after=q.find(x=>x&&typeof x==='object'&&x.id)?.id;
 const start=after?allIds.indexOf(after)+1:0;
 return {docs:allIds.slice(start,start+3).map(id=>row(id,good))};
}};
const full=await loadCompleteSchoolSubjects({...base,api:multi,maxSubjects:5});
assert.deepEqual(full.subjects.map(s=>s.id),allIds);
assert.equal(full.pages,3);
// A repeated object reference must not confuse lookahead position.
const repeated=row('a',good);
const duplicatedReference={...api,getDocs:async()=>({docs:[repeated,repeated]})};
await assert.rejects(loadCompleteSchoolSubjects({...base,api:duplicatedReference}),/pagination order/);
console.log('V47 school subject roster pagination and tenant checks passed');
