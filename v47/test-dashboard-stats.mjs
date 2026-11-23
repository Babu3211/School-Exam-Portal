import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadVerifiedSchoolStats,dashboardStatsText,DASHBOARD_STATS_COLLECTIONS,createForegroundStatsGate} from './dashboard-stats.mjs';
const schoolId='300160003',uid='user1',counts={students:384,staff:23,subjects:12,exams:6,members:27,activeMembers:24};
const make=(role,memberOverride={})=>{
 const member={schoolId,uid,role,active:true,...memberOverride};
 const calls=[];
 const context={
  schoolId,uid,role,
  readDocument:async path=>path==='schools/'+schoolId?{id:schoolId,active:true}:path==='schools/'+schoolId+'/members/'+uid?member:null,
  readCount:async(name,{activeOnly=false}={})=>{calls.push({name,activeOnly});return activeOnly?counts.activeMembers:counts[name]},
  assertSession:()=>{}
 };
 return {context,calls};
};
const admin=make('school_admin');
const a=await loadVerifiedSchoolStats(admin.context);
assert.deepEqual(DASHBOARD_STATS_COLLECTIONS,['students','staff','subjects','exams']);
assert.equal(a.students,384);assert.equal(a.activeMembers,24);
assert.equal(admin.calls.length,6);
assert.match(dashboardStatsText(a),/Active Memberships \(not online\): 24/);
const viewer=make('viewer');
const v=await loadVerifiedSchoolStats(viewer.context);
assert.equal(v.members,undefined);assert.equal(viewer.calls.length,4);
assert.doesNotMatch(dashboardStatsText(v),/Accounts|Memberships/);
await assert.rejects(loadVerifiedSchoolStats(make('viewer',{role:'teacher'}).context),/changed/);
await assert.rejects(loadVerifiedSchoolStats({...viewer.context,readCount:async()=>-1}),/Invalid school count/);
await assert.rejects(loadVerifiedSchoolStats({...admin.context,readCount:async(name,{activeOnly=false}={})=>activeOnly?999:counts[name]}),/Invalid active membership/);
await assert.rejects(loadVerifiedSchoolStats({...admin.context,assertSession:()=>{throw Error('logout')}}),/logout/);
let revoked=false;
await assert.rejects(loadVerifiedSchoolStats({...admin.context,readCount:async(name)=>{revoked=true;return counts[name]},assertSession:()=>{if(revoked)throw Error('auth switched')}}),/auth switched/);
const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
const src=readFileSync(new URL('./dashboard-console.mjs',import.meta.url),'utf8');
assert.match(html,/id="dashboardStats"/);
assert.match(html,/id="dashboardRefreshStats" disabled/);
assert.match(src,/loadVerifiedSchoolStats\(/);
assert.match(src,/api\.getCountFromServer\(query\)/);
assert.match(src,/verifySchoolSession/);
assert.match(src,/if\(!await enforceSchoolIdle\(auth,authSdk\)\)/);
assert.match(src,/void refreshStats\(\)/);
assert.match(src,/statsRequest\+\+/);
for(const id of ['students','staff','subjects','exams','members','activeMembers'])assert.match(html,new RegExp('data-metric="'+id+'"'));
assert.match(html,/data-admin-metric hidden/);
assert.match(src,/function resetMetricCards\(\)/);
assert.match(src,/function showMetricCards\(stats\)/);
assert.match(src,/if\(adminOnly&&stats\.role!=='school_admin'\)/);
assert.match(src,/resetMetricCards\(\);\$\('dashboardStats'\)\.textContent/);
assert.match(src,/showMetricCards\(loaded\)/);
console.log('PASS V47 dashboard counts: verified tenant, role-limited members, session revocation, no online-user claims');

const foreground=createForegroundStatsGate(60_000);
const a0={schoolId,uid,now:100_000,visible:true};
foreground.seed(a0);
assert.equal(foreground.shouldRefresh({...a0,now:110_000}),false,'No immediate duplicate queries');
assert.equal(foreground.shouldRefresh({...a0,now:200_000,visible:false}),false,'No background polling');
assert.equal(foreground.shouldRefresh({...a0,now:160_000}),true,'Foreground after throttle refreshes');
assert.equal(foreground.shouldRefresh({...a0,now:160_001}),false,'Focus and visibility events deduplicated');
assert.equal(foreground.shouldRefresh({...a0,uid:'other',now:160_002}),true,'New session is separately scoped');
foreground.reset();
assert.equal(foreground.shouldRefresh({...a0,now:160_003}),true,'Logout clears previous session');
assert.throws(()=>createForegroundStatsGate(0),/interval/);
assert.equal(foreground.shouldRefresh({...a0,now:NaN}),false);
assert.match(src,/window\.addEventListener\('focus'/);
assert.match(src,/refreshOnForeground\(\)/);
assert.match(src,/foregroundStatsGate\.reset\(\)/);
assert.match(src,/foregroundStatsGate\.seed\(/);
