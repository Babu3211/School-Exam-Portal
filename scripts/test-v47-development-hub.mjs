import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const html=readFileSync(new URL('../v47/index.html',import.meta.url),'utf8');
assert.match(html,/SMSS Exam Portal — V47/);
assert.match(html,/Development only — not live for schools/);
assert.match(html,/NOT official CDC\/IEMIS results/);
assert.match(html,/viewport/);
assert.match(html,/grid-template-columns:repeat\(auto-fit/);
const scriptTags=[...html.matchAll(/<script\b[^>]*>/gi)].map(match=>match[0]);
assert.deepEqual(scriptTags,['<script type="module" src="./dashboard-console.mjs">'],'Landing page may load only the local verified Dashboard module, with no inline scripts');
assert.doesNotMatch(html,/firebaseConfig|apiKey|password[^>]*value=/i,'Do not embed Firebase credentials or hard-coded passwords in HTML');
assert.match(html,/data-school-module/,'School modules must remain restricted until login verification');
const pages=['admin','school-admin','school-settings','students','attendance','records','teacher-assigned-class','subjects','assignments','marks-entry','computer-marks','marks-preview','report-preview','ledger-exceptions','exams'];
for(const page of pages){
 assert.ok(html.includes('href="./'+page+'.html"'),'Missing navigation: '+page);
 assert.ok(existsSync(new URL('../v47/'+page+'.html',import.meta.url)),'Missing destination: '+page);
}
assert.equal((html.match(/class="tile(?: locked)?"/g)||[]).length,pages.length,'No duplicate or omitted modules');
console.log('V47 development hub navigation and non-production safety checks passed');
