import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadVerifiedSchoolStats,dashboardStatsText,DASHBOARD_STATS_COLLECTIONS} from './dashboard-stats.mjs';
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
console.log('PASS V47 dashboard counts: verified tenant, role-limited members, session revocation, no online-user claims');
