import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
execFileSync(process.execPath,['v47/build-hosting.mjs'],{stdio:'inherit'});
const names=await readdir('v47/dist');
for(const name of ['index.html','admin.html','school-login.html','school-login.mjs','students.html','attendance.html'])
 assert(names.includes(name),'Missing public entry '+name);
for(const name of names){
 assert(!name.startsWith('test-'),'Test module leaked: '+name);
 assert(!name.startsWith('firebase.'),'Firebase configuration leaked: '+name);
 assert(!['firebase.json','firestore.rules','firestore.indexes.json','build-hosting.mjs'].includes(name),'Private file leaked: '+name);
}
const hub=await readFile('v47/dist/index.html','utf8');
assert(hub.includes('SMSS Exam Portal'),'Incorrect V47 homepage');
console.log('PASS V47 isolated hosting bundle smoke test ('+names.length+' public files)');
