import assert from 'node:assert/strict';
import {inspectClassMarkDraft} from './class-mark-draft-inspector.mjs';
const schoolId='12345678',classId='9',term='1st',subjectId='math';
const mark=(studentId,overrides={})=>({studentId,class:classId,term,subjectId,theory:30,practical:10,...overrides});
const base={schoolId,classId,term,subjectId,expectedStudentIds:['s1','s2']};
{
 const x=inspectClassMarkDraft({...base,entries:[mark('s1'),mark('s2')]});
 assert.equal(x.ready,true);assert.equal(x.expected,2);assert.equal(x.entered,2);
}
{
 const x=inspectClassMarkDraft({...base,entries:[mark('s1')]});
 assert.equal(x.ready,false);assert.deepEqual(x.missing,['s2']);
}
{
 const x=inspectClassMarkDraft({...base,entries:[mark('s1',{theory:''}),mark('s2',{practical:'abc'})]});
 assert.equal(x.ready,false);assert.equal(x.invalid.length,2);
}
{
 const x=inspectClassMarkDraft({...base,entries:[mark('s1'),mark('s1'),mark('foreign')]});
 assert.equal(x.ready,false);assert.deepEqual(x.duplicates,['s1']);assert.deepEqual(x.foreign,['foreign']);
}
{
 const ids=Array.from({length:1500},(_,i)=>'s'+i);
 const x=inspectClassMarkDraft({...base,expectedStudentIds:ids,entries:ids.map(mark)});
 assert.equal(x.ready,true);assert.equal(x.expected,1500);
}
for(const bad of [
 {...base,expectedStudentIds:['s1','s1'],entries:[]},
 {...base,classId:'99',entries:[]},
 {...base,term:'midterm',entries:[]},
 {...base,subjectId:'../math',entries:[]},
 {...base,expectedStudentIds:Array.from({length:1501},(_,i)=>'s'+i),entries:[]}
])assert.throws(()=>inspectClassMarkDraft(bad));
{
 const ids=Array.from({length:1500},(_,i)=>'s'+i);
 const x=inspectClassMarkDraft({...base,expectedStudentIds:ids,entries:ids.slice(0,1499).map(mark)});
 assert.equal(x.ready,false);assert.deepEqual(x.missing,['s1499']);
}
{
 const x=inspectClassMarkDraft({...base,entries:[mark('s1',{class:'8'}),mark('s2',{term:'final'})]});
 assert.equal(x.ready,false);assert.equal(x.invalid.length,2);
}
{
 const x=inspectClassMarkDraft({...base,entries:[mark('s1',{theory:101}),mark('s2',{practical:-1})]});
 assert.equal(x.ready,false);assert.equal(x.invalid.length,2);
}
console.log('V47 1500-student draft inspection tests passed');
