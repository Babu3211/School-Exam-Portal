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

import {buildLocalReviewWorkbooks} from './diagnostics/staged-school-settings-audit.mjs';
{
 const legacy=row('old-settings',{classGroup:'9-10',className:'9',subject:'Computer',components:[{name:'Participation',fullMarks:4},{name:'Practical/Project',fullMarks:36},{name:'First Term Examination',fullMarks:10}]});
 const legacy2={...legacy,id:'old-settings-two'};
 const missingAssignment=row('12345:teacher:9:missing',{uid:'teacher',classId:'9',subjectId:'missing',subjectName:'Computer',active:false});
 const input={...args,settings:[legacy,legacy2],assignments:[missingAssignment]};
 const result=summarizeStagedSettings(input);
 assert.equal(result.legacySubjectCandidates.componentShapeValid,2);
 assert.equal(result.legacySubjectCandidates.distinctValidatedTargetSubjects,1);
 assert.equal(result.legacySubjectCandidates.conflictingTargetSubjects,1);
 const files=buildLocalReviewWorkbooks(input);
 assert.equal(files.settingsRows,2);assert.equal(files.assignmentRows,1);assert.equal(files.writeAuthorized,false);
 const settingXML=new TextDecoder().decode(await files.settingsBlob.arrayBuffer());
 const assignmentXML=new TextDecoder().decode(await files.assignmentBlob.arrayBuffer());
 assert.match(settingXML,/Conflicting legacy records/);assert.match(settingXML,/Approved term \(operator review only\)/);
 assert.match(assignmentXML,/Missing subject ID/);assert.match(assignmentXML,/Computer/);
 assert.throws(()=>buildLocalReviewWorkbooks({...input,settings:[{...legacy,fields:{...legacy.fields,schoolId:'99999'}}]}),/foreign/);
}

import {summarizeTermCompatibility} from './diagnostics/staged-school-settings-audit.mjs';
{
 const termSubject=row('c9',{class:'9',name:'Computer',active:true});
 const termSettings=row('oldc9',{classGroup:'9-10',className:'9',subject:'Computer',components:[{name:'Participation',fullMarks:4},{name:'Practical/Project',fullMarks:36},{name:'First Term Examination',fullMarks:10}]});
 const input={schoolId,subjects:[termSubject],settings:[termSettings]};
 const report=summarizeTermCompatibility(input);
 assert.equal(report.distinctSingleSourceSubjects,1);
 assert.equal(report.byTerm['1st']['Schema compatible'],1);
 assert.equal(report.byTerm['2nd']['Schema compatible'],1);
 assert.equal(report.byTerm.final['Configured settings valid'],1);
 assert.equal(report.termAssigned,false);assert.equal(report.writeAuthorized,false);
 const conflicting=summarizeTermCompatibility({...input,settings:[termSettings,{...termSettings,id:'oldc9b'}]});
 assert.equal(conflicting.conflictingTargets,1);assert.equal(conflicting.distinctSingleSourceSubjects,0);
 const annual={...termSettings,fields:{...termSettings.fields,components:[...termSettings.fields.components,{name:'TH (Theory)',fullMarks:50}]}};
 const ar=summarizeTermCompatibility({...input,settings:[annual]});
 assert.equal(ar.byTerm.final['Schema compatible'],1);assert.equal(ar.byTerm['1st']['Configured settings valid'],1);
 const primarySubject=row('p1',{class:'1',name:'Mathematics',active:true});
 const primarySetting=row('p1old',{classGroup:'1-3',className:'1',subject:'गणित',components:[{name:'No. of Learning Achievement',fullMarks:3},{name:'Full Marks',fullMarks:12},{name:'Obtained Learning Achievement',fullMarks:12}]});
 const pr=summarizeTermCompatibility({schoolId,subjects:[primarySubject],settings:[primarySetting]});
 assert.equal(pr.byTerm.final['Schema compatible'],1);
 assert.equal(pr.byTerm['1st']['Schema compatible'],1);
 const bad={...termSettings,fields:{...termSettings.fields,components:[{name:'Participation',fullMarks:5},{name:'Practical/Project',fullMarks:36},{name:'First Term Examination',fullMarks:10}]}};
 const custom=summarizeTermCompatibility({...input,settings:[bad]});assert.equal(custom.noCompatibleTerm,0);assert.equal(custom.byTerm['1st']['Configured settings valid'],1);
}

{
 const primarySubject=row('p1',{class:'1',name:'Mathematics',active:true});
 const custom=row('p1custom',{classGroup:'1-3',className:'1',subject:'Math',components:[{name:'Assessment',fullMarks:137.5},{name:'Project',fullMarks:62.5}]});
 const report=summarizeTermCompatibility({schoolId,subjects:[primarySubject],settings:[custom]});
 assert.equal(report.distinctSingleSourceSubjects,1);assert.equal(report.byTerm.final['Configured settings valid'],1);
}

import {summarizeRegisteredSubjectCoverage} from './diagnostics/staged-school-settings-audit.mjs';
{
 const customSubjects=[row('math9',{class:'9',name:'Mathematics',active:true}),row('math10',{class:'10',name:'Mathematics',active:true}),row('music9',{class:'9',name:'Music',active:true}),row('art9',{class:'9',name:'Art',active:true})];
 const group=row('group',{classGroup:'9-10',subject:'Mathematics',components:[{name:'Assessment',fullMarks:137.5}]});
 const single=row('single',{classGroup:'9-10',className:'9',subject:'Mathematics',components:[{name:'Assessment',fullMarks:50}]});
 const r=summarizeRegisteredSubjectCoverage({schoolId,subjects:customSubjects,settings:[group,single]});
 assert.equal(r.classification['Overlapping source records'],1);
 assert.equal(r.classification['Group source review required'],1);
 assert.equal(r.classification['No candidate source'],2);
 assert.equal(r.termAssigned,false);assert.equal(r.writeAuthorized,false);
 const missing=(id,label)=>row('12345:teacher:9:'+id,{uid:'teacher',classId:'9',subjectId:id,subjectName:label,active:false});
 const input={...args,subjects:customSubjects,settings:[group,single],assignments:[missing('m1','Music'),missing('m2','Unknown subject'),missing('m3','')]};
 const result=summarizeStagedSettings(input);
 assert.equal(result.orphanAssignmentReview['Unique label candidate'],1);
 assert.equal(result.orphanAssignmentReview['No matching class subject'],1);
 assert.equal(result.orphanAssignmentReview['No stored subject label'],1);
 const files=buildLocalReviewWorkbooks(input);assert.equal(files.assignmentRows,3);
 assert.match(new TextDecoder().decode(await files.assignmentBlob.arrayBuffer()),/No matching class subject/);
}

{
 const a=row('math6',{class:'6',name:'Mathematics',active:true});
 const b=row('math7',{class:'7',name:'Mathematics',active:true});
 const group=row('group',{classGroup:'6-8',subject:'Math',components:[{name:'Assessment',fullMarks:137.5},{name:'Project',fullMarks:62.5}]});
 const same=row('same',{...group.fields,className:'6',subject:'Mathematics'});
 const other=row('other',{...group.fields,className:'7',components:[{name:'Assessment',fullMarks:100},{name:'Project',fullMarks:100}]});
 const input={...args,subjects:[a,b],settings:[group,same,other],assignments:[]};
 const r=summarizeRegisteredSubjectCoverage(input);
 assert.equal(r.classification['Overlapping source records'],2);
 assert.equal(r.overlapClassification['Identical validated components'],1);
 assert.equal(r.overlapClassification['Different configured components'],1);
 assert.equal(r.writeAuthorized,false);assert.equal(r.termAssigned,false);
 const files=buildLocalReviewWorkbooks(input);
 assert.equal(files.coverageRows,4);
 const content=new TextDecoder().decode(await files.coverageBlob.arrayBuffer());
 assert.match(content,/Identical validated components/);assert.match(content,/Different configured components/);assert.match(content,/137.5/);
 const swapped={...same,fields:{...same.fields,components:[...same.fields.components].reverse()}};
 assert.equal(summarizeRegisteredSubjectCoverage({...input,settings:[group,swapped,other]}).overlapClassification['Different configured components'],2);
}
console.log('PASS duplicate sources: ordered labels and configured maxima, equal totals with different parts, private review workbook');

{
 const a=row('p1',{class:'1',name:'Mathematics',active:true});
 const make=(id,count,full,obtained,scope={})=>row(id,{classGroup:'1-3',subject:'Math',...scope,components:[{name:'No. of Learning Achievement',fullMarks:count},{name:'Full Marks',fullMarks:full},{name:'Obtained Learning Achievement',fullMarks:obtained}]});
 const input={...args,subjects:[a],settings:[make('group',0,0,0),make('class',3,12,12,{className:'1'})],assignments:[]};
 const r=summarizeRegisteredSubjectCoverage(input);
 assert.equal(r.overlapClassification['Invalid or unverified source components'],1);
 assert.equal(r.unresolvedSourceIssues['Zero achievement placeholder (not an entry setting)'],1);
 const bad=summarizeRegisteredSubjectCoverage({...input,settings:[make('group',3,11,11),input.settings[1]]});
 assert.equal(bad.unresolvedSourceIssues['Primary count and maximum mismatch'],1);
 const file=buildLocalReviewWorkbooks(input);
 assert.match(new TextDecoder().decode(await file.coverageBlob.arrayBuffer()),/Zero achievement placeholder/);
}

{
 const duty=row('12345:teacher:9:attendance',{uid:'teacher',classId:'9',subjectId:'attendance',active:true});
 const r=summarizeStagedSettings({...args,assignments:[duty]});
 assert.equal(r.invalidAssignmentRecords,0);assert.equal(r.assignmentReviewReasons['Structurally valid attendance duty'],1);assert.deepEqual(r.orphanAssignmentReview,{});
 assert.equal(buildLocalReviewWorkbooks({...args,assignments:[duty]}).assignmentRows,0);
 const inactive={...args,members:[members[0],{...members[1],fields:{...members[1].fields,active:false}}],assignments:[duty]};
 assert.equal(summarizeStagedSettings(inactive).invalidAssignmentRecords,1);
}

import {summarizeMigratedReportCoverage} from './diagnostics/staged-school-settings-audit.mjs';
import {iemisEntrySchema,iemisEntryValues} from './iemis-entry.js';
{
 const classNo='1',term='1st',examId='historical1';
 const students=[row('s1',{class:classNo,active:true,name:'Private Student'})];
 const subjects=[row('english',{class:classNo,active:true,name:'English',creditHour:4})];
 const exams=[row(examId,{class:classNo,term,termKey:'first',academicYear:'2083',active:true})];
 const marks=[row('m1',{...iemisEntryValues(iemisEntrySchema(classNo,'first','English'),{values:{count:'10',obtained:'35'},isAbsent:false,incompatible:false}),class:classNo,term,termKey:'first',academicYear:'2083',examId,studentId:'s1',subjectId:'english',subject:'English'})];
 const args={schoolId,school:{id:schoolId,active:true},students,subjects,exams,marks};
 const report=await summarizeMigratedReportCoverage(args);assert.equal(report.rows.length,9);assert.equal(report.rows[0].completePreviews,1);assert.equal(report.rows[0].missingFullGridPairs,0);assert.equal(report.liveIemisCompared,false);assert.equal(JSON.stringify(report).includes('Private Student'),false);
 const partial=await summarizeMigratedReportCoverage({...args,marks:[]});assert.equal(partial.rows[0].completePreviews,0);assert.equal(partial.rows[0].missingFullGridPairs,1);
 const duplicate=await summarizeMigratedReportCoverage({...args,marks:[...marks,{...marks[0],id:'m2'}]});assert.equal(duplicate.rows[0].duplicatePairs,1);assert.equal(duplicate.rows[0].blockedExams,1);
 await assert.rejects(summarizeMigratedReportCoverage({...args,marks:[row('x',{schoolId:'99999'})]}),/foreign/);
 console.log('PASS actual-schema report coverage aggregate: complete, missing, duplicate, no student identity output or publication approval');
}
