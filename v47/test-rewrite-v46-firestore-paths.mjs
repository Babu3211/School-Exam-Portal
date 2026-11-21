import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {rewriteV46FirestorePaths,V46_COLLECTIONS,assertV47TenantCollection,auditV46TenantIntegration} from './rewrite-v46-firestore-paths.mjs';
const source=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const result=rewriteV46FirestorePaths(source);
assert.equal(result.collections.length,V46_COLLECTIONS.length);
assert.equal(result.dynamicCount,3);
assert.match(result.source,/collection\(db, "schools", activeSchoolId, assertV47TenantCollection\(name\)\)/);
assert.match(result.source,/doc\(db, "schools", activeSchoolId, assertV47TenantCollection\(name\),\s*item\.id\)/);
for(const name of V46_COLLECTIONS)assert.ok(result.collections.includes(name));
assert.match(result.source,/collection\(db, "schools", activeSchoolId, "students"/);
assert.match(result.source,/doc\(db, "schools", activeSchoolId, "school_settings"/);
assert.doesNotMatch(result.source,/collection\(db\s*,\s*['"]students['"]/);
assert.doesNotMatch(result.source,/doc\(db\s*,\s*['"]marks['"]/);
assert.throws(()=>rewriteV46FirestorePaths(source+'\ncollection(db,"unknown_records")'),/Unreviewed V46/);
assert.throws(()=>rewriteV46FirestorePaths('collection(db,"students")'),/V46 dynamic collection\/document call count changed|Expected V46 collection/);
for(const name of V46_COLLECTIONS)assert.equal(assertV47TenantCollection(name),name);
for(const name of ['members','schools','unknown','../students','',null,undefined])assert.throws(()=>assertV47TenantCollection(name),/Unreviewed V47 tenant collection/);
assert.equal((result.source.match(/assertV47TenantCollection\(name\)/g)||[]).length,3);
const integrationAudit=auditV46TenantIntegration(result.source);
assert.equal(integrationAudit.ready,false,'Path rewriting alone must not be treated as V47 integration');
assert.ok(integrationAudit.blockers.some(x=>x.includes('admin UID')));
assert.ok(integrationAudit.blockers.some(x=>x.includes('Firebase configuration')));
assert.ok(integrationAudit.blockers.length>=2,'Rewritten paths still require authentication and Firebase project migration');
assert.equal(auditV46TenantIntegration('const activeSchoolId="12345678"; function assertV47TenantCollection(){}').ready,true);

// Fifteen audit cases: actual migration hazards and fail-closed outcomes.
const safe='const activeSchoolId="12345678"; function assertV47TenantCollection(){}';
const auditCases=[
 ['hardcoded admin',safe+' const ADMIN_UID="legacy";','admin UID'],
 ['spaced admin',safe+' const   ADMIN_UID = "legacy";','admin UID'],
 ['legacy const config',safe+' const firebaseConfig={};','Firebase configuration'],
 ['legacy let config',safe+' let firebaseConfig={};','Firebase configuration'],
 ['legacy var config',safe+' var firebaseConfig={};','Firebase configuration'],
 ['missing school binding','function assertV47TenantCollection(){}','activeSchoolId'],
 ['missing collection guard','const activeSchoolId="12345678";','Dynamic collection guard'],
 ['both legacy hazards',safe+' const ADMIN_UID="legacy"; let firebaseConfig={};','admin UID'],
 ['missing both bindings','const value=1;','activeSchoolId'],
 ['bare identifier boundary',safe+' const ADMIN_UID_SUFFIX=1;',null],
 ['config identifier boundary',safe+' const firebaseConfigOther={};',null],
 ['guard present',safe,null],
 ['whitespace variation',safe.replace('const activeSchoolId','let activeSchoolId'),null],
 ['admin with newline',safe+' const\nADMIN_UID="legacy";','admin UID'],
 ['config with newline',safe+' const\nfirebaseConfig={};','Firebase configuration']
];
assert.equal(auditCases.length,15);
for(const [label,input,expected] of auditCases){
 const audit=auditV46TenantIntegration(input);
 assert.equal(audit.ready,expected===null,label);
 if(expected)assert.ok(audit.blockers.some(b=>b.includes(expected)),label);
}
assert.throws(()=>auditV46TenantIntegration(''),/V46 source required/);
assert.throws(()=>auditV46TenantIntegration(null),/V46 source required/);

console.log('V46 Firestore literal path staging rewrite checks passed; dynamic calls still require manual audit');
