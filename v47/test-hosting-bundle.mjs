import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
execFileSync(process.execPath,['v47/build-hosting.mjs'],{stdio:'inherit'});
const names=await readdir('v47/dist');
for(const name of ['index.html','admin.html','school-login.html','school-login.mjs','students.html','staff.html','staff-console.mjs','grade-ledger.html','grade-sheet.html','mark-ledger.html','mark-entry-ledger.html','question-paper.html','question-paper-console.mjs','question-paper-cdc-preview.mjs','cdc-source-register-2083.json','cdc-grade8-science-practice-pack-v1.json','cdc-grade10-science-practice-pack-v1.json','grade-report-console.mjs','attendance.html','student-import-preview.html','v46-iemis-student-import-panel.mjs','require-xlsx-preview-file.mjs','manifest.webmanifest','icon-192.png','icon-512.png','apple-touch-icon.png'])
 assert(names.includes(name),'Missing public entry '+name);
for(const name of names){
 assert(!name.startsWith('test-')&&!name.startsWith('build-')&&!name.startsWith('release-')&&!name.startsWith('server-')&&!name.startsWith('audit-'),'Private development module leaked: '+name);
 assert(!name.startsWith('firebase.'),'Firebase configuration leaked: '+name);
 assert(!name.includes('..')&&!name.includes('/'),'Invalid public filename: '+name);
 assert(!['firebase.json','firestore.rules','firestore.indexes.json','build-hosting.mjs','test-production-marks-guard.mjs','release-readiness-gate.mjs'].includes(name),'Private file leaked: '+name);
}
const manifest=JSON.parse(await readFile('v47/dist/manifest.webmanifest','utf8'));
assert(Array.isArray(manifest.icons)&&manifest.icons.length>0,'V47 PWA must retain its icons');
for(const icon of manifest.icons){assert(typeof icon.src==='string'&&icon.src.startsWith('./'),'External V47 manifest icon forbidden');assert(names.includes(icon.src.slice(2)),'PWA icon missing from hosting bundle: '+icon.src)}
// The V47 installed application must preserve the exact V46-approved branding
// and actual PNG icon bytes. A preview-only SVG or renamed app is not parity.
const v46Manifest=JSON.parse(readFileSync('manifest.webmanifest','utf8'));
assert.equal(manifest.name,v46Manifest.name,'Installed app name differs from V46');
assert.equal(manifest.short_name,v46Manifest.short_name,'Installed short name differs from V46');
assert.deepEqual(manifest.icons,v46Manifest.icons,'Installed icon sizes and paths differ from V46');
const sha256=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
for(const filename of ['icon-192.png','icon-512.png','apple-touch-icon.png']){
 assert(names.includes(filename),'Missing installed-app icon: '+filename);
 assert.equal(sha256('v47/dist/'+filename),sha256(filename),'Installed V47 app icon differs from V46: '+filename);
}
const hub=await readFile('v47/dist/index.html','utf8');
assert(hub.includes('SMSS Exam Portal'),'Incorrect V47 homepage');
assert(hub.includes('href="./apple-touch-icon.png"'),'Missing iOS installed-app icon');
for(const name of names.filter(n=>n.endsWith('.html'))){
 const html=await readFile('v47/dist/'+name,'utf8');
 assert(!/babu3211\.github\.io\/School-Exam-Portal|exam-portal-smss-95016\.web\.app/i.test(html),'V46 production URL leaked: '+name);
 for(const match of html.matchAll(/(?:src|href)\s*=\s*["']\.\/([^"'?#]+)["']/g))
  assert(names.includes(match[1]),name+' links missing file '+match[1]);
 for(const match of html.matchAll(/(?:\bfrom\s*|\bimport\s*\(|\bimport\s*)["']\.\/([^"']+)["']/g))
  assert(names.includes(match[1].split(/[?#]/)[0]),name+' inline module missing file '+match[1]);
}
for(const name of names.filter(n=>n.endsWith('.mjs'))){
 const code=await readFile('v47/dist/'+name,'utf8');
 for(const match of code.matchAll(/(?:\bfrom\s*|\bimport\s*\(|\bimport\s*)["']\.\/([^"']+)["']/g))
  assert(names.includes(match[1].split(/[?#]/)[0]),name+' imports missing module '+match[1]);
}
console.log('PASS V47 isolated hosting bundle smoke test ('+names.length+' public files)');
