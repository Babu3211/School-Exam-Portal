import assert from 'node:assert/strict';import {validateMarkEntry,markEntryId,saveSchoolMark} from '../v47/marks-service.mjs';
const input={studentId:'s1',subjectId:'math',class:'6',term:'1st',theory:35,practical:8};const actor={role:'school_admin',active:true,schoolId:'school_001'};
assert.deepEqual(validateMarkEntry(input),input);assert.equal(markEntryId(input),'1st:s1:math');
let writes=0;const api={doc:(_db,...path)=>path.join('/'),setDoc:async(path,data)=>{writes++;assert.equal(path,'schools/school_001/marks/1st:s1:math');assert.equal(data.theory,35)}};
assert.equal((await saveSchoolMark({db:{},api,actor,schoolId:'school_001',input} )).id,'1st:s1:math');
for(const bad of [{...input,term:'midterm'},{...input,class:'13'},{...input,theory:-1},{...input,theory:'abc'},{...input,practical:''},{...input,subjectId:'a/b'}])assert.throws(()=>validateMarkEntry(bad));
for(const role of ['teacher','viewer'])await assert.rejects(()=>saveSchoolMark({db:{},api,actor:{...actor,role},schoolId:'school_001',input}));
await assert.rejects(()=>saveSchoolMark({db:{},api,actor,schoolId:'school_002',input}));assert.equal(writes,1);
console.log('V47 mark entry foundation tests passed');
