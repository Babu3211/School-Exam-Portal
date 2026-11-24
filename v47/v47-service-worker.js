// V47 installation support only. No CacheStorage, no offline academic data,
 // no interception of Firebase Auth/Firestore, no mutation or request replay.
 self.addEventListener('install',()=>{});
 self.addEventListener('activate',()=>{});
 self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||event.request.mode!=='navigate'||new URL(event.request.url).origin!==self.location.origin)return;
  // A network-only navigation does not store authenticated pages or responses.
  event.respondWith(fetch(event.request,{cache:'no-store'}));
 });
