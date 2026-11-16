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
// Route all remaining variable collection names through the same fail-closed gateway.
const dynamicSource=/\b(collection|doc)\s*\(\s*db\s*,\s*([a-zA-Z_$][\w$]*)/g;
const dynamicNames=new Set();
let dynamicReferences=0;
port=port.replace(dynamicSource,(full,fn,name)=>{
 if(name==="tenantCollection")return full;
 if(name!=="name")throw new Error("Unreviewed dynamic V46 collection variable: "+name);
 dynamicNames.add(name);
 dynamicReferences++;
 return fn+"(db,tenantCollection("+name+")";
});
const unresolved=[...port.matchAll(dynamicSource)].filter(m=>m[2]!=="tenantCollection");
assert.equal(unresolved.length,0,"Unscoped V46 Firestore access remains");
assert.equal(dynamicReferences,3,"V46 dynamic Firestore references changed: review required");
assert.equal((port.match(/tenantCollection\(/g)||[]).length,changed+dynamicReferences,"Every V46 Firestore reference must use tenant gateway");
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
 dynamicVariablesScoped:[...dynamicNames],
 dynamicReferencesRewritten:dynamicReferences,
 unresolvedDynamicReferences:unresolved,
 blocker:"School-scoped membership verification and complete V46 module dependencies not yet integrated"
},null,2));
console.log("Quarantined V46 UI port prepared:",changed,"literal references; dynamic variables:",[...dynamicNames].join(","));
