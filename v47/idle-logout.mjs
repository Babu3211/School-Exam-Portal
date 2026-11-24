// V47-only inactivity guard; no timers or listeners remain after stop().
export function installIdleLogout({target=globalThis.document,timeoutMs=60*60*1000,onTimeout,now=()=>Date.now(),setTimer=globalThis.setTimeout,clearTimer=globalThis.clearTimeout}){
 if(typeof onTimeout!=='function'||!Number.isSafeInteger(timeoutMs)||timeoutMs<1000)throw Error('Invalid inactivity policy');
 let timer=null,stopped=false,lastActivity=now();
 const events=['pointerdown','keydown','touchstart'];
 const stop=()=>{if(stopped)return;stopped=true;if(timer!==null)clearTimer(timer);for(const event of events)target.removeEventListener(event,activity,true);target.removeEventListener('visibilitychange',visibility)};
 const schedule=(delay=timeoutMs)=>{if(timer!==null)clearTimer(timer);timer=setTimer(expire,delay)};
 const expired=()=>{const elapsed=now()-lastActivity;return !Number.isFinite(elapsed)||elapsed<0||elapsed>=timeoutMs};
 const finish=()=>{stop();void onTimeout()};
 const expire=()=>{if(stopped)return;if(expired()){finish();return}schedule(timeoutMs-(now()-lastActivity))};
 const activity=()=>{if(stopped)return;if(expired()){finish();return}lastActivity=now();schedule()};
 const visibility=()=>{if(!target.hidden)expire()};
 // A suspended browser can delay timers. Check the elapsed time before an
 // activity resets it, and on returning to the foreground. No polling.
 for(const event of events)target.addEventListener(event,activity,{passive:true,capture:true});
 target.addEventListener('visibilitychange',visibility);
 schedule();return stop;
}
