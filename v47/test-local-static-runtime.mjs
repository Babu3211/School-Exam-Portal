import assert from 'node:assert/strict';
import {mkdtemp,writeFile,symlink,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {createV47StaticHandler} from '../v47-runtime/static-handler.mjs';
const root=await mkdtemp(join(tmpdir(),'v47-static-'));
try{
 await writeFile(join(root,'index.html'),'<h1>V47</h1>');
 await writeFile(join(root,'manifest.webmanifest'),'{}');
 await writeFile(join(root,'attendance.mjs'),'export const a=1;');
 await writeFile(join(root,'firebase.json'),'PRIVATE');
 await writeFile(join(root,'service-account.json'),'PRIVATE');
 await writeFile(join(root,'server-private.mjs'),'PRIVATE');
 await symlink(join(root,'service-account.json'),join(root,'leak.json'));
 const handler=await createV47StaticHandler(root);
 const server=createServer(handler);server.listen(0,'127.0.0.1');await once(server,'listening');
 try{
  const origin='http://127.0.0.1:'+server.address().port;
  const home=await fetch(origin+'/');assert.equal(home.status,200);assert.match(await home.text(),/V47/);
  assert.equal(home.headers.get('cache-control'),'no-store');
  const module=await fetch(origin+'/attendance.mjs?version=47');assert.equal(module.status,200);assert.match(module.headers.get('content-type'),/javascript/);
  for(const path of ['/firebase.json','/service-account.json','/server-private.mjs','/leak.json','/.env','/api/v47/unknown','/nested/index.html','/%69ndex.html']){
   const denied=await fetch(origin+path);assert.equal(denied.status,404,path);assert.doesNotMatch(await denied.text(),/PRIVATE/);
  }
  assert.equal((await fetch(origin+'/',{method:'POST'})).status,405);
  const head=await fetch(origin+'/',{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
 }finally{await new Promise(resolve=>server.close(resolve))}
}finally{await rm(root,{recursive:true,force:true})}
console.log('PASS local V47 static runtime: same-origin public assets, private/encoded/nested paths denied');
