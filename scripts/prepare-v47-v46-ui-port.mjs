/**
 * Prepare a V46 UI tenant port in a quarantined directory.
 * The generated artifact deliberately has no working Firebase initialization.
 * It cannot be deployed as V47 until all dependencies are migrated and verified.
 */
import {readFile,mkdir,writeFile} from "node:fs/promises";
import {resolve,join} from "node:path";
import assert from "node:assert/strict";
import {V46_COLLECTION_POLICY} from "../src/v47/v46-collection-map.mjs";
const root=resolve(import.meta.dirname,"..");
const source=await readFile(join(root,"index.html"),"utf8");
const output=join(root,"dist","v47-v46-port-audit");
const literal=/\b(collection|doc)\s*\(\s*db\s*,\s*(["'`])([^"'`]+)\2/g;
let changed=0;
let port=source.replace(literal,(full,fn,quote,name)=>{
 assert.ok(Object.hasOwn(V46_COLLECTION_POLICY,name),"Unmapped V46 collection "+name);
 changed++;
 return fn+"(db,tenantCollection("+JSON.stringify(name)+")";
});
const dynamic=[...port.matchAll(/\b(collection|doc)\s*\(\s*db\s*,\s*([a-zA-Z_$][\w$]*)/g)].map(m=>m[0]);
assert.ok(dynamic.length<=3,"Unexpected dynamic V46 collection references");\nassert.equal((port.match(/tenantCollection\\(/g)||[]).length,changed+1,"Every literal reference must use tenant gateway");
const legacyConfig=/const firebaseConfig=\{[^;]+\};const ADMIN_UID="[^"]+";const app=initializeApp\(firebaseConfig\),auth=getAuth\(app\),db=getFirestore\(app\);/;
assert.match(port,legacyConfig,"V46 Firebase bootstrap must be reviewed before migration");
const blocker=`
// QUARANTINED V46 PORT: no Firebase connection, no cross-school reads or writes.
const tenantCollection=name=>{
 if(!Object.hasOwn(V46_COLLECTION_POLICY,name))throw Error("Unmapped collection");
 throw Error("V47 school membership not yet bound: database access blocked");
};
const V46_COLLECTION_POLICY=${JSON.stringify(V46_COLLECTION_POLICY)};
const firebaseConfig=null;
const ADMIN_UID=null;
const app=null,auth=null,db=null;
throw Error("V47 V46 port is quarantined: never deploy this file");
`;
port=port.replace(legacyConfig,blocker);
assert.ok(!port.includes('projectId:"exam-portal-smss-95016"'),"Legacy Firebase project must not survive");
assert.ok(!port.includes('const ADMIN_UID="'),"Legacy superadmin must not survive");
assert.ok(changed>=140,"V46 references unexpectedly missing");
await mkdir(output,{recursive:true});
await writeFile(join(output,"index.html"),port);
await writeFile(join(output,"audit.json"),JSON.stringify({
 state:"QUARANTINED_NOT_DEPLOYABLE",source:"V46 index.html",
 literalReferencesRewritten:changed,
 dynamicReferencesRequiringReview:dynamic,
 blocker:"School-scoped membership verification and complete V46 module dependencies not yet integrated"
},null,2));
console.log("Quarantined V46 UI port prepared:",changed,"references; dynamic:",dynamic.length);
