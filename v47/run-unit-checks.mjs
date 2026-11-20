// V47-only offline test runner. Runs all isolated Node suites and reports failures.
import {spawnSync} from 'node:child_process';
import {readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const suites=[
 'test-idle-logout.mjs',
 'test-exam-async-isolation.mjs',
 'test-exam-class-loading.mjs',
 'test-session-lazy-load.mjs',
 'test-admin-attendance-safety.mjs',
 'test-iemis-schema-source-parity.mjs',
 'test-iemis-grade-sheet-preview.mjs',
 'test-iemis-grade-ledger-preview.mjs',
 'test-iemis-class-ledger-preview.mjs',
 'test-iemis-class-draft-preview.mjs',
 'test-iemis-preview-readonly.mjs',
 'test-iemis-draft-inspector.mjs',
 'test-iemis-entry-result-preview.mjs',
 'test-iemis-entry-draft-preview.mjs',
 'test-iemis-entry-values-preview.mjs',
 'test-iemis-summary-preview.mjs',
 'test-iemis-gpa-preview.mjs',
 'test-iemis-grade-preview.mjs',
 'test-iemis-component-preview.mjs',
 'test-school-exam-workflows-safety.mjs',
 'test-school-scope.mjs',
 'test-school-login-smoke.mjs',
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
 'test-tenant-query.mjs',
 'test-app-contract.mjs',
 'test-attendance-partial-save.mjs',
 'test-attendance-roster-writes.mjs',
 'test-class-attendance-completeness.mjs',
 'test-class-mark-completeness.mjs',
 'test-class-mark-draft-inspector.mjs',
 'test-class-mark-save.mjs',
 'test-class-mark-ui.mjs',
 'test-complete-class-roster.mjs',
 'test-roster-query-isolation.mjs',
 'test-teacher-assignment-management.mjs',
 'test-teacher-attendance-service.mjs',
 'test-teacher-attendance-ui.mjs',
 'test-verified-class-attendance-save.mjs',
 'test-verified-small-class-mark-save.mjs'
];
const exclusions=new Set(['test-firestore-emulator.mjs','test-firestore-isolation.mjs']);
const registered=new Set(suites);
const all=readdirSync(fileURLToPath(new URL('.',import.meta.url))).filter(name=>/^test-.*\.mjs$/.test(name)&&!exclusions.has(name));
const unregistered=all.filter(name=>!registered.has(name));
const missing=suites.filter(name=>!all.includes(name));
if(unregistered.length||missing.length){console.error('Offline suite registry mismatch:',{unregistered,missing});process.exit(1)}
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
