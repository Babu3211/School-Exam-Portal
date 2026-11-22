import assert from 'node:assert/strict';
import {inspectConfiguredClassMarks} from './configured-mark-preflight.mjs';
const context={schoolId:'123456789',subjectId:'computer_9',examId:'monthly',classId:'9'};
const settings={...context,active:true,components:[
 {key:'project',name:'Project',fullMarks:7},
 {key:'theory',name:'Theory',fullMarks:43},
 {key:'practical',name:'Practical',fullMarks:15},
 {key:'viva',name:'Viva',fullMarks:5}
]};
const roster=['s1','s2','s3'];
const draft=(id,values)=>({studentId:id,values});
const valid=[draft('s1',{project:7,theory:43,practical:15,viva:5}),draft('s2',{project:0,theory:0,practical:0,viva:0}),{studentId:'s3',isAbsent:true}];
const check=(drafts,options={})=>inspectConfiguredClassMarks({...context,settings,expectedStudentIds:roster,drafts,...options});
const complete=check(valid);
assert.equal(complete.complete,true);
assert.equal(complete.components.length,4);
assert.equal(complete.ready[0].totalObtained,70);
assert.equal(complete.writeAuthorized,false);
assert.equal(complete.publicationAllowed,false);
assert.equal(check(valid.slice(0,2)).complete,false,'Incomplete class must not pass');
assert.equal(check([valid[0],draft('s2',{project:8,theory:0,practical:0,viva:0}),valid[2]]).complete,false,'Configured maximum must apply');
assert.equal(check([valid[0],draft('s2',{project:4,theory:36,practical:10,viva:0}),valid[2]]).complete,true,'No hardcoded 4/36/10 maxima');
assert.equal(check([valid[0],draft('s2',{project:4,theory:36,practical:10}),valid[2]]).complete,false,'All configured components required');
assert.equal(check([valid[0],draft('s2',{project:4,theory:36,practical:10,viva:1,extra:1}),valid[2]]).complete,false,'Unknown component forbidden');
assert.equal(check([valid[0],draft('s2',{project:4,theory:36,practical:10,viva:-1}),valid[2]]).complete,false,'Negative scores forbidden');
assert.equal(check([valid[0],draft('s2',{project:4,theory:36,practical:10,viva:'NaN'}),valid[2]]).complete,false,'Invalid numeric scores forbidden');
assert.throws(()=>check([valid[0],valid[0],valid[2]]),/Duplicate/);
assert.throws(()=>check([valid[0],valid[1],draft('outside',{project:1,theory:1,practical:1,viva:1})]),/out-of-roster/);
assert.throws(()=>check(valid,{settings:{...settings,schoolId:'999999999'}}),/Verified subject/);
assert.throws(()=>check(valid,{settings:{...settings,components:[settings.components[0],settings.components[0]]}}),/duplicate/);
console.log('PASS: arbitrary Examination Settings components and complete-class validation (read-only)');
