// Scenario estimator, not real usage telemetry or a guarantee of capacity.
// Firestore Standard free quotas apply to the entire project, not each school.
// https://firebase.google.com/docs/firestore/quotas
export const SPARK_LIMITS=Object.freeze({reads:50000,writes:20000,storageGiB:1});
export function estimateSparkDay({schools,studentsPerSchool,attendancePerStudent,otherReadsPerSchool,otherWritesPerSchool,dashboardUsersPerSchool,activityHours}){
 const inputs={schools,studentsPerSchool,attendancePerStudent,otherReadsPerSchool,otherWritesPerSchool,dashboardUsersPerSchool,activityHours};
 for(const [key,value] of Object.entries(inputs))if(!Number.isSafeInteger(value)||value<0||value>1000000)throw Error('Invalid '+key);
 if(activityHours>24)throw Error('Activity hours must be 0–24');
 const attendanceWrites=schools*studentsPerSchool*attendancePerStudent;
 // Upper bound for foreground activity during the indicated window, including
 // a possible initial heartbeat at the start. No activity means zero.
 const heartbeatWrites=schools*dashboardUsersPerSchool*(activityHours===0?0:activityHours*4+1);
 const reads=schools*otherReadsPerSchool;
 const writes=attendanceWrites+heartbeatWrites+schools*otherWritesPerSchool;
 if(!Number.isSafeInteger(reads)||!Number.isSafeInteger(writes))throw Error('Scenario too large');
 return {attendanceWrites,heartbeatWrites,reads,writes,readBudgetRemaining:SPARK_LIMITS.reads-reads,
  writeBudgetRemaining:SPARK_LIMITS.writes-writes,withinEstimatedDailyQuota:reads<=SPARK_LIMITS.reads&&writes<=SPARK_LIMITS.writes};
}
