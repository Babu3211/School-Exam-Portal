import assert from 'node:assert/strict';
import {createActivityGate,recordDashboardActivity,readRecentDashboardActivity,ACTIVITY_INTERVAL_MS} from './dashboard-activity.mjs';
const schoolId='12345',uid='user1',actor={schoolId,uid,role:'viewer',active:true};
const gate=createActivityGate(),base={schoolId,uid,now:100000,visible:true};
assert.equal(gate.claim(base),true);
assert.equal(gate.claim({...base,now:base.now+1000}),false);
assert.equal(gate.claim({...base,now:base.now+ACTIVITY_INTERVAL_MS,visible:false}),false);
assert.equal(gate.claim({...base,now:base.now+ACTIVITY_INTERVAL_MS}),true);
assert.equal(gate.claim({...base,now:base.now-1000}),false);
assert.equal(gate.claim({...base,schoolId:'99999'}),true);
let writes=0,reads=0;
const api={doc:(_db,...parts)=>parts.join('/'),serverTimestamp:()=>Symbol.for('serverTime'),
 setDoc:async(path,data)=>{writes++;assert.equal(path,'schools/12345/dashboard_activity/user1');assert.deepEqual(data,{schoolId,uid,lastSeen:Symbol.for('serverTime')})},
 collection:(_db,...parts)=>parts.join('/'),where:(...a)=>a,query:(...a)=>a,
 getCountFromServer:async query=>{reads++;assert.equal(query[0],'schools/12345/dashboard_activity');return {data:()=>({count:3})}}};
const opts={db:{},api,actor,assertSession:()=>{}};
await recordDashboardActivity(opts);assert.equal(writes,1);
await assert.rejects(recordDashboardActivity({...opts,actor:{...actor,active:false}}),/Verified/);
await assert.rejects(readRecentDashboardActivity(opts),/School Admin/);assert.equal(reads,0);
assert.equal(await readRecentDashboardActivity({...opts,actor:{...actor,role:'school_admin'}}),3);
await assert.rejects(readRecentDashboardActivity({...opts,actor:{...actor,role:'school_admin'},assertSession:()=>{throw Error('stale')}}),/stale/);
console.log('PASS Spark dashboard activity: scoped self heartbeat, 15-minute throttle, admin-only recent count, no background writes');
