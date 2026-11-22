// Build an isolated, non-deploying V47 browser preview from reachable assets only.
import {readdirSync,readFileSync,mkdirSync,writeFileSync,copyFileSync,rmSync,existsSync} from 'node:fs';
import {join,dirname,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=dirname(fileURLToPath(import.meta.url)),dest=join(root,'dist');
const all=new Set(readdirSync(root,{withFileTypes:true}).filter(e=>e.isFile()).map(e=>e.name));
const files=new Set(),queue=[...all].filter(name=>name.endsWith('.html')||name.endsWith('.css')||name.endsWith('.webmanifest'));
const allowed=/^[A-Za-z0-9][A-Za-z0-9_.-]*\.(?:html|css|mjs|js|json|webmanifest|png|svg|ico|jpg|jpeg|webp)$/;
if(!all.has('index.html')||!all.has('dashboard-console.mjs')||!all.has('v47-firebase-config.mjs'))throw Error('Required V47 files missing');
const config=readFileSync(join(root,'v47-firebase-config.mjs'),'utf8');
if(!/projectId:\s*['"]smss-exam-portal-v47['"]/.test(config))throw Error('Refusing non-V47 Firebase project');
if(!readFileSync(join(root,'index.html'),'utf8').includes('Development only'))throw Error('Development warning missing');
while(queue.length){
 const name=queue.shift();
 if(files.has(name))continue;
 if(!allowed.test(name)||!all.has(name))throw Error('Missing or invalid browser asset: '+name);
 files.add(name);
 const ext=extname(name);
 if(!['.html','.css','.mjs','.js'].includes(ext))continue;
 const source=readFileSync(join(root,name),'utf8');
 const dependencies=[];
 if(ext==='.html'||ext==='.css'){
  for(const m of source.matchAll(/(?:src|href)=["']\.\/([^"'?#]+)["']/g))dependencies.push(m[1]);
 }
 if(ext==='.mjs'||ext==='.js'){
  for(const m of source.matchAll(/\b(?:import|export)\s*(?:[^'";]*?\s+from\s*)?['"]\.\/([^'"]+)['"]/g))dependencies.push(m[1]);
  for(const m of source.matchAll(/\bimport\(\s*['"]\.\/([^'"]+)['"]\s*\)/g))dependencies.push(m[1]);
  if(/(?:from\s*['"]node:|import\s*['"]node:)/.test(source))throw Error('Node-only module reached from browser: '+name);
 }
 for(const dependency of dependencies){
  if(!allowed.test(dependency)||!all.has(dependency))throw Error(name+' references missing or invalid asset '+dependency);
  queue.push(dependency);
 }
}
for(const name of ['dashboard-console.mjs','v47-firebase-config.mjs'])if(!files.has(name))throw Error('Dashboard dependency not reachable: '+name);
rmSync(dest,{recursive:true,force:true});mkdirSync(dest,{recursive:true});
for(const name of files)copyFileSync(join(root,name),join(dest,name));
writeFileSync(join(dest,'PREVIEW-ONLY.txt'),'V47 development preview. Not approved for production deployment.\n');
console.log('V47 preview built: '+files.size+' reachable browser assets; no deployment.');
