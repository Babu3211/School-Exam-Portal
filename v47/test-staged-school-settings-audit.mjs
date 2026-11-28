import assert from 'node:assert/strict';
import {summarizeStagedSettings,decodeScopedDocument} from './diagnostics/staged-school-settings-audit.mjs';
const schoolId='12345',school={id:schoolId,active:false},row=(id,fields)=>({id,fields:{schoolId,...fields}});
const subjects=[row('computer',{class:'9',name:'Computer',active:true})],settings=[row('9_computer_1st',{id:'9_computer_1st',classId:'9',subjectId:'computer',examId:'1st',active:true,components:[{key:'p',name:'Participation',fullMarks:4},{key:'q',name:'Practical/Project',fullMarks:36},{key:'t',name:'First Term Examination',fullMarks:10}]}),row('legacy',{classGroup:'9-10'})];
const members=[row('admin',{uid:'admin',role:'school_admin',active:true}),row('teacher',{uid:'teacher',role:'teacher',active:true})];
const assignments=[row('12345:teacher:9:computer',{uid:'teacher',classId:'9',subjectId:'computer',active:true})];
const args={schoolId,school,subjects,settings,members,assignments},r=summarizeStagedSettings(args);
assert.equal(r.schoolActive,false);assert.equal(r.matchedClassTermSubjects,1);assert.equal(r.reviewClassTermSubjects,3);assert.equal(r.otherOrLegacySettings,1);assert.equal(r.invalidAssignmentRecords,0);assert.equal(r.activationAuthorized,false);
assert.equal(r.matrix.length,40);assert.equal(JSON.stringify(r).includes('computer'),false);
assert.throws(()=>summarizeStagedSettings({...args,subjects:[row('x',{schoolId:'99999'})]}),/foreign/);
assert.equal(summarizeStagedSettings({...args,members:[members[0]]}).invalidAssignmentRecords,1);
assert.equal(summarizeStagedSettings({...args,settings:[row('bad',{...settings[0].fields})]}).settingsIdentityMismatches,1);
const prefix='projects/p/databases/(default)/documents/schools/12345/subjects/';
assert.deepEqual(decodeScopedDocument({name:prefix+'x',fields:{name:{stringValue:'गणित'},active:{booleanValue:true},n:{integerValue:'4'}}},prefix),{id:'x',fields:{name:'गणित',active:true,n:4}});
assert.throws(()=>decodeScopedDocument({name:prefix+'x/sub/y'},prefix),/path/);
console.log('PASS staged school aggregate audit: four terms, legacy settings, inactive registry, foreign records, assignments, masked REST decode, no identity output');

import {validateTargetCredential} from './diagnostics/staged-school-settings-audit.mjs';
const fixtureCredential={type:'service_account',project_id:'smss-exam-portal-v47',client_email:'fixture@example.invalid',private_key:'synthetic-only'};
assert.equal(validateTargetCredential(fixtureCredential),fixtureCredential);
assert.throws(()=>validateTargetCredential({...fixtureCredential,project_id:'exam-portal-smss-95016'}),/Unexpected target/);
assert.throws(()=>validateTargetCredential(null),/Unexpected target/);

import {summarizeLegacySettings} from './diagnostics/staged-school-settings-audit.mjs';
{
 const legacy=row('legacy-explicit',{classGroup:'9-10',className:'कक्षा ९',subject:'Computer',term:'First',components:[{name:'Participation',fullMarks:4},{name:'Practical/Project',fullMarks:36},{name:'First Term Examination',fullMarks:10}]});
 const result=summarizeLegacySettings({schoolId,subjects,settings:[legacy,{...legacy,id:'legacy-missing-term',fields:{...legacy.fields,term:undefined}},{...legacy,id:'legacy-conflict',fields:{...legacy.fields,examId:'final'}},{...legacy,id:'legacy-wrong',fields:{...legacy.fields,className:'8'}}]});
 assert.equal(result.validatedPreviews,1);assert.equal(result.classification['Exact mapping preview only'],1);assert.equal(result.classification['Explicit term review required'],2);assert.equal(result.classification['Class-specific identity conflict'],1);
 assert.equal(result.writeAuthorized,false);assert.equal(JSON.stringify(result).includes('Computer'),false);
 const inactive=summarizeStagedSettings({...args,members:[members[0],{...members[1],fields:{...members[1].fields,active:false}}]});
 assert.equal(inactive.assignmentReviewReasons['Teacher membership inactive'],1);
}

{
 const malformed=[
  row('odd-class',{classGroup:'constructor',subject:'Computer',components:[]}),
  row('odd-term',{classGroup:'9-10',className:'9',subject:'Computer',term:'constructor',components:[]}),
  row('odd-object',{classGroup:{toString:1},className:{toString:1},subject:'Computer',components:[]})
 ];
 const safe=summarizeLegacySettings({schoolId,subjects,settings:malformed});
 assert.equal(safe.records,3);assert.equal(safe.validatedPreviews,0);
 assert.equal(safe.classification['Unrecognized legacy structure'],2);
 assert.equal(safe.classification['Explicit term review required'],1);
}

import {summarizeLegacySubjectCandidates} from './diagnostics/staged-school-settings-audit.mjs';
{
 const primarySubjects=[row('math',{class:'1',name:'Mathematics',active:true})];
 const primary=row('old',{classGroup:'1-3',className:'1',subject:'गणित',components:[{name:'No. of Learning Achievement',fullMarks:3},{name:'Full Marks',fullMarks:12},{name:'Obtained Learning Achievement',fullMarks:12}]});
 const r=summarizeLegacySubjectCandidates({schoolId,subjects:primarySubjects,settings:[primary]});
 assert.equal(r.classification['Unique existing alias candidate'],1);
 assert.equal(r.componentShapeValid,1);assert.equal(r.termAssigned,false);assert.equal(r.writeAuthorized,false);
 const ambiguous=summarizeLegacySubjectCandidates({schoolId,subjects:[...primarySubjects,row('math2',{class:'1',name:'Math',active:true})],settings:[primary]});
 assert.equal(ambiguous.classification['Ambiguous within class'],1);assert.equal(ambiguous.componentShapeValid,0);
 const wrong=summarizeStagedSettings({...args,assignments:[row('12345:teacher:8:computer',{uid:'teacher',classId:'8',subjectId:'computer',active:true})]});
 assert.equal(wrong.assignmentReviewReasons['Subject registered to different class'],1);
 const missing=summarizeStagedSettings({...args,assignments:[row('12345:teacher:9:unknown',{uid:'teacher',classId:'9',subjectId:'unknown',active:true})]});
 assert.equal(missing.assignmentReviewReasons['Missing subject ID'],1);
}
