/**
 * Build an isolated static V47 Spark preview. No deployment or live writes.
 * The output intentionally excludes all V46 pages, credentials and root config.
 */
import {mkdir,copyFile,readFile,writeFile,rm} from "node:fs/promises";
import {resolve,dirname,join} from "node:path";
const root=resolve(import.meta.dirname,"..");
const output=join(root,"dist","v47-spark");
const expectedProject="smss-exam-portal-v47";
const expectedDomain=expectedProject+".firebaseapp.com";
const pages=["prototypes/v47/spark-school-registration.html","prototypes/v47/spark-school-workspace.html","prototypes/v47/v46-grade-calculator.html","prototypes/v47/spark-school-students.html","prototypes/v47/spark-school-staff.html","prototypes/v47/spark-school-marks.html","prototypes/v47/spark-school-attendance.html"];
const htmlPages=await Promise.all(pages.map(async page=>({page,html:await readFile(join(root,page),"utf8")})));
const imports=htmlPages.flatMap(({page,html})=>{
 if(!html.includes('<script type="module">'))throw new Error("Missing V47 module entry: "+page);
 const paths=[...html.matchAll(/from\s+["'](\.\.\/\.\.\/src\/v47\/[^"']+\.mjs)["']/g)]
  .map(match=>match[1].replace(/^\.\.\/\.\.\//,""));
 if(!paths.length && !page.endsWith("v46-grade-calculator.html"))throw new Error("No V47 browser modules found: "+page);
 return paths;
});
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
// Reuse the original V46 pure grade calculation module unchanged; no V46 Firebase code.
await mkdir(output,{recursive:true});
await copyFile(join(root,"iemis-ledger.js"),join(output,"iemis-ledger.js"));
await copyFile(join(root,"iemis-entry.js"),join(output,"iemis-entry.js"));
// An optional public Firebase Web config is accepted only for the isolated V47 project.
 // No config means the page stays safely disabled rather than connecting to V46.
 await mkdir(join(output,"prototypes","v47"),{recursive:true});
 const configRaw=process.env.V47_SPARK_WEB_CONFIG;
 if(process.env.V47_SPARK_RELEASE_BUILD==="true" && !configRaw)
  throw new Error("V47 release build requires isolated Firebase Web configuration");
 if(configRaw){
  let config;
  try{config=JSON.parse(configRaw);}catch{throw new Error("Invalid V47_SPARK_WEB_CONFIG JSON");}
  if(!config || typeof config!=="object" || Array.isArray(config) ||
     config.projectId!==expectedProject || config.authDomain!==expectedDomain ||
     typeof config.apiKey!=="string" || !config.apiKey.trim() ||
     typeof config.appId!=="string" || !config.appId.trim() ||
     Object.keys(config).some(key=>!["apiKey","authDomain","projectId","appId","messagingSenderId","storageBucket"].includes(key)) ||
     (config.storageBucket!==undefined && ![expectedProject+".firebasestorage.app",expectedProject+".appspot.com"].includes(config.storageBucket)))
    throw new Error("V47 Web config must match the isolated project and contain apiKey/appId");
  const json=JSON.stringify(config).replaceAll("<","\\u003c");
  await writeFile(join(output,"prototypes","v47","spark-config.js"),
   "window.__SMSS_V47_SPARK_CONFIG__ = "+json+";\n");
 }
 await mkdir(join(output,"prototypes","v47"),{recursive:true});
const loader='<script src="./spark-config.js"></script>';
 // When no config was supplied, keep the prototype disconnected and show its existing error.
 for(const {page,html} of htmlPages){
  const needsFirebase=page!=="prototypes/v47/v46-grade-calculator.html";
  const htmlWithLoader=configRaw&&needsFirebase?html.replace('<script type="module">',loader+'<script type="module">'):html;
  await writeFile(join(output,page),htmlWithLoader);
 }
await writeFile(join(output,"index.html"),`<!doctype html><meta charset="utf-8"><title>SMSS V47 Staging</title><p>V47 Spark staging preview. Firebase configuration must be explicitly provided for the isolated V47 project.</p><a href="/prototypes/v47/spark-school-registration.html">Open registration prototype</a><p><a href="/prototypes/v47/spark-school-workspace.html">Open read-only school workspace</a><p><a href="/prototypes/v47/v46-grade-calculator.html">Open V46 grade calculator</a></p><p><a href="/prototypes/v47/spark-school-students.html">Open school students</a></p><p><a href="/prototypes/v47/spark-school-staff.html">Open school staff</a></p><p><a href="/prototypes/v47/spark-school-marks.html">Open school marks</a></p><p><a href="/prototypes/v47/spark-school-attendance.html">Open school attendance</a></p>`);
console.log("Built isolated V47 Spark preview:",visited.size,"browser modules; no deployment");
