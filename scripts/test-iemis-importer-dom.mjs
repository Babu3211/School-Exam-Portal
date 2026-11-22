import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import '../iemis-importer/vendor/exceljs.min.js';
import '../iemis-importer/transfer.js';

const html = `<!doctype html><body>
  <input disabled value="TEST-SCHOOL | Synthetic School">
  <select id="ddlYear"><option>2083</option></select><select id="ddlClass"><option>6</option><option>9</option></select>
  <select id="ddlTerm"><option>1st Term</option><option>Final Term</option></select><select id="ddlSections"><option>All</option></select>
  <button id="native-load">Load</button><button id="native-save">Save</button>
  <table><thead><tr><th rowspan="2"></th><th rowspan="2">S.N</th><th rowspan="2">Student Name</th><th rowspan="2">Regd. No.</th><th rowspan="2">Symbol No.</th><th colspan="4">Nepali</th></tr>
  <tr><th>IsAbsent</th><th>Participation(4)</th><th>Practical/Project(36)</th><th>First Term Examination(10)</th></tr></thead><tbody>
  <tr><td><input type="checkbox"></td><td>7</td><td>Synthetic Student</td><td>TEST-REG</td><td>001</td><td><input type="checkbox"></td><td><input type="number" min="0"></td><td><input type="number" min="0"></td><td><input type="number" min="0"></td></tr>
  </tbody></table></body>`;
// Use digits-only school identifiers, exactly as on the observed IEMIS form.
const dom = new JSDOM(html.replace('TEST-SCHOOL |','999999999 |'), {url:'https://emis.cehrd.gov.np/result-processing/result-entry',runScripts:'outside-only',pretendToBeVisual:true});
const window = dom.window;
window.requestAnimationFrame=callback=>window.setTimeout(()=>callback(0),0);
window.cancelAnimationFrame=id=>window.clearTimeout(id);
Object.defineProperty(window.HTMLElement.prototype,'innerText',{get(){return this.textContent;}});
const originalAttach = window.Element.prototype.attachShadow;
window.Element.prototype.attachShadow=function(options){return originalAttach.call(this,{...options,mode:'open'});};
window.ExcelJS=globalThis.ExcelJS;
window.eval(readFileSync('iemis-importer/transfer.js','utf8'));
window.eval(readFileSync('iemis-importer/content.js','utf8'));
const host=window.document.getElementById('smss-exam-importer'),root=host.shadowRoot;
const $=id=>root.getElementById(id);
root.querySelector('.launch').click();assert.equal(root.querySelector('.panel').hidden,false);
await $('read').onclick();assert.match($('status').textContent,/Form पढियो/);
assert.equal($('sample').disabled,false);
const grid={context:{schoolCode:'999999999',year:'2083',className:'Class 6',term:'first',section:'All'},columns:[
  {subject:'Nepali',label:'IsAbsent'}, {subject:'Nepali',label:'Participation(4)'},
  {subject:'Nepali',label:'Practical/Project(36)'}, {subject:'Nepali',label:'First Term Examination(10)'}
],rows:[['7','Synthetic Student','TEST-REG','001','FALSE','0','23','8']]};
const bytes=await globalThis.SmssIemisTransfer.makeWorkbook(globalThis.ExcelJS,grid);
Object.defineProperty($('file'),'files',{value:[{name:'marks.xlsx',size:bytes.byteLength,arrayBuffer:async()=>bytes}],configurable:true});
await $('file').onchange();assert.equal($('preview').disabled,false);
await $('preview').onclick();assert.equal($('apply').disabled,false);assert.equal($('preview-table').querySelectorAll('tbody tr').length,3);
let saved=0;window.document.getElementById('native-save').onclick=()=>saved++;
let edits=0;window.document.querySelector('table').addEventListener('input',()=>edits++);
await $('apply').onclick();
assert.equal(saved,0,'Filling the form must not click IEMIS Save');
assert.ok(edits>=3,'Native input/change events must be dispatched');
assert.deepEqual([...window.document.querySelectorAll('tbody input[type=number]')].map(e=>e.value),['0','23','8']);
assert.equal(window.document.querySelector('tbody input[type=checkbox]').checked,true,'Imported students must be selected for the native Save');
assert.match($('status').textContent,/IEMIS मा अंक जाँचेर/);
// A concurrent page edit after Preview blocks every import write.
await $('read').onclick();
$('paste').value='7\tSynthetic Student\tTEST-REG\t001\tFALSE\t1\t24\t9';
await $('use-paste').onclick();$('replace').checked=true;await $('preview').onclick();
assert.equal($('apply').disabled,false);
window.document.querySelector('tbody input[type=number]').value='2';
await $('apply').onclick();assert.match($('status').textContent,/Preview पछि form बदलिएको/);
assert.equal(window.document.querySelectorAll('tbody input[type=number]')[1].value,'23');
// Changing Class invalidates the import and requires the native Load workflow.
window.document.getElementById('ddlClass').value='9';window.document.getElementById('ddlClass').dispatchEvent(new window.Event('change',{bubbles:true}));
await $('read').onclick();assert.match($('status').textContent,/Load गरेर/);assert.equal($('apply').disabled,true);
assert.match(root.textContent,/Created by Babukrishna Khanal/);
assert.equal(host.hidden,false);
await new Promise(resolve=>window.setTimeout(resolve,50));
dom.window.close();
console.log('Importer DOM reads live headings, previews XLSX, fills native controls, selects students, preserves Save ownership and rejects stale previews');

// Reproduce the live Viewer bug: valid saved scores must not become N/A.
{
const {IemisEntryGrid}=await import('../iemis-entry.js');
const viewDom=new JSDOM('<div id="grid"></div>');
const root=viewDom.window.document.getElementById('grid');let writes=0;
const students=[{id:'viewer-test',studentName:'Synthetic Student',studentIemisNo:'TEST-ONLY'}];
const records=[{studentId:'viewer-test',examId:'test-exam',subject:'Nepali',scores:[{name:'Participation',fullMarks:3,obtained:0},{name:'Practical/Project',fullMarks:16,obtained:15},{name:'First Term Examination',fullMarks:6,obtained:6}]}];
const options={classNo:9,term:'first',examId:'test-exam',subjects:['Nepali','English'],students,records,canEdit:()=>false,canView:()=>true,onSave:()=>{writes++;}};
const viewer=new IemisEntryGrid(root,options);viewer.selectedSubjects.add(0);viewer.selectedSubjects.add(1);viewer.render();
assert.deepEqual([...root.querySelectorAll('[data-grid-sj="0"][type="number"]')].map(i=>i.value),['0','15','6']);
assert.ok([...root.querySelectorAll('[type="number"]')].every(i=>i.readOnly));
assert.ok([...root.querySelectorAll('[data-grid-absent]')].every(i=>i.disabled));
assert.ok([...root.querySelectorAll('[data-grid-sj="1"][type="number"]')].every(i=>i.value===''),'Missing marks remain blank');
const input=root.querySelector('[data-grid-key="participation"]');input.value='2';input.dispatchEvent(new viewDom.window.Event('input',{bubbles:true}));
assert.equal(viewer.draft(0,0).values.participation,'0','Viewer input events cannot change saved drafts');
await viewer.save();assert.equal(writes,0);
viewer.draft(0,0).dirty=true;assert.throws(()=>viewer.pending(),/Assignment changed/);viewer.destroy();
const teacher=new IemisEntryGrid(root,{...options,canEdit:(_st,sub)=>sub==='Nepali',canView:(_st,sub)=>sub==='Nepali'});
teacher.selectedSubjects.add(0);teacher.selectedSubjects.add(1);teacher.render();
assert.equal(root.querySelectorAll('[data-grid-sj="1"][type="number"]').length,0,'Unassigned subject remains hidden');
assert.ok(root.textContent.includes('N/A'));
assert.ok([...root.querySelectorAll('[data-grid-sj="0"][type="number"]')].every(i=>!i.readOnly),'Assigned teacher retains editing');
teacher.destroy();viewDom.window.close();
console.log('Viewer saved/zero/missing marks display, readonly inputs, disabled absence, rejected edits/saves and teacher subject isolation passed');

}
