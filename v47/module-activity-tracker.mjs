// Explicitly verified module activity; never count an unverified login or background tab.
// One bounded attempt per school/account per 15 minutes in this browser tab.
// Firestore rules independently enforce self-identity, membership and server-time throttling.
import {ACTIVITY_INTERVAL_MS,recordDashboardActivity} from './dashboard-activity.mjs';
import {verifySchoolSession} from './verified-school-session.mjs';
export function createModuleActivityTracker({db,api,auth,storage,visible,now=Date.now}){
 let binding=null,inFlight=false,lastKey='',lastAt=-Infinity;
 const clear=()=>{binding=null};
 function bind(member,isCurrent){
  if(!member||member.active!==true||!['school_admin','teacher','viewer'].includes(member.role)||!/^\d{5,20}$/.test(member.schoolId)||typeof member.uid!=='string'||!member.uid||typeof isCurrent!=='function')throw Error('Verified activity session required');
  binding={member:{...member},isCurrent};
 }
 async function note(){
  const selected=binding;if(!selected||inFlight||!visible())return false;
  const {member,isCurrent}=selected;
  const check=()=>{if(binding!==selected||auth.currentUser?.uid!==member.uid||!isCurrent()||!visible())throw Error('Activity session changed')};
  try{check()}catch{return false}
  const timestamp=now(),key=member.schoolId+':'+member.uid,storageKey='smss-v47-module-activity';
  if(!Number.isFinite(timestamp))return false;
  let prior=null;try{prior=JSON.parse(storage.getItem(storageKey)||'null')}catch{}
  if(lastKey===key&&(timestamp<lastAt||timestamp-lastAt<ACTIVITY_INTERVAL_MS)||prior?.key===key&&Number.isFinite(prior.at)&&(timestamp<prior.at||timestamp-prior.at<ACTIVITY_INTERVAL_MS))return false;
  lastKey=key;lastAt=timestamp;
  try{storage.setItem(storageKey,JSON.stringify({key,at:timestamp}))}catch{}
  inFlight=true;
  try{
   const fresh=await verifySchoolSession({schoolId:member.schoolId,uid:member.uid,readDocument:async path=>{
    check();const snap=await api.getDocFromServer(api.doc(db,...path.split('/')));check();return snap.exists()?snap.data():null;
   }});
   check();if(fresh.role!==member.role)return false;
   await recordDashboardActivity({db,api,actor:{...fresh,active:true},assertSession:check});
   return true;
  }catch{return false}finally{inFlight=false}
 }
 return Object.freeze({bind,clear,note});
}
