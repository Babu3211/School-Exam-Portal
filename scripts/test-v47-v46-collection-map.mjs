import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {V46_COLLECTION_POLICY,v47CollectionPlan} from "../src/v47/v46-collection-map.mjs";
const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const found=[...new Set([...html.matchAll(/\b(?:collection|doc)\s*\(\s*db\s*,\s*["'`]([^"'`]+)["'`]/g)].map(m=>m[1]))].sort();
assert.deepEqual(Object.keys(V46_COLLECTION_POLICY).sort(),found,"Every actual V46 collection must have an explicit V47 policy");
for(const name of found){
 const a=v47CollectionPlan("school_A001",name);
 const b=v47CollectionPlan("school_B001",name);
 assert.notEqual(a.targetPath,b.targetPath);
 assert.equal(a.targetPath,`schools/school_A001/${name}`);
 assert.equal(a.browserWriteAllowed,false,"Never infer write permission from collection category: "+name);
}
assert.throws(()=>v47CollectionPlan("school_A001","unreviewed"));
assert.throws(()=>v47CollectionPlan("../invalid","marks"));
console.log("V47 17-collection migration mapping checks passed");
