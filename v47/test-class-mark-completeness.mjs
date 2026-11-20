import assert from 'node:assert/strict';
import {validateCompleteClassMarks} from './class-mark-completeness.mjs';
const schoolId='school-a',classId='9',term='1st',subjectId='math';
const mark=(studentId,overrides={})=>({studentId,class:classId,term,subjectId,theory:30,practical:10,...overrides});
const args={schoolId,classId,term,subjectId,expectedStudentIds:['student-1','student-2']};
assert.equal(validateCompleteClassMarks({...args,entries:[mark('student-2'),mark('student-1')]}).count,2);
assert.throws(()=>validateCompleteClassMarks({...args,entries:[mark('student-1')]}),/Cannot save: 1 students/);
assert.throws(()=>validateCompleteClassMarks({...args,entries:[]}),/Cannot save: 2 students/);
assert.throws(()=>validateCompleteClassMarks({...args,entries:[mark('student-1'),mark('student-1')]}),/Duplicate student/);
assert.throws(()=>validateCompleteClassMarks({...args,entries:[mark('student-1'),mark('outsider')]}),/not in selected/);
assert.throws(()=>validateCompleteClassMarks({...args,entries:[mark('student-1'),mark('student-2',{subjectId:'science'})]}),/Mixed class/);
assert.throws(()=>validateCompleteClassMarks({...args,entries:[mark('student-1'),mark('student-2',{theory:''})]}),/Marks must/);
assert.throws(()=>validateCompleteClassMarks({...args,expectedStudentIds:['student-1','student-1'],entries:[mark('student-1')]}),/duplicate roster/);
assert.throws(()=>validateCompleteClassMarks({...args,expectedStudentIds:[],entries:[]}),/Class roster required/);
assert.throws(()=>validateCompleteClassMarks({...args,schoolId:'../other',entries:[mark('student-1')]}),/Invalid school ID/);
assert.throws(()=>validateCompleteClassMarks({...args,expectedStudentIds:Array.from({length:1501},(_,i)=>'s'+i),entries:[]}),/Class roster required/);
assert.throws(()=>validateCompleteClassMarks({...args,entries:Array.from({length:1501},(_,i)=>mark('s'+i))}),/Mark entries required/);
for(const invalid of ['   ',true,false,[],{},'0x10','1e2','Infinity','NaN','-1','101']){
 assert.throws(()=>validateCompleteClassMarks({...args,entries:[mark('student-1'),mark('student-2',{theory:invalid})]}),/Marks must/,'Invalid theory score: '+String(invalid));
 assert.throws(()=>validateCompleteClassMarks({...args,entries:[mark('student-1'),mark('student-2',{practical:invalid})]}),/Marks must/,'Invalid practical score: '+String(invalid));
}
assert.equal(validateCompleteClassMarks({...args,entries:[mark('student-1',{theory:'0',practical:'10.5'}),mark('student-2',{theory:'.5',practical:0})]}).count,2);
console.log('V47 class marks completeness checks passed');
