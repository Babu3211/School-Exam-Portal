/**
 * Audit the actual V46 production UI before tenant migration.
 * Read-only static scan; never imports, executes or deploys the V46 app.
 */
import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
import {V46_COLLECTION_POLICY} from "../src/v47/v46-collection-map.mjs";
const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const regex=/\b(collection|doc)\s*\(\s*db\s*,\s*(?:(["'`])([^"'`]+)\2|([^,)]+))/g;
const counts=new Map(),dynamic=[];
for(const m of html.matchAll(regex)){
 if(m[3]){const key=m[3];counts.set(key,(counts.get(key)||0)+1);}
 else dynamic.push(m[0].slice(0,140));
}
const unknown=[...counts.keys()].filter(name=>!Object.hasOwn(V46_COLLECTION_POLICY,name));
const configPresent=/projectId\s*:\s*["']exam-portal-smss-95016["']/.test(html);
const adminUidPresent=/\bADMIN_UID\s*=/.test(html);
const summary={
 source:"index.html",legacyFirebaseConfig:configPresent,legacyAdminUid:adminUidPresent,
 literalCollectionReferences:Object.fromEntries([...counts].sort(([a],[b])=>a.localeCompare(b))),
 dynamicDbReferences:dynamic,unmappedCollections:unknown,
 tenantMigrationSafe:!configPresent&&!adminUidPresent&&!dynamic.length&&!unknown.length
};
console.log(JSON.stringify(summary,null,2));
assert.ok(configPresent,"V46 Firebase project signature changed: re-review migration boundary");
assert.ok(adminUidPresent,"V46 global admin binding changed: re-review tenant auth");
assert.equal(unknown.length,0,"Unreviewed V46 collection paths");
assert.ok(counts.size>=16,"V46 collection coverage unexpectedly shrank");
const expectedDynamic=["collection(db,key==='serophero'?'cdc_serofero_indicators':'cdc_observations'","collection(db,name","collection(db,name","collection(db,name","doc(db,name","collection(db,collectionName","collection(db,collectionName","collection(db,collectionName"];
assert.deepEqual([...dynamic].sort(),expectedDynamic.sort(),"New dynamic Firestore references need manual audit");
console.log("V46 migration inventory captured. Not approved for V47 deployment.");
