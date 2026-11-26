import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {primarySubjectKey,draftThemeSlots,loadPrimaryTeacherWorksheet,loadAssignedPrimarySubjects} from './primary-assessment-teacher-worksheet.mjs';
const catalogue=JSON.parse(readFileSync(new URL('./primary-assessment-reference-2083.json',import.meta.url)));
assert.equal(primarySubjectKey('नेपाली'),'nepali');assert.equal(primarySubjectKey('Mathematics'),'mathematics');assert.equal(primarySubjectKey('Optional Mathematics'),null);
const sid='300160003',actor={schoolId:sid,uid:'teacher1',role:'teacher',active:true},grade='4';
let active=true,role='teacher',foreign=false,studentForeign=false,revoked=false;
const school='schools/'+sid;
const subject={schoolId:sid,class:grade,name:'नेपाली',active:true};
const assignment={schoolId:sid,classId:grade,subjectId:'nep',uid:actor.uid};
const doc=(id,data)=>({id,data:()=>data,exists:()=>true});
const api={doc:(_,...p)=>p.join('/'),collection:(_,...p)=>p.join('/'),query:(path,...constraints)=>({path,constraints}),where:(...p)=>p,orderBy:(...p)=>p,limit:(...p)=>p,startAfter:(...p)=>p,
 getDocFromServer:async p=>{if(p===school)return doc(sid,{id:sid,active:true});if(p===school+'/members/'+actor.uid)return doc(actor.uid,{uid:actor.uid,schoolId:sid,role,active:true});if(p===school+'/subjects/nep')return doc('nep',subject);if(p===school+'/teacher_assignments/'+sid+':teacher1:4:nep')return doc('a',{...assignment,active,schoolId:foreign?'99999':sid});throw Error('Unexpected document read')},
 getDocsFromServer:async q=>{if(q.path===school+'/subjects')return {docs:[doc('nep',subject)]};if(q.path===school+'/students')return {docs:[doc('s1',{schoolId:studentForeign?'99999':sid,class:grade,name:'Student',active:true})]};throw Error('Unexpected collection')}}
const args={db:{},api,actor,schoolId:sid,grade,catalogue,subjectId:'nep',assertCurrent:()=>{if(revoked)throw Error('Stale')}};
assert.equal((await loadAssignedPrimarySubjects(args)).length,1);
const model=await loadPrimaryTeacherWorksheet(args);assert.equal(model.students.length,1);assert.equal(model.writeAuthorized,false);assert.equal(model.officialAssessmentApproved,false);
assert.equal(draftThemeSlots(model,0).length,6);assert.equal(draftThemeSlots(model,0)[0].min,1);
assert.equal(draftThemeSlots({writeAuthorized:false,officialAssessmentApproved:false,key:'serophero',themes:[{scoreBlocks:2,fullMarks:8}]},0)[0].min,0);
assert.throws(()=>draftThemeSlots({...model,writeAuthorized:true},0));
active=false;assert.equal((await loadAssignedPrimarySubjects(args)).length,0);await assert.rejects(loadPrimaryTeacherWorksheet(args),/inactive/);active=true;
foreign=true;await assert.rejects(loadAssignedPrimarySubjects(args),/identity mismatch/);await assert.rejects(loadPrimaryTeacherWorksheet(args),/mismatched/);foreign=false;
studentForeign=true;await assert.rejects(loadPrimaryTeacherWorksheet(args),/Cross-school/);studentForeign=false;
role='viewer';await assert.rejects(loadPrimaryTeacherWorksheet(args),/membership changed/);role='teacher';
await assert.rejects(loadPrimaryTeacherWorksheet({...args,actor:{...actor,role:'viewer'}}),/Verified primary teacher/);
await assert.rejects(loadPrimaryTeacherWorksheet({...args,schoolId:'99999'}),/Verified primary teacher/);
revoked=true;await assert.rejects(loadPrimaryTeacherWorksheet(args),/Stale/);
console.log('PASS primary teacher worksheet: verified assignments, source counts, active roster, stale and tenant rejection, no persistence');
