// V47-only offline test runner. Runs all isolated Node suites and reports failures.
import {spawnSync} from 'node:child_process';
import {readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
// Discover every offline suite so newly added tests cannot silently be skipped.
// Emulator suites run in dedicated workflows with Firebase services available.
const exclusions=new Set(['test-firestore-emulator.mjs','test-firestore-isolation.mjs']);
const suites=readdirSync(fileURLToPath(new URL('.',import.meta.url)))
 .filter(name=>/^test-.*\.mjs$/.test(name)&&!exclusions.has(name))
 .sort();
if(!suites.length){console.error('No V47 offline tests found');process.exit(1)}
let failures=0;
for(const suite of suites){
 const result=spawnSync(process.execPath,[new URL(suite,import.meta.url).pathname],{encoding:'utf8',stdio:'pipe'});
 process.stdout.write(result.stdout||'');
 process.stderr.write(result.stderr||'');
 const ok=result.status===0&&!result.error;
 console.log((ok?'PASS ':'FAIL ')+suite);
 if(!ok)failures++;
}
console.log('V47 offline suites: '+(suites.length-failures)+'/'+suites.length+' passed');
if(failures)process.exitCode=1;
