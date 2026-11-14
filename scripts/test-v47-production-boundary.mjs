import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
const base=process.env.V47_BASE_REF || "origin/main";
const output=execFileSync("git",["diff","--name-only",base+"...HEAD"],{encoding:"utf8"});
const changed=output.trim().split("\n").filter(Boolean);
assert.ok(changed.length>0,"No V47 changes found");
const allowed=path=>
 path.startsWith("src/v47/") ||
 path==="v47-runtime/server.mjs" ||
 path==="v47-runtime/package.json" ||
 path.startsWith("scripts/test-v47-") ||
 path.startsWith("prototypes/v47/") ||
 path.startsWith("docs/V47-") ||
 path===".github/workflows/v47-development-checks.yml" ||
 path==="firestore.v47.prototype.rules" ||
 path==="firebase.v47.emulator.json";
const unexpected=changed.filter(path=>!allowed(path));
if(unexpected.length) {
 console.error("V47 branch modified V46 production files:",unexpected);
 process.exitCode=1;
} else {
 console.log("V47 production preservation verified: "+changed.length+" V47-only files changed; no V46 production paths modified.");
}
