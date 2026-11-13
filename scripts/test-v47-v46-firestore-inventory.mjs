/**
 * Inspect the existing V46 page without modifying it.
 * Any new root Firestore collection requires a deliberate V47 migration decision.
 */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const matches=[...html.matchAll(/\b(?:collection|doc)\s*\(\s*db\s*,\s*["'`]([^"'`]+)["'`]/g)];
const found=[...new Set(matches.map(m=>m[1]))].sort();
const known=[
 "audit_logs","attendance","certificates","classes","exams","mark_settings",
 "marks","public_result_exams","public_result_lookup","public_results",
 "school_gallery","school_public_branding","school_settings","staff",
 "students","subjects","user_roles"
].sort();
assert.deepEqual(found,known,"V46 root collection inventory changed; review tenant mapping before integration");
console.log("V46 Firestore root inventory:",found.join(", "));
console.log("V46 direct root Firestore references:",matches.length);
