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
 'test-firebase-tenant-operations.mjs',
 'test-console-integration.mjs',
 'test-tenant-write-services.mjs',
 'test-class-catalog-ui.mjs',
 'test-exam-term-service.mjs',
 'test-exam-screen-contract.mjs',
 'test-access-policy.mjs',
 'test-console-contract.mjs',
 'test-firebase-registry-adapter.mjs',
 'test-registration-controller.mjs',
 'test-registry-schema.mjs',
 'test-rules-integrity.mjs',
 'test-school-access-service.mjs',
 'test-school-directory.mjs',
 'test-school-list-service.mjs',
 'test-school-onboarding.mjs',
 'test-school-registration-form.mjs',
 'test-school-registry-service.mjs',
 'test-school-registry.mjs',
 'test-school-session.mjs',
 'test-super-admin-dashboard.mjs',
 'test-super-admin-ui.mjs',
 'test-teacher-assignment.mjs',
 'test-tenant-pagination.mjs',
 'test-tenant-query.mjs'
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
