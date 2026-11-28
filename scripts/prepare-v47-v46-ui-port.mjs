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
// Exactly one reviewed V46 annual CDC portfolio read chooses between two
// known collections. Rewrite the entire conditional, not just the variable.
const cdcConditional="collection(db,key==='serophero'?'cdc_serofero_indicators':'cdc_observations')";
assert.equal(port.split(cdcConditional).length-1,1,"CDC annual portfolio conditional changed: review required");
for(const c of ["cdc_serofero_indicators","cdc_observations"])assert.ok(Object.hasOwn(V46_COLLECTION_POLICY,c));
port=port.replace(cdcConditional,"collection(db,tenantCollection(key==='serophero'?'cdc_serofero_indicators':'cdc_observations'))");
const reviewedCdcConditionalReferences=1;
// Route all remaining variable collection names through the same fail-closed gateway.
const dynamicSource=/\b(collection|doc)\s*\(\s*db\s*,\s*([a-zA-Z_$][\w$]*)/g;
const dynamicNames=new Set();
const counts={name:0,collectionName:0};
assert.equal(source.split("const collectionName=binary?'cdc_serofero_indicators':'cdc_observations';").length-1,1,'Reviewed matrix selector changed');
assert.equal(source.split("['cdc_observations','cdc_serofero_indicators'].map(name=>getDocsFromServer(query(collection(db,name)").length-1,1,'Reviewed class deletion selector changed');
let dynamicReferences=0;
port=port.replace(dynamicSource,(full,fn,name)=>{
 if(name==="tenantCollection")return full;
 if(!Object.hasOwn(counts,name))throw new Error("Unreviewed dynamic V46 collection variable: "+name);
 counts[name]++;
 dynamicNames.add(name);
 dynamicReferences++;
 return fn+"(db,tenantCollection("+name+")";
});
const unresolved=[...port.matchAll(dynamicSource)].filter(m=>m[2]!=="tenantCollection");
assert.equal(unresolved.length,0,"Unscoped V46 Firestore access remains");
assert.deepEqual(counts,{name:4,collectionName:3},"V46 dynamic Firestore references changed: review required");
assert.equal(dynamicReferences,7);
// Legacy backup/restore traverses arbitrary collection names. It must remain
// disabled until a tenant-aware export/import design is independently reviewed.
const legacyBackupRestoreCalls=[...source.matchAll(/\b(collection|doc)\s*\(\s*db\s*,\s*name\b/g)].length;
assert.equal(legacyBackupRestoreCalls,4,"Reviewed name references changed; review required");
assert.equal([...source.matchAll(/\b(?:collection|doc)\s*\(\s*db\s*,\s*collectionName\b/g)].length,3,"Reviewed matrix references changed");

assert.equal((port.match(/tenantCollection\(/g)||[]).length,changed+dynamicReferences+reviewedCdcConditionalReferences,"Every V46 Firestore reference must use tenant gateway");
const legacyConfig=/const firebaseConfig=\{[^;]+\};\s*const ADMIN_UID="[^"]+";\s*const app=initializeApp\(firebaseConfig\),auth=getAuth\(app\),db=getFirestore\(app\);/;
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
// Keep the complete V46 screen markup as a separate visual-review artifact.
// All executable scripts, inline event handlers, and external script loaders are
// removed. This is NOT an operational app and is never copied to staging hosting.
let visual=source
 .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,"")
 .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,"")
 .replace(/\s+href\s*=\s*(["'])\s*javascript:[\s\S]*?\1/gi,"")
 .replace(/\s+src\s*=\s*(["'])\s*javascript:[\s\S]*?\1/gi,"");
visual=visual.replace(/<body([^>]*)>/i,'<body$1><aside style="position:sticky;top:0;z-index:2147483647;background:#7f1d1d;color:white;padding:12px;font:600 14px system-ui">V47 VISUAL REVIEW ONLY — V46 screens preserved without scripts; no sign-in or database access.</aside>');
assert.ok(!/<script\b/i.test(visual),"Visual-only V46 preview must have no scripts");
assert.ok(!/\son[a-z]+\s*=/i.test(visual),"Visual-only V46 preview must have no inline event handlers");
assert.ok(!/javascript:/i.test(visual),"Visual-only V46 preview must have no JavaScript links");
assert.ok(!visual.includes('exam-portal-smss-95016'),"Visual-only V46 preview must not include production Firebase identity");
await mkdir(output,{recursive:true});
await writeFile(join(output,"v46-visual-only.html"),visual);
// Inventory every V46 screen and its DOM identity for a parity checklist.
// Derived from the actual V46 page, never from a manually reconstructed menu.
const screenIds=[...new Set([...source.matchAll(/<(?:section|main|article|div)\b[^>]*\bid\s*=\s*["']([^"']+)["']/gi)].map(m=>m[1]))];
const navigationTargets=[...new Set([...source.matchAll(/(?:data-page|data-target)\s*=\s*["']([^"']+)["']/gi)].map(m=>m[1]))];
const domHandlers=[...new Set([...source.matchAll(/\b(?:onclick|onchange|onsubmit)\s*=\s*["']([^"']+)["']/gi)].map(m=>m[1]))];
await writeFile(join(output,"v46-screen-parity.json"),JSON.stringify({
 source:"V46 index.html",
 status:"INVENTORY_ONLY_NOT_IMPLEMENTED",
 screenIds,navigationTargets,inlineHandlerCount:domHandlers.length,
 originalHtmlBytes:Buffer.byteLength(source),
 visualHtmlBytes:Buffer.byteLength(visual),
 note:"Full V46 behavior and Firebase dependencies are not yet tenant-migrated"
},null,2));

await writeFile(join(output,"index.html"),port);
// Inventory non-collection Firebase entry points before attempting a live V46 port.
// These calls can bypass a naive collection()/doc() rewrite when they use refs
// built elsewhere, so this is a review inventory, not an authorization claim.
const firebaseOperations=[
 "getDoc","getDocs","setDoc","addDoc","updateDoc","deleteDoc",
 "onSnapshot","runTransaction","writeBatch","getCountFromServer",
 "collectionGroup","getStorage","ref","uploadBytes","deleteObject",
 "getDownloadURL","signInWithEmailAndPassword","onAuthStateChanged"
];
const operationInventory=Object.fromEntries(firebaseOperations.map(name=>[
 name,[...source.matchAll(new RegExp(String.raw`\b${name}\s*\(`,"g"))].length
]).filter(([,count])=>count>0));
const riskCategories={
 writes:["setDoc","addDoc","updateDoc","deleteDoc","runTransaction","writeBatch"],
 realtime:["onSnapshot","collectionGroup"],
 storage:["getStorage","uploadBytes","deleteObject","getDownloadURL"],
 authentication:["signInWithEmailAndPassword","onAuthStateChanged"]
};
const reviewRequired=Object.fromEntries(Object.entries(riskCategories).map(([category,names])=>[
 category,names.filter(name=>operationInventory[name]>0)
]));
await writeFile(join(output,"audit.json"),JSON.stringify({
 state:"QUARANTINED_NOT_DEPLOYABLE",source:"V46 index.html",
 literalReferencesRewritten:changed,
 dynamicVariablesScoped:[...dynamicNames],
 dynamicReferencesRewritten:dynamicReferences,
 reviewedCdcConditionalReferences,
 legacyBackupRestoreRequiresReview:true,
 firebaseOperationInventory:operationInventory,
 additionalReviewRequired:reviewRequired,
 deploymentApproved:false,
 unresolvedDynamicReferences:unresolved,
 blocker:"School-scoped membership verification and complete V46 module dependencies not yet integrated"
},null,2));
console.log("Quarantined V46 UI port prepared:",changed,"literal references; dynamic variables:",[...dynamicNames].join(","));
