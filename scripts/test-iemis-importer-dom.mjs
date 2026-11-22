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
