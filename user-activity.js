// SMSS V45 user activity. Admin-only reporting; user-owned presence and event writes.
// Presence is approximate: stale sessions expire after 120 seconds.
import {collection,doc,getDoc,getDocs,setDoc,addDoc,serverTimestamp,query,orderBy,limit} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
const ADMIN_UID="K6uSLmqg0vWCtCuzwtxKzFpQMu62";
const sessionId=crypto.randomUUID();
let heartbeat=null,trackedUid=null;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const activeWithin=(value,ms)=>value?.toMillis&&Date.now()-value.toMillis()<ms;
export function initUserActivity({auth,db}){
 async function writeEvent(type,user){
  if(!user)return;
  try{await addDoc(collection(db,"user_activity"),{uid:user.uid,type,sessionId,at:serverTimestamp()});}
  catch(err){console.warn("Activity event unavailable:",err.code||err.message);}
 }
 async function presence(user,online){
  if(!user)return;
  try{await setDoc(doc(db,"user_presence",sessionId),{uid:user.uid,online,updatedAt:serverTimestamp()});}
  catch(err){console.warn("Presence update unavailable:",err.code||err.message);}
 }
 async function authorized(user){
  if(user.uid===ADMIN_UID)return true;
  const role=await getDoc(doc(db,"user_roles",user.uid));
  return role.exists()&&role.data().active===true;
 }
 async function start(user){
  if(!user||trackedUid===user.uid)return;
  if(!await authorized(user))return;
  trackedUid=user.uid;
  await presence(user,true);
  heartbeat=setInterval(()=>{if(auth.currentUser?.uid===user.uid)void presence(user,true);},45000);
 }
 async function stop(user){
  if(heartbeat)clearInterval(heartbeat);
  heartbeat=null;trackedUid=null;
  if(user)await presence(user,false);
 }
 async function onAuth(user){
  if(!user){trackedUid=null;if(heartbeat)clearInterval(heartbeat);heartbeat=null;return;}
  try{await start(user);}catch(err){console.warn("Activity initialization unavailable:",err.code||err.message);}
 }
 // Called only after the app has validated a role, not on an unsuccessful login.
 async function login(user){await start(user);await writeEvent("login",user);}
 async function logout(user){await writeEvent("logout",user);await stop(user);}
 async function render(){
  const host=document.getElementById("smssUserActivity");
  if(!host||auth.currentUser?.uid!==ADMIN_UID)return;
  host.innerHTML='<p>Loading user activity…</p>';
  try{
   const [roles,presenceDocs,events]=await Promise.all([
    getDocs(collection(db,"user_roles")),
    getDocs(collection(db,"user_presence")),
    getDocs(query(collection(db,"user_activity"),orderBy("at","desc"),limit(150)))
   ]);
   const users=roles.docs.map(x=>({uid:x.id,...x.data()}));
   const known=new Map(users.map(x=>[x.uid,x]));
   const online=new Set(presenceDocs.docs.filter(x=>x.data().online===true&&activeWithin(x.data().updatedAt,120000)).map(x=>x.data().uid));
   const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kathmandu",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
   const day=ts=>ts?.toDate?new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kathmandu",year:"numeric",month:"2-digit",day:"2-digit"}).format(ts.toDate()):"";
   const activity=events.docs.map(x=>x.data());
   const logins=new Set(activity.filter(x=>x.type==="login"&&day(x.at)===today).map(x=>x.uid));
   const total=users.length+Number(!known.has(ADMIN_UID));
   const active=users.filter(x=>x.active===true).length+Number(!known.has(ADMIN_UID));
   const cards=[["Total Users",total],["Active Accounts",active],["Online (approx.)",online.size],["Today's Logins",logins.size]];
   host.innerHTML='<h3 style="margin:0 0 10px">User Activity (Admin Only)</h3><div class="grid stats">'+cards.map(([k,v])=>'<div class="card"><div class="statlabel">'+k+'</div><div class="num">'+v+'</div></div>').join("")+'</div><details><summary style="cursor:pointer;font-weight:700">Recent Login / Logout History</summary><div class="tablewrap"><table><thead><tr><th>User</th><th>Event</th><th>Time (Nepal)</th></tr></thead><tbody>'+activity.slice(0,50).map(e=>{const u=known.get(e.uid);const name=u?.displayName||u?.email||(e.uid===ADMIN_UID?"Admin":"User");const time=e.at?.toDate?.().toLocaleString("en-GB",{timeZone:"Asia/Kathmandu"})||"Pending";return '<tr><td>'+esc(name)+'</td><td>'+esc(e.type)+'</td><td>'+esc(time)+'</td></tr>';}).join("")+'</tbody></table></div></details><p class="hint">Online is estimated from recent heartbeats. Login counts include recorded events only.</p>';
  }catch(err){host.textContent="User activity unavailable: "+(err.code||"Check permissions/network");}
 }
 return {login,logout,onAuth,render};
}
