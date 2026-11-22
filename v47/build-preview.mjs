// Prepare a V47-only static preview; this does not authorize deployment.
import {readdirSync,readFileSync,mkdirSync,writeFileSync,copyFileSync,rmSync} from 'node:fs';
import {join,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {dirname} from 'node:path';
const root=dirname(fileURLToPath(import.meta.url)),dest=join(root,'dist');
const entries=readdirSync(root,{withFileTypes:true});
const browserFiles=entries.filter(e=>e.isFile()&&(
 e.name.endsWith('.html')||
 e.name.endsWith('.css')||
 e.name.endsWith('.webmanifest')||
 (e.name.endsWith('.mjs')&&!e.name.startsWith('test-')&&!e.name.startsWith('release-')&&!e.name.startsWith('firebase-admin'))
)).map(e=>e.name);
if(!browserFiles.includes('index.html')||!browserFiles.includes('dashboard-console.mjs')||!browserFiles.includes('v47-firebase-config.mjs'))
 throw new Error('Required V47 dashboard files missing');
const config=readFileSync(join(root,'v47-firebase-config.mjs'),'utf8');
if(!config.includes("projectId:'smss-exam-portal-v47'"))throw new Error('Refusing non-V47 Firebase config');
const dashboard=readFileSync(join(root,'index.html'),'utf8');
if(!dashboard.includes('Development only'))throw new Error('Preview must retain development warning');
for(const file of browserFiles.filter(f=>f.endsWith('.html'))){
 const html=readFileSync(join(root,file),'utf8');
 for(const match of html.matchAll(/(?:src|href)=["']\.\/([^"'?#]+)["']/g)){
  const dependency=match[1];
  if(!browserFiles.includes(dependency)&&!['favicon.ico'].includes(dependency))
   throw new Error(file+' references missing browser asset '+dependency);
 }
}
rmSync(dest,{recursive:true,force:true});mkdirSync(dest,{recursive:true});
for(const file of browserFiles)copyFileSync(join(root,file),join(dest,file));
writeFileSync(join(dest,'PREVIEW-ONLY.txt'),'V47 development preview. Not approved for production deployment.\n');
console.log('Prepared V47 development preview with '+browserFiles.length+' browser files. No deployment performed.');
