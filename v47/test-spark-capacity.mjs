import assert from 'node:assert/strict';
import {estimateSparkDay} from './spark-capacity.mjs';
import {loadPlatformSchoolCounts} from './super-admin-dashboard.mjs';
const input={schools:30,studentsPerSchool:500,attendancePerStudent:1,otherReadsPerSchool:1000,otherWritesPerSchool:50,dashboardUsersPerSchool:10,activityHours:1};
const result=estimateSparkDay(input);
assert.equal(result.attendanceWrites,15000);assert.equal(result.heartbeatWrites,1500);
assert.equal(result.writes,18000);assert.equal(result.reads,30000);assert.equal(result.withinEstimatedDailyQuota,true);
assert.equal(estimateSparkDay({...input,studentsPerSchool:1500}).withinEstimatedDailyQuota,false);
assert.equal(estimateSparkDay({...input,activityHours:0}).heartbeatWrites,0);
assert.throws(()=>estimateSparkDay({...input,activityHours:25}),/hours/);
assert.throws(()=>estimateSparkDay({...input,schools:-1}),/Invalid/);
let reads=0;
const opts={db:{},actor:{uid:'root',role:'super_admin',active:true},assertSession:()=>{},
 api:{collection:()=> 'schools',where:(...a)=>a,query:(...a)=>a,getCountFromServer:async q=>{reads++;return {data:()=>({count:q==='schools'?42:37})}}}};
assert.deepEqual(await loadPlatformSchoolCounts(opts),{totalSchools:42,activeSchools:37,inactiveSchools:5});
assert.equal(reads,2);
await assert.rejects(loadPlatformSchoolCounts({...opts,actor:{uid:'x',role:'school_admin',active:true}}),/Super Admin/);
assert.equal(reads,2);
console.log('PASS Spark capacity scenario and unpaginated platform school counts');
