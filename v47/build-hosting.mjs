// Build only browser-reachable V47 assets. Never publish tests, rules or backend-only modules.
import {mkdir,readdir,copyFile,rm,readFile} from 'node:fs/promises';
import {extname} from 'node:path';
const source=new URL('./',import.meta.url);
const dist=new URL('./dist/',import.meta.url);
const config=JSON.parse(await readFile(new URL('firebase.json',source),'utf8'));
if(config.hosting?.public!=='dist')throw new Error('V47 Hosting must use isolated dist');
const files=await readdir(source,{withFileTypes:true});
const available=new Set(files.filter(f=>f.isFile()).map(f=>f.name));
const required=['index.html','school-login.html','school-login.mjs','admin.html','school-admin.html','students.html','attendance.html'];
for(const name of required)if(!available.has(name))throw new Error('Missing entry: '+name);
const blocked=name=>name.startsWith('test-')||name.startsWith('firebase.')||name.startsWith('build-')||name.startsWith('server-')||name.startsWith('release-')||name.startsWith('audit-')||['firebase.json','firestore.rules','firestore.indexes.json','run-unit-checks.mjs'].includes(name);
const assets=new Set();
const queue=files.filter(f=>f.isFile()&&(f.name.endsWith('.html')||f.name==='school-login.mjs')).map(f=>f.name);
const localRef=(ref,owner)=>{
 if(!ref.startsWith('./'))return;
 const name=decodeURIComponent(ref.slice(2).split(/[?#]/)[0]);
 if(!name||!/^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(name)||blocked(name)||!available.has(name))
  throw new Error(owner+' references unavailable or forbidden asset '+ref);
 queue.push(name);
};
while(queue.length){
 const name=queue.shift();
 if(assets.has(name))continue;
 if(blocked(name))throw new Error('Forbidden public asset '+name);
 if(!available.has(name))throw new Error('Missing public asset '+name);
 assets.add(name);
 const ext=extname(name);
 if(!['.html','.mjs','.js','.css','.webmanifest'].includes(ext))continue;
 const code=await readFile(new URL(name,source),'utf8');
 if(ext==='.webmanifest'){
  let manifest;
  try{manifest=JSON.parse(code)}catch{throw new Error('Invalid V47 PWA manifest')}
  if(!Array.isArray(manifest?.icons)||!manifest.icons.length)throw new Error('V47 PWA icons required');
  for(const icon of manifest.icons){
   if(typeof icon?.src!=='string'||!icon.src.startsWith('./'))throw new Error('V47 PWA icon must be local');
   localRef(icon.src,name);
  }
 }else if(ext==='.html'){
  for(const m of code.matchAll(/(?:src|href)\s*=\s*["'](\.\/[^"'?#]+)["']/g))localRef(m[1],name);
 }else if(ext==='.mjs'||ext==='.js'){
  if(/(?:from\s*['"]node:|import\s*['"]node:)/.test(code))throw new Error('Node-only import reachable in V47 hosting: '+name);
  for(const m of code.matchAll(/(?:\bfrom\s*|\bimport\s*\(|\bimport\s*)["']([^"']+)["']/g))localRef(m[1],name);
 }else{
  for(const m of code.matchAll(/url\(\s*["']?(\.\/[^)"']+)/g))localRef(m[1],name);
 }
}
await rm(dist,{recursive:true,force:true});
await mkdir(dist,{recursive:true});
for(const name of assets)await copyFile(new URL(name,source),new URL(name,dist));
console.log('V47 browser-reachable hosting bundle:',assets.size,'files');
