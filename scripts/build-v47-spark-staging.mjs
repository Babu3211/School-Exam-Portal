/**
 * Build an isolated static V47 Spark preview. No deployment or live writes.
 * The output intentionally excludes all V46 pages, credentials and root config.
 */
import {mkdir,copyFile,readFile,writeFile,rm} from "node:fs/promises";
import {resolve,dirname,join} from "node:path";
const root=resolve(import.meta.dirname,"..");
const output=join(root,"dist","v47-spark");
const page="prototypes/v47/spark-school-registration.html";
const html=await readFile(join(root,page),"utf8");
const imports=[...html.matchAll(/from\s+["'](\.\.\/\.\.\/src\/v47\/[^"']+\.mjs)["']/g)]
 .map(match=>match[1].replace(/^\.\.\/\.\.\//,""));
if(imports.length===0)throw new Error("No V47 browser modules found");
const visited=new Set();
async function include(path){
 if(visited.has(path))return;
 if(!/^src\/v47\/[a-z0-9-]+\.mjs$/.test(path))throw new Error("Unsafe staging import: "+path);
 visited.add(path);
 const contents=await readFile(join(root,path),"utf8");
 for(const match of contents.matchAll(/from\s+["'](\.[^"']+\.mjs)["']/g)){
  const target=resolve(dirname(join(root,path)),match[1]);
  const rel=target.slice(root.length+1).replaceAll("\\","/");
  await include(rel);
 }
 await mkdir(dirname(join(output,path)),{recursive:true});
 await copyFile(join(root,path),join(output,path));
}
await rm(output,{recursive:true,force:true});
for(const path of imports)await include(path);
await mkdir(join(output,"prototypes","v47"),{recursive:true});
await copyFile(join(root,page),join(output,page));
await writeFile(join(output,"index.html"),`<!doctype html><meta charset="utf-8"><title>SMSS V47 Staging</title><p>V47 Spark staging preview. Firebase configuration must be explicitly provided for the isolated V47 project.</p><a href="/prototypes/v47/spark-school-registration.html">Open registration prototype</a>`);
console.log("Built isolated V47 Spark preview:",visited.size,"browser modules; no deployment");
