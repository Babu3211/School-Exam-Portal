// V47-only offline test runner. Runs all isolated Node suites and reports failures.
import {spawnSync} from 'node:child_process';
const suites=[
 'test-school-scope.mjs',
 'test-tenant-paths.mjs',
 'test-v47-foundations.mjs',
 'test-security-contract.mjs',
 'test-tenant-features.mjs',
 'test-fail-closed-contract.mjs',
 'test-tenant-invariants.mjs',
 'test-member-provisioning.mjs',
 'test-teacher-assignment-record.mjs',
 'test-verified-school-session.mjs',
 'test-tenant-firestore-gateway.mjs',
 'test-firebase-tenant-operations.mjs'
];
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
