import assert from 'node:assert/strict';
import {verifyClassMarksCoverage} from './class-marks-coverage.mjs';
const students=[{id:'s1',class:'9',active:true},{id:'s2',class:'9',active:true}];
const subjects=[{id:'math',class:'9',active:true},{id:'computer',class:'9',active:true}];
const records=students.flatMap(s=>subjects.map(sub=>({studentId:s.id,subjectId:sub.id,class:'9',term:'final'})));
const base={students,subjects,records,schoolClass:'9',term:'final'};
assert.deepEqual(verifyClassMarksCoverage(base),{complete:true,studentCount:2,subjectCount:2,recordCount:4});
for(const overrides of [
 {records:records.slice(0,3)},
 {records:[...records,records[0]]},
 {records:[...records.slice(0,3),{...records[3],studentId:'outsider'}]},
 {records:[...records.slice(0,3),{...records[3],subjectId:'foreign'}]},
 {records:[...records.slice(0,3),{...records[3],term:'1st'}]},
 {students:[...students,students[0]]},
 {subjects:[...subjects,{...subjects[0],id:'other',class:'10'}]},
 {hasMore:true},
 {students:[]},
 {subjects:[]}
])assert.throws(()=>verifyClassMarksCoverage({...base,...overrides}));
console.log('V47 class mark coverage gate tests passed');
