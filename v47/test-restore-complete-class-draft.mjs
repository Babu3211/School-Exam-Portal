import assert from 'node:assert/strict';
import {verifyStoredCompleteClassDraft} from './restore-complete-class-draft.mjs';
import {prepareCompleteClassDraft} from './complete-class-draft-document.mjs';
const schoolId='300160003',classId='9',subjectId='computer',examId='final';
const actor={uid:'adminA',schoolId,role:'school_admin',active:true};
const settings={settingsId:'9_computer_final',schoolId,classId,subjectId,examId,active:true,components:[
 {key:'internal',name:'Internal',fullMarks:4},
 {key:'practical',name:'Practical',fullMarks:36},
 {key:'term',name:'Term',fullMarks:10}
]};
const expectedStudentIds=['s1','s2'];
const d=prepareCompleteClassDraft({
 actor,schoolId,classId,subjectId,examId,settings,expectedStudentIds,
 drafts:[{studentId:'s1',values:{internal:4,practical:36,term:10}},{studentId:'s2',isAbsent:true}]
});
const stored={...d.data,updatedAt:{seconds:1790000000}};
const args={schoolId,classId,subjectId,examId,settings,expectedStudentIds,stored};
const r=verifyStoredCompleteClassDraft(args);
assert.equal(r.rosterCount,2);
assert.equal(r.entries[0].totalObtained,50);
assert.equal(r.entries[1].isAbsent,true);
assert.equal(r.entries[1].values,null);
assert.equal(r.previewOnly,true);
assert.equal(r.publicationAllowed,false);
assert.equal(r.writeAuthorized,false);
for(const [change,re] of [
 [{stored:{...stored,state:'published'}},/mismatch/],
 [{stored:{...stored,schoolId:'999999999'}},/mismatch/],
 [{stored:{...stored,subjectId:'math'}},/mismatch/],
 [{stored:{...stored,revision:0}},/revision/],
 [{stored:{...stored,unexpected:'x'}},/Unexpected/],
 [{expectedStudentIds:['s1']},/roster/],
 [{stored:{...stored,entries:[stored.entries[0]]}},/roster/],
 [{stored:{...stored,entries:[stored.entries[0],stored.entries[0]]}},/incomplete|duplicate|roster/i],
 [{stored:{...stored,entries:stored.entries.map((x,i)=>i?{...x,totalObtained:20}:x)}},/absent/],
 [{stored:{...stored,entries:stored.entries.map((x,i)=>i?x:{...x,totalObtained:40})}},/total mismatch/],
 [{stored:{...stored,entries:stored.entries.map((x,i)=>i?x:{...x,values:{internal:6,practical:36,term:10}})}},/exceeds/],
 [{stored:{...stored,entries:stored.entries.map((x,i)=>i?x:{...x,values:{internal:4,practical:36,term:10},official:true})}},/Malformed/],
 [{settings:{...settings,settingsId:'x'}},/Settings/],
 [{stored:{...stored,entries:stored.entries.map((x,i)=>i?{...x,studentId:'alien'}:x)}},/incomplete|out-of-roster/i]
 ])assert.throws(()=>verifyStoredCompleteClassDraft({...args,...change}),re);
console.log('PASS verified stored Draft restore: exact school/roster/settings, 4/36/10 dynamic marks, integrity, no official results');
