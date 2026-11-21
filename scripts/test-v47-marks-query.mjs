import assert from 'node:assert/strict';import {loadMarksByClassTerm} from '../v47/marks-query.mjs';
const actor={role:'viewer',active:true,schoolId:'12345678'};const filters=[];const api={collection:(_db,...p)=>p.join('/'),where:(...args)=>{filters.push(args);return args},orderBy:k=>['orderBy',k],limit:n=>['limit',n],startAfter:x=>['after',x],query:(...parts)=>parts,getDocs:async()=>({docs:[{id:'1st:s1:math',data:()=>({studentId:'s1',theory:30})}]})};
const args={db:{},api,actor,schoolId:'12345678',schoolClass:'6',term:'1st'};
const result=await loadMarksByClassTerm(args);assert.equal(result.records.length,1);assert.deepEqual(filters,[['class','==','6'],['term','==','1st']]);
for(const bad of [{schoolId:'87654321'},{schoolClass:'13'},{term:'midterm'},{pageSize:101},{actor:{...actor,active:false}}])await assert.rejects(()=>loadMarksByClassTerm({...args,...bad}));
let requestedLimit=0,usedCursor=false;const pagingApi={...api,limit:n=>{requestedLimit=n;return ['limit',n]},startAfter:()=>{usedCursor=true;return ['after','cursor']},getDocs:async()=>({docs:Array.from({length:3},(_,i)=>({id:'mark'+i,data:()=>({studentId:'s'+i})}))})};
const page=await loadMarksByClassTerm({...args,api:pagingApi,pageSize:2,cursor:'previous'});assert.equal(requestedLimit,3);assert.equal(usedCursor,true);assert.equal(page.records.length,2);assert.equal(page.hasMore,true);assert.equal(page.cursor.id,'mark1');
console.log('V47 school-scoped marks query tests passed');
