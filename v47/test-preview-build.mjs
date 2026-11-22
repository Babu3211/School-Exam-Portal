import {mkdtempSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname} from 'node:path';
import assert from 'node:assert/strict';
const source=readFileSync(join(dirname(fileURLToPath(import.meta.url)),'build-preview.mjs'),'utf8');
function run(files){
 const root=mkdtempSync(join(tmpdir(),'v47-preview-test-'));
 try{
  for(const [name,content] of Object.entries(files))writeFileSync(join(root,name),content);
  writeFileSync(join(root,'build-preview.mjs'),source);
  const result=spawnSync(process.execPath,[join(root,'build-preview.mjs')],{encoding:'utf8'});
  return {status:result.status,output:result.stdout+result.stderr,dist:existsSync(join(root,'dist'))?Object.fromEntries(['index.html','dashboard-console.mjs','v47-firebase-config.mjs','unused.mjs','students.html','students-console.mjs','manifest.webmanifest','dev-icon.svg','PREVIEW-ONLY.txt'].map(name=>[name,existsSync(join(root,'dist',name))])):null};
 }finally{rmSync(root,{recursive:true,force:true})}
}
const base={
 'index.html':'<p>Development only</p><link rel="manifest" href="./manifest.webmanifest"><link rel="icon" href="./dev-icon.svg"><a href="./students.html">Students</a><script type="module" src="./dashboard-console.mjs"></script>',
 'manifest.webmanifest':JSON.stringify({name:'SMSS V47 Dev',start_url:'./',icons:[{src:'./dev-icon.svg',sizes:'any',type:'image/svg+xml'}]}),
 'dev-icon.svg':'<svg xmlns="http://www.w3.org/2000/svg"></svg>',
 'students.html':'<script type="module" src="./students-console.mjs"></script>',
 'students-console.mjs':"import './v47-firebase-config.mjs';",
 'dashboard-console.mjs':"import {V47_FIREBASE_CONFIG} from './v47-firebase-config.mjs';",
 'v47-firebase-config.mjs':"export const V47_FIREBASE_CONFIG={projectId:'smss-exam-portal-v47'};",
 'unused.mjs':"import {readFileSync} from 'node:fs';"
};
const ok=run(base);assert.equal(ok.status,0,ok.output);assert.equal(ok.dist['index.html'],true);assert.equal(ok.dist['dashboard-console.mjs'],true);assert.equal(ok.dist['v47-firebase-config.mjs'],true);assert.equal(ok.dist['unused.mjs'],false);assert.equal(ok.dist['students.html'],true);assert.equal(ok.dist['students-console.mjs'],true);assert.equal(ok.dist['PREVIEW-ONLY.txt'],true);assert.equal(ok.dist['manifest.webmanifest'],true);assert.equal(ok.dist['dev-icon.svg'],true);
const missingIcon=run(Object.fromEntries(Object.entries(base).filter(([name])=>name!=='dev-icon.svg')));assert.notEqual(missingIcon.status,0);assert.match(missingIcon.output,/missing or invalid asset/);
const missingPage=run({...base,'index.html':'<p>Development only</p><a href="./missing.html">Missing</a><script type="module" src="./dashboard-console.mjs"></script>'});assert.notEqual(missingPage.status,0);assert.match(missingPage.output,/missing or invalid asset/);
const missing=run({...base,'dashboard-console.mjs':"import './missing.mjs';"});assert.notEqual(missing.status,0);assert.match(missing.output,/missing or invalid asset/);
const wrongProject=run({...base,'v47-firebase-config.mjs':"export const config={projectId:'v46-production'};"});assert.notEqual(wrongProject.status,0);assert.match(wrongProject.output,/non-V47 Firebase/);
const nodeOnly=run({...base,'dashboard-console.mjs':"import {readFileSync} from 'node:fs'; import './v47-firebase-config.mjs';"});assert.notEqual(nodeOnly.status,0);assert.match(nodeOnly.output,/Node-only module/);
console.log('PASS: V47 preview fixture checks (bundle, missing dependency, wrong project, Node import)');
