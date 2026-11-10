import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const html=await readFile('index.html','utf8');
const entry=await readFile('iemis-entry.js','utf8');
const ledger=await readFile('iemis-ledger.js','utf8');
const source=await readFile('sw.js','utf8');
const base='https://smss-test.example/';
const ledgerImport=html.match(/from ["'](\.\/iemis-ledger\.js\?v=[^"']+)["']/)?.[1];
const entryImport=html.match(/from ["'](\.\/iemis-entry\.js\?v=[^"']+)["']/)?.[1];
assert.ok(ledgerImport&&entryImport,'Updated page must use versioned module URLs.');
assert.ok(entry.includes(ledgerImport),'Nested module import must share the ledger release URL.');
for(const f of ['scripts/fixtures/iemis-layout.html','scripts/fixtures/iemis-entry.html']){
 const fixture=await readFile(f,'utf8');
 assert.ok(fixture.includes(entryImport.replace('./','../')));
 if(f.includes('layout'))assert.ok(fixture.includes(ledgerImport.replace('./','../')));
}
const key=request=>new URL(typeof request==='string'?request:request.url,base).href;
const buckets=new Map([['smss-pwa-old',new Map([[key('./iemis-ledger.js'),'old module without the new export'],[key('./index.html'),'old app']])],['unrelated-cache',new Map([['keep','keep']])]]);
const listeners={};let online=true,claimed=false;const fetched=[];
const network=async request=>{if(!online)throw new Error('Offline test');const url=new URL(key(request));fetched.push(url.href);return new Response(url.pathname.startsWith('/qa/')?'synthetic QA':url.pathname==='/iemis-ledger.js'?ledger:url.pathname==='/iemis-entry.js'?entry:html);};
const caches={
 async open(name){if(!buckets.has(name))buckets.set(name,new Map());const bucket=buckets.get(name);return {async addAll(paths){for(const path of paths)bucket.set(key(path),await (await network(path)).text());},async put(request,response){bucket.set(key(request),await response.text());}};},
 async keys(){return [...buckets.keys()];},async delete(name){return buckets.delete(name);},
 async match(request){for(const bucket of buckets.values()){if(bucket.has(key(request)))return new Response(bucket.get(key(request)));}}
};
const self={location:new URL('sw.js',base),addEventListener:(name,fn)=>listeners[name]=fn,skipWaiting:async()=>{},clients:{claim:async()=>{claimed=true;}}};
vm.runInNewContext(source,{self,caches,fetch:network,URL,Response});
const request=async (path,mode='cors',method='GET')=>{let pending;listeners.fetch({request:{url:new URL(path,base).href,method,mode},respondWith:p=>pending=p});return pending?await pending:undefined;};
// The OLD worker's cache-first strategy must not match a new release's import URL.
assert.match(await (await request(ledgerImport)).text(),/export function iemisLegacyTheory/);
assert.ok(fetched.includes(key(ledgerImport)));
let pending;listeners.install({waitUntil:p=>pending=p});await pending;
listeners.activate({waitUntil:p=>pending=p});await pending;
assert.equal(claimed,true);assert.equal(buckets.has('smss-pwa-old'),false);assert.equal(buckets.has('unrelated-cache'),true);
const before=await (await request('./index.html','navigate')).text();
const mutablePath='./cdc-question-paper.js';
const firstMutable=await (await request(mutablePath)).text();
assert.ok(fetched.includes(key(mutablePath)),'Mutable script must be fetched online');
const mutableCount=fetched.filter(x=>x===key(mutablePath)).length;
await request(mutablePath);
assert.equal(fetched.filter(x=>x===key(mutablePath)).length,mutableCount+1,'Mutable same-URL scripts must refresh on subsequent online visits');
await request('./qa/iemis-layout','navigate');
online=false;
assert.equal(await (await request(mutablePath)).text(),firstMutable,'Refreshed mutable script must remain available offline');
assert.equal(await (await request('./','navigate')).text(),before,'QA navigation must never replace the offline app shell.');
assert.match(await (await request(ledgerImport)).text(),/export function iemisLegacyTheory/);
assert.match(await (await request(entryImport)).text(),/export class IemisEntryGrid/);
assert.equal(await request('https://external.example/file.js'),undefined,'External requests must not be cached.');
assert.equal(await request('./save','cors','POST'),undefined,'Writes must not be intercepted.');
console.log('PWA upgrade, nested versioned imports, offline release assets, QA isolation and unrelated-cache preservation passed.');
