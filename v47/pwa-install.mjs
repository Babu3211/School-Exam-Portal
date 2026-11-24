// Browser-only install UI. No private data is cached or sent by this module.
export function installSurface({standalone,ios,hasPrompt,android}){
 if(standalone)return {visible:false,button:false,hint:''};
 if(hasPrompt)return {visible:true,button:true,hint:'Install the V47 app on this device.'};
 if(ios)return {visible:true,button:false,hint:'In Safari, tap Share, then Add to Home Screen.'};
 if(android)return {visible:true,button:false,hint:'Open in Chrome and choose Install app from the browser menu, if offered.'};
 return {visible:false,button:false,hint:''};
}
export function isIsolatedPwaOrigin(host){
 return host==='localhost'||host==='127.0.0.1'||host==='smss-exam-portal-v47.web.app'||host==='smss-exam-portal-v47.firebaseapp.com'||
  /^smss-exam-portal-v47--[a-z0-9-]+\.web\.app$/.test(host);
}
export function mountV47Install({win,doc,nav}){
 const banner=doc.getElementById('installBanner'),button=doc.getElementById('installPortal'),hint=doc.getElementById('installHint');
 if(!banner||!button||!hint||!isIsolatedPwaOrigin(win.location.hostname))return;
 let deferred=null,installed=false,prompting=false;
 const display=win.matchMedia('(display-mode: standalone)');
 const ua=nav.userAgent??'',ios=/iPhone|iPad|iPod/i.test(ua)||(nav.platform==='MacIntel'&&nav.maxTouchPoints>1),android=/Android/i.test(ua);
 const render=()=>{
  const state=installSurface({standalone:installed||display.matches||nav.standalone===true,ios,android,hasPrompt:!!deferred});
  banner.hidden=!state.visible;button.hidden=!state.button;button.disabled=prompting;hint.textContent=state.hint;
 };
 win.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferred=event;render()});
 win.addEventListener('appinstalled',()=>{installed=true;deferred=null;render()});
 display.addEventListener?.('change',render);
 button.addEventListener('click',async()=>{
  if(!deferred||prompting)return;
  prompting=true;const prompt=deferred;deferred=null;render();
  try{await prompt.prompt();const choice=await prompt.userChoice;if(choice?.outcome==='accepted')installed=true}
  catch{/* Browser may decline; no invented success. */}
  finally{prompting=false;render()}
 });
 render();
 // Keep the worker isolated and network-only. Do not register on V46/GitHub
 // Pages or any unrecognized origin. All school records remain network based.
 if(nav.serviceWorker&&win.isSecureContext){
  const worker=new URL('./v47-service-worker.js',win.location.href);
  if(worker.origin===win.location.origin)void nav.serviceWorker.register(worker.href,{scope:'./'}).catch(()=>{});
 }
}
if(typeof window!=='undefined'&&typeof document!=='undefined'&&typeof navigator!=='undefined')
 mountV47Install({win:window,doc:document,nav:navigator});
