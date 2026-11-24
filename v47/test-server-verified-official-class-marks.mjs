import assert from 'node:assert/strict';
import {resolveVerifiedOfficialClassMarks} from './server-verified-official-class-marks.mjs';
const scope={schoolId:'12345',classId:'9',subjectId:'computer',examId:'final'};
const settings={...scope,active:true,components:[{key:'theory',name:'Theory',fullMarks:36},{key:'practical',name:'Practical',fullMarks:10},{key:'internal',name:'Internal',fullMarks:4}]};
const expectedStudentIds=Array.from({length:1500},(_,i)=>'s'+String(i).padStart(4,'0'));
const pointer={...scope,publicationId:'pub_00000001',rosterCount:1500,digest:'a'.repeat(64)};
const publication={...pointer,state:'committed'};
const entries=expectedStudentIds.map(studentId=>({studentId,publicationId:pointer.publicationId,isAbsent:false,values:{theory:35,practical:9,internal:4},totalObtained:48}));
const args={...scope,settings,expectedStudentIds,pointer,publication,entries};
assert.equal(resolveVerifiedOfficialClassMarks(args).rosterCount,1500);
assert.deepEqual(resolveVerifiedOfficialClassMarks(args).components,settings.components,'Verified component names and limits accompany committed marks');
assert.equal(resolveVerifiedOfficialClassMarks({...args,pointer:null,publication:null,entries:[]}).published,false);
const rejects=(changes,pattern)=>assert.throws(()=>resolveVerifiedOfficialClassMarks({...args,...changes}),pattern);
rejects({expectedStudentIds:expectedStudentIds.slice(1)},/roster differs/);
rejects({expectedStudentIds:[...expectedStudentIds.slice(0,-1),'foreign']},/foreign or inactive/);
rejects({entries:entries.map((r,i)=>i? r:{...r,values:{...r.values,theory:37},totalObtained:50})},/exceeds Examination Settings/);
rejects({entries:entries.map((r,i)=>i?r:{...r,values:{theory:35,practical:9},totalObtained:44})},/component keys differ/);
rejects({settings:{...settings,components:[{key:'theory',name:'Theory',fullMarks:30},...settings.components.slice(1)]}},/exceeds Examination Settings/);
rejects({settings:{...settings,schoolId:'67890'}},/Verified subject examination settings/);
// Alternate Computer component settings must be authoritative, not fixed 4/36/10.
const alternateSettings={...settings,components:[{key:'written',name:'Written',fullMarks:80},{key:'practical',name:'Practical',fullMarks:20}]};
const alternateEntries=entries.map(row=>({...row,values:{written:75,practical:18},totalObtained:93}));
assert.equal(resolveVerifiedOfficialClassMarks({...args,settings:alternateSettings,entries:alternateEntries}).rosterCount,1500);
rejects({settings:alternateSettings},/component keys differ/);
rejects({settings:alternateSettings,entries:alternateEntries.map((row,i)=>i?row:{...row,values:{written:81,practical:18},totalObtained:99})},/exceeds Examination Settings/);
assert.equal(resolveVerifiedOfficialClassMarks({...args,entries:entries.map((row,i)=>i?row:{...row,isAbsent:true,values:null,totalObtained:0})}).entries[0].isAbsent,true);
console.log('V47 verified official class marks: 1500 students, roster and dynamic component limits enforced');

const primaryScope={...scope,classId:'1',subjectId:'math'};
const primaryPointer={...pointer,...primaryScope,rosterCount:1};
const primarySettings={...primaryScope,active:true,components:[
 {key:'count',name:'No. of Learning Achievement',fullMarks:10},
 {key:'got',name:'Obtained Learning Achievement',fullMarks:40}]};
const primaryArgs={...primaryScope,settings:primarySettings,pointer:primaryPointer,publication:{...primaryPointer,state:'committed'},
 expectedStudentIds:['s1'],entries:[{studentId:'s1',publicationId:pointer.publicationId,isAbsent:false,values:{count:5,got:20},totalObtained:25}]};
assert.equal(resolveVerifiedOfficialClassMarks(primaryArgs).published,true);
assert.throws(()=>resolveVerifiedOfficialClassMarks({...primaryArgs,entries:[{...primaryArgs.entries[0],values:{count:5,got:21},totalObtained:26}]}),/learning achievement/);
