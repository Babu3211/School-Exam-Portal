// V47-only inactivity guard; no timers or listeners remain after stop().
export function installIdleLogout({target=globalThis.document,timeoutMs=60*60*1000,onTimeout,now=()=>Date.now(),setTimer=globalThis.setTimeout,clearTimer=globalThis.clearTimeout}){
 if(typeof onTimeout!=='function'||!Number.isSafeInteger(timeoutMs)||timeoutMs<1000)throw Error('Invalid inactivity policy');
 let timer=null,stopped=false,lastActivity=now();
 const expire=()=>{if(stopped)return;const remaining=timeoutMs-(now()-lastActivity);if(remaining>0){schedule(remaining);return}stop();void Promise.resolve().then(onTimeout)};
 const schedule=(delay=timeoutMs)=>{if(timer!==null)clearTimer(timer);timer=setTimer(expire,delay)};
 const activity=()=>{if(stopped)return;lastActivity=now();schedule()};
 const events=['pointerdown','keydown','touchstart'];
 for(const event of events)target.addEventListener(event,activity,{passive:true});
 const stop=()=>{if(stopped)return;stopped=true;if(timer!==null)clearTimer(timer);for(const event of events)target.removeEventListener(event,activity)};
 schedule();return stop;
}
