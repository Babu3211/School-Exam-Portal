import assert from 'node:assert/strict';
import {auditV46MarkSettingsBatch} from './audit-v46-mark-settings-batch.mjs';
const primary={classGroup:'1-3',className:'1',subject:'Math',components:[{name:'No. of Learning Achievement',fullMarks:3},{name:'Full Marks',fullMarks:12},{name:'Obtained Learning Achievement',fullMarks:12}]};
const secondary={classGroup:'9-10',className:'9',subject:'Computer',components:[{name:'Participation',fullMarks:7},{name:'Practical',fullMarks:63},{name:'Term',fullMarks:30}]};
const a={classId:'1',subjectId:'math',verifiedSubjectName:'Math',legacy:primary};
const b={classId:'9',subjectId:'computer',verifiedSubjectName:'Computer',legacy:secondary};
const good=auditV46MarkSettingsBatch({schoolId:'12345',examId:'final',records:[a,b]});
assert.equal(good.complete,true);
assert.equal(good.valid,2);
assert.deepEqual(good.previews.map(x=>x.kind),['primary-achievement','component-marks']);
assert.equal(good.writeAuthorized,false);
const duplicate=auditV46MarkSettingsBatch({schoolId:'12345',examId:'final',records:[a,a]});
assert.equal(duplicate.complete,false);
assert.equal(duplicate.invalid,1);
assert.match(duplicate.errors[0].message,/Duplicate target/);
const mismatched=auditV46MarkSettingsBatch({schoolId:'12345',examId:'final',records:[a,{...b,verifiedSubjectName:'Math'}]});
assert.equal(mismatched.invalid,1);
assert.throws(()=>auditV46MarkSettingsBatch({schoolId:'12345',examId:'final',records:[]}),/bounded/);
const invalidThenValid=auditV46MarkSettingsBatch({schoolId:'12345',examId:'final',records:[{...a,verifiedSubjectName:'Science'},a]});
assert.equal(invalidThenValid.invalid,1);
assert.equal(invalidThenValid.valid,1);
assert.match(invalidThenValid.errors[0].message,/subject mismatch/);
assert.equal(invalidThenValid.previews[0].index,1);
console.log('V47 V46 mark settings batch audit tests passed');

import {auditEntrySettingsCoverage} from './entry-settings-coverage.mjs';
{
 const schoolId='12345',classId='9',examId='1st',scope={schoolId,classId,examId};
 const subject={id:'computer',name:'Computer Science',active:true};
 const components=[{key:'p',name:'Participation',fullMarks:4},{key:'q',name:'Practical/Project',fullMarks:36},{key:'t',name:'First Term Examination',fullMarks:10}];
 const d={...scope,id:'9_computer_1st',subjectId:'computer',active:true,components};
 const audit=(settings,subjects=[subject])=>auditEntrySettingsCoverage({...scope,settings,subjects});
 assert.equal(audit([d]).matched,1);assert.equal(audit([d]).iemisVerified,false);
 assert.equal(audit([]).rows[0].status,'Missing active settings');
 assert.equal(audit([{...d,id:'legacy_id'}]).rows[0].status,'Noncanonical settings ID');
 assert.equal(audit([d,{...d,id:'duplicate'}]).rows[0].status,'Duplicate active settings');
 const custom=audit([{...d,components:components.map((c,i)=>i===0?{...c,fullMarks:7}:c)}]);assert.equal(custom.rows[0].status,'Configured settings valid');assert.equal(custom.matched,1);assert.equal(custom.customValid,1);assert.equal(custom.referenceMatched,0);assert.equal(custom.reviewRequired,0);
 assert.equal(audit([d],[]).rows[0].status,'Settings without registered subject');
 assert.throws(()=>audit([{...d,schoolId:'54321'}]),/foreign/);
 const primary={...d,classId:'1',id:'1_computer_1st',components:[{key:'count',name:'No. of Learning Achievement',fullMarks:10},{key:'obtained',name:'Obtained Learning Achievement',fullMarks:40}]};
 assert.equal(auditEntrySettingsCoverage({...scope,classId:'1',subjects:[subject],settings:[primary]}).matched,1);
 assert.equal(auditEntrySettingsCoverage({...scope,classId:'1',subjects:[subject],settings:[{...primary,components:[primary.components[0],{...primary.components[1],fullMarks:39}]}]}).matched,0);
}

import {entrySettingsAuditWorkbook} from './entry-settings-coverage.mjs';
{
 const result=auditEntrySettingsCoverage({schoolId:'12345',classId:'9',examId:'final',subjects:[{id:'math',name:'Mathematics',active:true}],settings:[]});
 const file=entrySettingsAuditWorkbook(result);
 assert.equal(file.filename,'V47-SETTINGS-AUDIT-12345-9-final.xlsx');
 const content=new TextDecoder().decode(await file.blob.arrayBuffer());
 assert.match(content,/Missing active settings/);assert.match(content,/NOT verified against live IEMIS/);
 assert.throws(()=>entrySettingsAuditWorkbook({...result,writeAuthorized:true}),/Invalid/);
 const inactive=auditEntrySettingsCoverage({schoolId:'12345',classId:'9',examId:'final',subjects:[{id:'math',name:'Math',active:false}],settings:[{schoolId:'12345',classId:'9',examId:'final',subjectId:'math',id:'9_math_final',active:true,components:[null]}]});
 assert.equal(inactive.rows[0].status,'Inactive or unverified subject');assert.equal(inactive.rows[0].configured,'Invalid component');
}

import {auditAllTermSettingsCoverage,allTermSettingsAuditWorkbook} from './entry-settings-coverage.mjs';
{
 const scope={schoolId:'12345',classId:'9'},subjects=[{id:'computer',name:'Computer',active:true}],d={...scope,id:'9_computer_1st',subjectId:'computer',examId:'1st',active:true,components:[{key:'p',name:'Participation',fullMarks:4},{key:'q',name:'Practical/Project',fullMarks:36},{key:'t',name:'First Term Examination',fullMarks:10}]};
 const result=auditAllTermSettingsCoverage({...scope,subjects,settings:[d]});
 assert.equal(result.matched,1);assert.equal(result.reviewRequired,3);assert.deepEqual(result.reports.map(r=>r.examId),['1st','2nd','3rd','final']);
 assert.equal(result.reports[3].rows[0].status,'Missing active settings');assert.equal(result.iemisVerified,false);
 assert.throws(()=>auditAllTermSettingsCoverage({...scope,subjects,settings:[d,{...d,examId:'2nd'}]}),/identity/);
 assert.throws(()=>auditAllTermSettingsCoverage({...scope,subjects,settings:[{...d,schoolId:'54321'}]}),/identity/);
 const file=allTermSettingsAuditWorkbook(result);assert.equal(file.filename,'V47-SETTINGS-AUDIT-12345-9-ALL-TERMS.xlsx');
 assert.match(new TextDecoder().decode(await file.blob.arrayBuffer()),/Missing active settings/);
 assert.throws(()=>allTermSettingsAuditWorkbook({...result,iemisVerified:true}),/Invalid/);
}

{
 const schoolId='12345',examId='final',subjects=[{id:'math',name:'Mathematics',active:true}];
 for(const classId of ['ECD','LKG','UKG',...Array.from({length:12},(_,i)=>String(i+1))]){
  const setting={schoolId,classId,examId,subjectId:'math',id:classId+'_math_final',active:true,components:[{key:'a',name:'Assessment',fullMarks:137.5},{key:'b',name:'Project',fullMarks:62.5}]};
  const r=auditEntrySettingsCoverage({schoolId,classId,examId,subjects,settings:[setting]});
  assert.equal(r.matched,1,classId);assert.equal(r.customValid,1,classId);assert.equal(r.reviewRequired,0,classId);assert.match(r.rows[0].configured,/137.5/);
  assert.equal(auditEntrySettingsCoverage({schoolId,classId,examId,subjects,settings:[{...setting,components:[{...setting.components[0],fullMarks:-1}]}]}).reviewRequired,1);
 }
}
