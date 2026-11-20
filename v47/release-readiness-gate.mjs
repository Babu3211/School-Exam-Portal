import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=dirname(fileURLToPath(import.meta.url));
const read=name=>readFileSync(resolve(root,name),'utf8');
const hub=read('index.html');
const marks=read('marks-entry.html');
const save=read('verified-small-class-mark-save.mjs');
const rules=read('firestore.rules');
const config=JSON.parse(read('firebase.json'));
const blockers=[];
const expectedProject='smss-exam-portal-v47';
const projectFiles=['.firebaserc','firebase.json'];
for(const filename of projectFiles){
 const full=resolve(root,filename);
 if(filename==='.firebaserc'&&existsSync(full)){
  const projects=JSON.parse(read(filename)).projects??{};
  if(Object.values(projects).some(id=>id!==expectedProject))
   blockers.push('V47 Firebase aliases include a project other than '+expectedProject);
 }
}
if(config.hosting?.target&&typeof config.hosting.target!=='string')
 blockers.push('Invalid Firebase Hosting target');

if(/Development only|development workspace|independent prototypes/i.test(hub))
 blockers.push('V47 dashboard is still a development hub, not a feature-complete portal');
if(/at most 3 students|max 3/i.test(marks)||/complete\.count\s*>\s*3/.test(save))
 blockers.push('Full-class marks save is limited to three students');
// A per-document mark write permission bypasses the required complete-class save gate.
const marksRule=rules.match(/match \/marks\/\{id\} \{([\s\S]*?)\n      \}/)?.[1]??'';
if(/allow (?:create|update|write):/.test(marksRule))
 blockers.push('Firestore marks rules still allow individual create/update writes outside a verified complete-class publish protocol');
if(/allow create, update, delete: if false;/.test(marksRule))
 blockers.push('Firestore marks writes are intentionally disabled until the audited complete-class publish workflow is implemented');
const publicDir=config.hosting?.public;
if(typeof publicDir!=='string'||!publicDir||!existsSync(resolve(root,publicDir,'index.html')))
 blockers.push('Firebase Hosting output is missing its index.html');
if(!blockers.length)
 blockers.push('No independently verified feature-parity, emulator and deployment approvals recorded; manual release sign-off required');
console.error('V47 PRODUCTION RELEASE BLOCKED:\n'+blockers.map(x=>' - '+x).join('\n'));
process.exitCode=1;
