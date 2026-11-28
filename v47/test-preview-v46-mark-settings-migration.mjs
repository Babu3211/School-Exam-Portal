import assert from 'node:assert/strict';
import {previewV46MarkSettingsMigration} from './preview-v46-mark-settings-migration.mjs';
const legacy={classGroup:'9-10',subject:'Computer',components:[{name:'Participation',fullMarks:7},{name:'Practical/Project',fullMarks:63},{name:'Term',fullMarks:30}]};
const args={legacy,schoolId:'12345',classId:'9',subjectId:'computer',examId:'final',verifiedSubjectName:'Computer'};
const result=previewV46MarkSettingsMigration(args);
assert.equal(result.writeAuthorized,false);
assert.equal(result.requiresManualApproval,true);
assert.deepEqual(result.settings.components.map(x=>x.fullMarks),[7,63,30]);
assert.deepEqual(result.settings.components.map(x=>x.key),['component_1','component_2','component_3']);
assert.equal(Object.isFrozen(result.settings.components[0]),true);
await assert.rejects(async()=>previewV46MarkSettingsMigration({...args,examId:''}),/Explicit verified/);
assert.throws(()=>previewV46MarkSettingsMigration({...args,classId:'6'}),/class group/);
assert.throws(()=>previewV46MarkSettingsMigration({...args,verifiedSubjectName:'Math'}),/subject name/);
assert.throws(()=>previewV46MarkSettingsMigration({...args,legacy:{...legacy,className:'10'}}),/another class/);
assert.throws(()=>previewV46MarkSettingsMigration({...args,legacy:{...legacy,components:[{name:'Participation',fullMarks:0}]}}),/positive full marks/);
assert.throws(()=>previewV46MarkSettingsMigration({...args,legacy:{...legacy,totalFullMarks:99}}),/total full marks mismatch/);
assert.throws(()=>previewV46MarkSettingsMigration({...args,legacy:{...legacy,components:Array.from({length:7},(_,i)=>({name:'Part '+i,fullMarks:1}))}}),/six-part limit/);
assert.throws(()=>previewV46MarkSettingsMigration({...args,legacy:{...legacy,components:[{name:'Oversize',fullMarks:5001}]}}),/positive full marks/);
assert.throws(()=>previewV46MarkSettingsMigration({...args,classId:'1',legacy:{classGroup:'1-3',subject:'Computer',components:[{name:'No. of Learning Achievement',fullMarks:3},{name:'Full Marks',fullMarks:12},{name:'Obtained Learning Achievement',fullMarks:12}]}}),/dedicated IEMIS migration/);
console.log('V47 read-only V46 mark settings schema preview passed');

import {prepareLegacySettingsEditor} from './preview-v46-mark-settings-migration.mjs';
{
 const schoolId='12345',classId='6',subjectId='math',examId='2nd';
 const subjects=[{id:subjectId,name:'Mathematics',active:true}];
 const base={schoolId,classGroup:'6-8',subject:'Math',components:[{name:'Assessment',fullMarks:137.5},{name:'Project',fullMarks:62.5}]};
 const group={id:'old_group',fields:{...base,components:[{name:'Assessment',fullMarks:50}]}};
 const exact={id:'old_class',fields:{...base,className:'6'}};
 const scope={schoolId,classId,subjectId,examId,subjects};
 const result=prepareLegacySettingsEditor({...scope,records:[group,exact]});
 assert.equal(result.sourceId,'old_class');assert.equal(result.sourceScope,'Class-specific');assert.deepEqual(result.settings.components.map(c=>c.fullMarks),[137.5,62.5]);assert.equal(result.writeAuthorized,false);
 assert.equal(prepareLegacySettingsEditor({...scope,records:[group]}).sourceScope,'Group fallback');
 assert.throws(()=>prepareLegacySettingsEditor({...scope,records:[group,{...exact,fields:{...exact.fields,components:[]}}]}),/components/i);
 assert.throws(()=>prepareLegacySettingsEditor({...scope,records:[exact,{...exact,id:'duplicate'}]}),/Multiple preferred/);
 assert.throws(()=>prepareLegacySettingsEditor({...scope,subjects:[...subjects,{id:'other',name:'Math',active:true}],records:[exact]}),/ambiguous/);
 assert.throws(()=>prepareLegacySettingsEditor({...scope,records:[{...exact,fields:{...exact.fields,schoolId:'99999'}}]}),/Foreign/);
 assert.throws(()=>prepareLegacySettingsEditor({...scope,records:[{...exact,fields:{...exact.fields,term:'1st'}}]}),/No matching/);
}
{
 const scope={schoolId:'12345',classId:'1',subjectId:'math',examId:'final',subjects:[{id:'math',name:'Mathematics',active:true}]};
 const fields={schoolId:'12345',classGroup:'1-3',className:'1',subject:'गणित',components:[{name:'No. of Learning Achievement',fullMarks:3},{name:'Full Marks',fullMarks:12},{name:'Obtained Learning Achievement',fullMarks:12}]};
 const result=prepareLegacySettingsEditor({...scope,records:[{id:'primary',fields}]});
 assert.deepEqual(result.settings.components.map(c=>[c.key,c.fullMarks]),[['count',3],['obtained',12]]);
 assert.equal(result.settings.examId,'final');
}
console.log('PASS V46 source precedence editor: saved maxima, scope, duplicates, primary derived field and explicit term');

// Legacy audit and browser editor must recognize the same class spellings.
{
 const schoolId='12345',classId='9',subjectId='computer',examId='final';
 const scope={schoolId,classId,subjectId,examId,subjects:[{id:subjectId,name:'Computer',active:true}]};
 const base={schoolId,classGroup:'9-10',subject:'Computer',components:[{name:'Project',fullMarks:137.5}]};
 const group={id:'group',fields:{...base,components:[{name:'Project',fullMarks:50}]}};
 for(const className of ['कक्षा ९','कक्षा९','Class 9','class9','९',9,' 9 ']){
  const exact={id:'exact',fields:{...base,className}};
  const result=prepareLegacySettingsEditor({...scope,records:[group,exact]});
  assert.equal(result.sourceId,'exact');assert.equal(result.settings.components[0].fullMarks,137.5);assert.equal(result.writeAuthorized,false);
  assert.throws(()=>prepareLegacySettingsEditor({...scope,records:[exact,{id:'duplicate',fields:{...base,className:'9'}}]}),/Multiple preferred/);
 }
 for(const className of [0,false,'8','कक्षा ११','unknown',' ',{},[]])assert.throws(()=>prepareLegacySettingsEditor({...scope,records:[group,{id:'bad',fields:{...base,className}}]}),/Invalid legacy class-specific scope/);
 for(const className of [undefined,null,''])assert.equal(prepareLegacySettingsEditor({...scope,records:[{id:'group',fields:{...base,className}}]}).sourceScope,'Group fallback');
 assert.equal(prepareLegacySettingsEditor({...scope,records:[group,{id:'other',fields:{...base,className:'कक्षा १०'}}]}).sourceId,'group');
}
console.log('PASS normalized legacy class identity: exact precedence, duplicates, malformed scope refused, valid group fallback');
