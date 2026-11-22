import assert from 'node:assert/strict';
import {validateSchoolSubject} from './subject-validation.mjs';
import {createSchoolSubject} from './subject-create-service.mjs';
const schoolId='12345678';
for(const [theoryFullMarks,practicalFullMarks] of [[4,36],[100,0],[2500,800],['23.5','7.25']]){
 const input={id:'new_subject',name:'New Subject',class:'9',theoryFullMarks,practicalFullMarks,creditHour:2};
 const subject=validateSchoolSubject(input);
 assert.equal(subject.theoryFullMarks,Number(theoryFullMarks));
 assert.equal(subject.practicalFullMarks,Number(practicalFullMarks));
 const writes=[];
 const api={doc:(_db,...parts)=>parts.join('/'),runTransaction:async(_db,fn)=>fn({get:async()=>({exists:()=>false}),set:(ref,data)=>writes.push([ref,data])})};
 await createSchoolSubject({db:{},api,actor:{uid:'admin-a',role:'school_admin',active:true,schoolId},schoolId,input});
 assert.equal(writes.length,1);
 assert.equal(writes[0][1].theoryFullMarks,Number(theoryFullMarks));
 assert.equal(writes[0][1].practicalFullMarks,Number(practicalFullMarks));
 assert.equal(writes[0][1].schoolId,schoolId);
}
for(const bad of [{},{theoryFullMarks:100},{practicalFullMarks:100},{theoryFullMarks:-1,practicalFullMarks:10},{theoryFullMarks:Infinity,practicalFullMarks:0},{theoryFullMarks:'',practicalFullMarks:0}]){
 assert.throws(()=>validateSchoolSubject({id:'math',name:'Mathematics',class:'9',creditHour:2,...bad}),/full marks/);
}
console.log('V47 subject creation stores configurable full marks');
