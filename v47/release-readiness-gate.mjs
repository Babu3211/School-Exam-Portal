import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=dirname(fileURLToPath(import.meta.url));
const read=name=>readFileSync(resolve(root,name),'utf8');
const hub=read('index.html');
const marks=read('marks-entry.html');
const save=read('verified-small-class-mark-save.mjs');
const rules=read('firestore.rules');
const markParser=read('marks-service.mjs');
const markLimits=read('subject-mark-limits.mjs');
const singleMarkSave=read('mark-create-service.mjs');
const classMarkSave=read('class-mark-save.mjs');
const config=JSON.parse(read('firebase.json'));
const blockers=[];
if(/id="(?:theory|practical)"[^>]*max="100"/.test(marks))
 blockers.push('Raw marks draft UI still hardcodes a 100-point maximum');
// The maximum for every subject must come from persisted Examination Settings.
if(/theory\s*>\s*100|practical\s*>\s*100/.test(markParser))
 blockers.push('Mark entry still has a hardcoded 100-point maximum');
if(!/full marks required/.test(markLimits)||!/theoryFullMarks/.test(markLimits)||!/practicalFullMarks/.test(markLimits))
 blockers.push('Both full-mark values must be required from Examination Settings');
for(const [name,source] of [['individual',singleMarkSave],['class',classMarkSave]]){
 if(!/validateSubjectMarkLimits\(subject\.data\(\)/.test(source))
  blockers.push(name+' mark saving does not validate persisted subject full marks');
}

const expectedProject='smss-exam-portal-v47';
const projectFiles=['.firebaserc','firebase.json'];
if(config.hosting?.public!=='dist')blockers.push('V47 hosting must use config-relative dist');
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
if(!marksRule)
 blockers.push('Firestore marks security rule is missing or unreadable');
// Firestore permission statements are OR-ed. Inspect combined and individual
// write permissions rather than only matching "allow create:".
function writePermissions(block){
 return [...block.matchAll(/allow\s+([^:;]+):\s*if\s+([^;]+);/g)]
  .filter(match=>match[1].split(',').map(x=>x.trim()).some(x=>['write','create','update','delete'].includes(x)))
  .map(match=>({permissions:match[1].trim(),condition:match[2].trim()}));
}
const rawWrites=writePermissions(marksRule);
if(marksRule&&!rawWrites.length)
 blockers.push('Firestore marks rules have no explicit write deny');
if(rawWrites.some(rule=>rule.condition!=='false'))
 blockers.push('Firestore marks rules contain a writable permission outside verified complete-class publication');
if(rawWrites.length&&rawWrites.every(rule=>rule.condition==='false'))
 blockers.push('Firestore marks writes are disabled until audited complete-class publication is implemented');
const componentRule=rules.match(/match \/component_marks\/\{id\} \{([\s\S]*?)\n      \}/)?.[1]??'';
if(!componentRule)
 blockers.push('Computer component marks security rule is missing or unreadable');
const computerWrites=writePermissions(componentRule);
if(componentRule&&!computerWrites.length)
 blockers.push('Computer component marks have no explicit write deny');
if(computerWrites.some(rule=>rule.condition!=='false'))
 blockers.push('Computer component marks contain a writable permission outside verified complete-class publication');
if(computerWrites.length&&computerWrites.every(rule=>rule.condition==='false'))
 blockers.push('Computer component marks saving is disabled until complete-class publication is implemented');
const publicDir=config.hosting?.public;
if(typeof publicDir!=='string'||publicDir!=='dist'||!existsSync(resolve(root,'dist','index.html')))
 blockers.push('Firebase Hosting output is missing its index.html');
if(!blockers.length)
 blockers.push('No independently verified feature-parity, emulator and deployment approvals recorded; manual release sign-off required');
console.error('V47 PRODUCTION RELEASE BLOCKED:\n'+blockers.map(x=>' - '+x).join('\n'));
process.exitCode=1;
