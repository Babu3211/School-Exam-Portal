// Same-origin static assets for a school-owned V47 Node runtime.
// Serve only flat, built public files. Never expose source, credentials or rules.
import {realpath,readdir,lstat,readFile} from 'node:fs/promises';
import {join,extname} from 'node:path';
const types=Object.freeze({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon','.woff2':'font/woff2'});
const allowed=name=>/^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(name)&&!name.includes('..')&&
 !/^(?:test-|server-|build-|release-|audit-|firebase\.|firestore\.|node_modules)/i.test(name)&&
 !/credential|service.account|private.key|secret|package(?:-lock)?\.json/i.test(name)&&Object.hasOwn(types,extname(name));
export async function createV47StaticHandler(dist){
 const root=await realpath(dist);
 const publicNames=new Set((await readdir(root,{withFileTypes:true})).filter(e=>e.isFile()&&allowed(e.name)).map(e=>e.name));
 if(!publicNames.has('index.html')||!publicNames.has('manifest.webmanifest'))throw Error('Build the isolated V47 Hosting dist first');
 return async(req,res)=>{
  const end=(status,body='')=>{res.statusCode=status;res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.end(req.method==='HEAD'?undefined:body)};
  if(!['GET','HEAD'].includes(req.method))return end(405,'Method not allowed');
  const raw=req.url;
  if(typeof raw!=='string'||raw.length>2048||!raw.startsWith('/')||raw.startsWith('//'))return end(400,'Invalid path');
  const path=raw.split('?')[0];
  // No percent-encoded or nested paths; all V47 built assets have flat names.
  const name=path==='/'?'index.html':path.slice(1);
  if(!allowed(name)||!publicNames.has(name))return end(404,'Not found');
  try{
   const file=join(root,name),info=await lstat(file);
   if(!info.isFile()||await realpath(file)!==file)return end(404,'Not found');
   const content=await readFile(file);
   res.setHeader('Content-Type',types[extname(name)]);
   res.setHeader('Content-Length',String(content.length));
   res.setHeader('Referrer-Policy','no-referrer');
   return end(200,content);
  }catch{return end(404,'Not found')}
 };
}
