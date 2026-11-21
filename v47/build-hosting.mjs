// V47-only static hosting build. No V46 files or Firebase writes.
import {mkdir,readdir,copyFile,rm,readFile} from 'node:fs/promises';
import {extname} from 'node:path';
const source=new URL('./',import.meta.url);
const dist=new URL('./dist/',import.meta.url);
await rm(dist,{recursive:true,force:true});
await mkdir(dist,{recursive:true});
const config=JSON.parse(await readFile(new URL('firebase.json',source),'utf8'));
if(config.hosting?.public!=='dist')throw new Error('V47 Hosting must use config-relative dist; refusing unsafe build');
const files=await readdir(source,{withFileTypes:true});
let count=0;
for(const file of files){
 if(!file.isFile()||!['.html','.mjs','.css','.js','.svg','.png','.webp','.ico','.json'].includes(extname(file.name)))continue;
 if(file.name.startsWith('firebase.')||file.name==='firebase.json'||file.name==='firebase.v47.json'||file.name==='firebase.test.json'||file.name==='firebase.emulator.json'||file.name==='firestore.indexes.json')continue;
 if(file.name.startsWith('test-')||file.name==='firestore.rules'||file.name==='build-hosting.mjs')continue;
 await copyFile(new URL(file.name,source),new URL(file.name,dist));
 count++;
}
const required=['index.html','school-login.html','admin.html','school-admin.html','students.html','attendance.html'];
for(const name of required){
 if(!files.some(file=>file.name===name))throw new Error('Missing V47 hosting entry: '+name);
}
const htmlFiles=files.filter(file=>file.isFile()&&file.name.endsWith('.html'));
const copied=new Set((await readdir(dist)));
for(const file of htmlFiles){
 const html=await readFile(new URL(file.name,source),'utf8');
 for(const match of html.matchAll(/(?:src|href)\s*=\s*["']\.\/([^"'?#]+)["']/g)){
  const asset=decodeURIComponent(match[1]);
  if(!copied.has(asset))throw new Error(file.name+' references missing local asset '+asset);
 }
}
// Every relative ESM dependency must be shipped; fail instead of publishing a broken page.
for(const file of files.filter(item=>item.isFile()&&item.name.endsWith('.mjs')&&copied.has(item.name))){
 const code=await readFile(new URL(file.name,source),'utf8');
 const imports=[...code.matchAll(/(?:\\bfrom\\s*|\\bimport\\s*\\(|\\bimport\\s*)['"]([^'"]+)['"]/g)];
 for(const match of imports){
  const dependency=match[1];
  if(!dependency.startsWith('./'))continue;
  const name=dependency.slice(2).split(/[?#]/)[0];
  if(!name||name.includes('/')||!copied.has(name))
   throw new Error(file.name+' imports missing V47 browser module '+dependency);
 }
}
console.log('V47 static hosting build complete:',count,'files; no V46 production changes');
