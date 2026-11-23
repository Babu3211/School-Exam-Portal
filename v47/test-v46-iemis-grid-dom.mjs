import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {IemisEntryGrid,iemisEntrySchema,iemisEntryValues} from './iemis-entry.js';

// DOM-level school-role regression run after npm install in Firebase test job.
// This does not connect to Firebase or authorize any official marks write.
const fixtures=[
 {classNo:'1',term:'first',subject:'English',values:{count:10,obtained:35}},
 {classNo:'6',term:'first',subject:'Science',values:{participation:4,practical:36,term:10}},
 {classNo:'9',term:'annual',subject:'Computer',values:{participation:4,practical:36,term:10,theory:50}}
];
for(const {classNo,term,subject,values} of fixtures){
 const dom=new JSDOM('<!doctype html><html><body><div id="marks"></div></body></html>');
 const root=dom.window.document.getElementById('marks');
 const schema=iemisEntrySchema(classNo,term,subject);
 const mark=iemisEntryValues(schema,{values,isAbsent:false});
 assert(mark);
 const student={id:'student_1',nameEnglish:'Existing Student',schoolId:'12345678'};
 const record={...mark,studentId:student.id,subject,examId:'first',schoolId:'12345678'};
 const options={classNo,term,examId:'first',students:[student],subjects:[subject],records:[record],
  message:()=>{}};
 const build=auth=>{
  const grid=new IemisEntryGrid(root,{...options,...auth});
  grid.selectedSubjects.add(0);grid.render();return grid;
 };
 // Viewer has access to all already-authorized marks but zero edit powers.
 const viewer=build({canView:()=>true,canEdit:()=>false});
 const score=root.querySelector('[data-grid-key]');
 assert(score,'Viewer must see existing mark input in IEMIS Grid');
 assert.equal(score.readOnly,true);
 assert.equal(score.getAttribute('aria-readonly'),'true');
 assert.equal(root.querySelector('[data-grid-absent]').disabled,true);
 assert.equal(root.querySelectorAll('[data-grid-key]').length,schema.filter(x=>!x.readonly).length);
 assert.notEqual(score.value,'','Viewer must see source mark values');
 // Even a forged synthetic input/change event cannot produce pending updates.
 score.value='999';
 score.dispatchEvent(new dom.window.Event('input',{bubbles:true}));
 score.dispatchEvent(new dom.window.Event('change',{bubbles:true}));
 assert.deepEqual(viewer.pending(),[],'Read-only Viewer event must not queue any write');
 viewer.destroy();
 const unassignedTeacher=build({canView:()=>true,canEdit:()=>false});
 const t=root.querySelector('[data-grid-key]');
 assert(t&&t.readOnly,'Unassigned teacher may inspect but not edit');
 assert.equal(root.querySelector('[data-grid-absent]').disabled,true);
 unassignedTeacher.destroy();
 const blocked=build({canView:()=>false,canEdit:()=>false});
 assert.match(root.textContent,/N\/A/);
 assert.equal(root.querySelectorAll('[data-grid-key]').length,0,'Without view permission no marks appear');
 blocked.destroy();
 // V46 UI supports a writable grid for an allowed Admin/assigned Teacher,
 // but V47 official Firestore marks collections still deny all writes.
 const admin=build({canView:()=>true,canEdit:()=>true});
 const editable=root.querySelector('[data-grid-key]');
 assert(editable&&!editable.readOnly);
 assert.equal(root.querySelector('[data-grid-absent]').disabled,false);
 assert.equal(admin.allowed(0,0),true);
 assert.equal(admin.visible(0,0),true);
 admin.destroy();
}
console.log('PASS jsdom V46-V47 Marks Grid actual DOM Viewer/Teacher readonly, denied visibility, Admin fields: Class 1/6/9');
