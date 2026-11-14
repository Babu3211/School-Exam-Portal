import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {V46_COLLECTION_POLICY} from "../src/v47/v46-collection-map.mjs";
const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const actual=[...new Set([...html.matchAll(/\b(?:collection|doc)\s*\(\s*db\s*,\s*["\'`]([^"\'`]+)["\'`]/g)].map(match=>match[1]))].sort();
const mapped=Object.keys(V46_COLLECTION_POLICY).sort();
assert.deepEqual(mapped,actual,"Every V46 Firestore collection must have an explicit V47 school isolation policy; review new collections before any rollout");
assert.ok([...html.matchAll(/\b(?:collection|doc)\s*\(\s*db\s*,\s*["\'`]([^"\'`]+)["\'`]/g)].length>=140,"Unexpected V46 source shrinkage");
console.log("V47 maps all "+actual.length+" V46 collections and retains source collection references");
