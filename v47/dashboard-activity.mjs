// Spark-only dashboard activity. No timers or background writes. This is a
// recent-activity estimate, NOT a count of active Firebase auth sessions.
export const ACTIVITY_INTERVAL_MS=15*60*1000;
export const RECENT_ACTIVITY_MS=30*60*1000;
export function createActivityGate(interval=ACTIVITY_INTERVAL_MS){
 if(!Number.isSafeInteger(interval)||interval<ACTIVITY_INTERVAL_MS)throw Error('Activity interval must be at least 15 minutes');
 let current='',last=-Infinity;
 return Object.freeze({
  claim({schoolId,uid,now,visible}){
   if(!visible||typeof schoolId!=='string'||!/^\d{5,20}$/.test(schoolId)||typeof uid!=='string'||!uid||!Number.isFinite(now))return false;
   const key=schoolId+':'+uid;
   if(key!==current){current=key;last=-Infinity}
   if(now<last||now-last<interval)return false;
   last=now;return true;
  }
 });
}
export async function recordDashboardActivity({db,api,actor,assertSession}){
 if(actor?.active!==true||!['school_admin','teacher','viewer'].includes(actor.role)||!/^\d{5,20}$/.test(actor.schoolId??'')||!actor.uid||
    typeof assertSession!=='function')throw Error('Verified school session required');
 const {schoolId,uid}=actor;
 assertSession();
 // Firestore independently validates self-identity, membership, server time
 // and minimum interval across tabs/devices. Denied heartbeat never affects login.
 await api.setDoc(api.doc(db,'schools',schoolId,'dashboard_activity',uid),{schoolId,uid,lastSeen:api.serverTimestamp()});
}
export async function readRecentDashboardActivity({db,api,actor,now=Date.now(),assertSession}){
 if(actor?.role!=='school_admin'||actor.active!==true||typeof assertSession!=='function'||!Number.isFinite(now))throw Error('School Admin required');
 assertSession();
 const q=api.query(api.collection(db,'schools',actor.schoolId,'dashboard_activity'),
   api.where('lastSeen','>=',new Date(now-RECENT_ACTIVITY_MS)),
   api.where('lastSeen','<=',new Date(now+60_000)));
 const snap=await api.getCountFromServer(q);assertSession();
 const count=snap.data().count;
 if(!Number.isSafeInteger(count)||count<0)throw Error('Invalid activity count');
 return count;
}
