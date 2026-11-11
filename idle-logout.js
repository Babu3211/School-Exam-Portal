// SMSS idle-session protection: log out after 60 minutes without user interaction.
// Last interaction is stored per browser session, including page refreshes.
export function initIdleLogout({auth,onTimeout,minutes=60}){
 const idleMs=minutes*60*1000;
 const key="smss:last-activity:";
 let uid=null,lastActivity=0,timer=null,ending=false,warned=false;
 const now=()=>Date.now();
 const read=()=>{try{return Number(sessionStorage.getItem(key+uid))||0;}catch{return 0;}};
 const save=()=>{try{sessionStorage.setItem(key+uid,String(lastActivity));}catch{}};
 const clear=()=>{try{if(uid)sessionStorage.removeItem(key+uid);}catch{}};
 function warning(){
  let node=document.getElementById("smssIdleWarning");
  if(!node){node=document.createElement("div");node.id="smssIdleWarning";node.setAttribute("role","alert");node.style.cssText="position:fixed;bottom:16px;left:16px;right:16px;z-index:99999;background:#fff4ce;color:#5b3d00;border:2px solid #e8b339;padding:14px;border-radius:12px;box-shadow:0 4px 20px #0002;max-width:600px;margin:auto;font-weight:700";node.textContent="Your session will expire in 5 minutes due to inactivity. Save your work and interact with the page to stay signed in.";document.body.appendChild(node);}
}
function hideWarning(){document.getElementById("smssIdleWarning")?.remove();}
async function check(){
  if(!uid||ending||auth.currentUser?.uid!==uid)return;
  // Check wall clock time to account for sleeping phones and suspended tabs.
  const elapsed=now()-Math.max(lastActivity,read());
  if(elapsed>=idleMs-5*60*1000&&!warned){warned=true;warning();}
  if(elapsed>=idleMs){
   ending=true;
   try{await onTimeout(auth.currentUser);}finally{stop();}
  }
 }
 function activity(){
  if(!uid||ending||auth.currentUser?.uid!==uid)return;
  if(now()-lastActivity<1000)return;
  // Do not allow a first interaction after the idle limit to extend the session.
  if(now()-Math.max(lastActivity,read())>=idleMs){void check();return;}
  lastActivity=now();warned=false;hideWarning();save();
 }
 const events=["pointerdown","keydown","touchstart","scroll"];
 function stop(){
  if(timer)clearInterval(timer);timer=null;
  for(const event of events)document.removeEventListener(event,activity);
  document.removeEventListener("visibilitychange",check);
  window.removeEventListener("focus",check);
  hideWarning();clear();uid=null;lastActivity=0;ending=false;warned=false;
 }
 function start(user){
  if(!user)return;
  if(uid===user.uid)return;
  stop();uid=user.uid;
  lastActivity=read()||now();
  save();
  for(const event of events)document.addEventListener(event,activity,{passive:true});
  document.addEventListener("visibilitychange",check);
  window.addEventListener("focus",check);
  timer=setInterval(check,15000);
  void check();
 }
 return {start,stop,check};
}
