import assert from 'node:assert/strict';import {loadMarksByClassTerm} from '../v47/marks-query.mjs';
const actor={role:'viewer',active:true,schoolId:'school_001'};const filters=[];const api={collection:(_db,...p)=>p.join('/'),where:(...args)=>{filters.push(args);return args},orderBy:k=>['orderBy',k],limit:n=>['limit',n],startAfter:x=>['after',x],query:(...parts)=>parts,getDocs:async()=>({docs:[{id:'1st:s1:math',data:()=>({studentId:'s1',theory:30})}]})};
const args={db:{},api,actor,schoolId:'school_001',schoolClass:'6',term:'1st'};
const result=await loadMarksByClassTerm(args);assert.equal(result.records.length,1);assert.deepEqual(filters,[['class','==','6'],['term','==','1st']]);
for(const bad of [{schoolId:'school_002'},{schoolClass:'13'},{term:'midterm'},{pageSize:101},{actor:{...actor,active:false}}])await assert.rejects(()=>loadMarksByClassTerm({...args,...bad}));
console.log('V47 school-scoped marks query tests passed');
