import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {IemisEntryGrid,iemisEntrySchema,iemisEntryValues} from './iemis-entry.js';
import {iemisGrade} from './iemis-ledger.js';
// Compare V47 directly to the V46 source, not an independent guessed formula.
const root=readFileSync(new URL('../iemis-entry.js',import.meta.url),'utf8');
const v47=readFileSync(new URL('./iemis-entry.js',import.meta.url),'utf8');
const normalize=s=>s.replace(/^\/\/ V46 source:.*\n/gm,'')
 .replace(/^\/\/ V47 read-only parity copy, not a Firestore publication permission\.\n/gm,'')
 .replace(/\?v=[A-Za-z0-9-]+/g,'');
assert.equal(normalize(v47),normalize(root),'V47 IEMIS Grid must exactly preserve verified V46 behavior');
const sample=[
 ['1','first','English',['count','full','obtained'],null],
 ['6','first','Science',['participation','practical','term'],[4,36,10]],
 ['9','annual','Computer',['participation','practical','term','theory'],[4,36,10,50]],
 ['9','first','English',['participation','practical','term'],[3,16,6]]
];
for(const [classNo,term,subject,keys,maxima] of sample){
 const schema=iemisEntrySchema(classNo,term,subject);
 assert.deepEqual(schema.map(x=>x.key),keys);
 if(maxima)assert.deepEqual(schema.map(x=>x.max),maxima);
 // The module-check job deliberately has no npm install; use the same
 // rendered HTML and the actual IemisEntryGrid event handler without a DOM library.
 const mount={innerHTML:'',addEventListener(){},removeEventListener(){},querySelectorAll(){return []}};
 const options={classNo,term,subjects:[subject],students:[{id:'s1',nameEnglish:'Student One'}],records:[],examId:'1st',message:()=>{}};
 const grid=permissions=>{
  const instance=new IemisEntryGrid(mount,{...options,...permissions});
  instance.selectedSubjects.add(0);instance.render();return instance;
 };
 const viewer=grid({canView:()=>true,canEdit:()=>false});
 assert.equal(viewer.visible(0,0),true,'View permission must not depend on Edit permission');
 assert.equal(viewer.allowed(0,0),false);
 const fields=(mount.innerHTML.match(/data-grid-key=/g)||[]).length;
 assert.equal(fields,schema.filter(x=>!x.readonly).length);
 assert.match(mount.innerHTML,/data-grid-absent[^>]*disabled/,'Viewer absence field must be disabled');
 assert.equal((mount.innerHTML.match(/readonly aria-readonly="true"/g)||[]).length,fields,
  'All Viewer mark fields must be rendered read-only');
 const field={dataset:{gridSi:'0',gridSj:'0',gridKey:keys[0]},matches:()=>false,
  hasAttribute:name=>name==='data-grid-si',value:'9'};
 viewer.change({target:field});
 assert.deepEqual(viewer.pending(),[],'Forced DOM event must not create pending mark save');
 viewer.destroy();
 const teacher=grid({canView:()=>true,canEdit:()=>false});
 assert.equal((mount.innerHTML.match(/readonly aria-readonly="true"/g)||[]).length,fields);
 teacher.destroy();
 const hidden=grid({canView:()=>false,canEdit:()=>false});
 assert.match(mount.innerHTML,/N\/A/);
 assert.doesNotMatch(mount.innerHTML,/data-grid-key=/);
 hidden.destroy();
 const admin=grid({canView:()=>true,canEdit:()=>true});
 assert.doesNotMatch(mount.innerHTML,/readonly aria-readonly="true"/);
 assert.match(mount.innerHTML,/data-grid-absent/);
 assert.doesNotMatch(mount.innerHTML,/data-grid-absent[^>]*disabled/);
 admin.destroy();
}
const primary=iemisEntryValues(iemisEntrySchema('1','first','English'),{values:{count:'10',obtained:'35'},isAbsent:false});
assert.equal(primary.totalFullMarks,40);
assert.equal(primary.totalObtained,35);
const comp=iemisEntryValues(iemisEntrySchema('9','annual','Computer'),{values:{participation:4,practical:36,term:10,theory:50},isAbsent:false});
assert.equal(comp.totalFullMarks,100);
assert.equal(comp.totalObtained,100);
assert.deepEqual(iemisGrade(90),{grade:'A+',point:4,remark:'Outstanding'});
assert.deepEqual(iemisGrade(34.999),{grade:'NG',point:null,remark:'Not Graded'});
console.log('PASS V47 exact V46 IEMIS source + Viewer/Teacher/Admin read-only Grid parity (Class 1,6,9)');
