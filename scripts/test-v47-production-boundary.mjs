import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
const base=process.env.V47_BASE_REF || "origin/main";
const output=execFileSync("git",["diff","--name-only",base+"...HEAD"],{encoding:"utf8"});
const changed=output.trim().split("\n").filter(Boolean);
assert.ok(changed.length>0,"No V47 changes found");
const allowed=path=>
 path.startsWith("src/v47/") ||
 path.startsWith("v47/") ||
 path.startsWith(".github/workflows/v47-") ||
 path==="v47-runtime/server.mjs" ||
 path==="v47-runtime/package.json" ||
 path.startsWith("scripts/test-v47-") ||
 path==="scripts/build-v47-spark-staging.mjs" ||
 path==="scripts/audit-v46-tenant-migration.mjs" ||
 path==="scripts/prepare-v47-v46-ui-port.mjs" ||
 path==="firebase.v47.spark.json" ||
 path.startsWith("prototypes/v47/") ||
 path.startsWith("docs/V47-") ||
 path===".github/workflows/v47-development-checks.yml" ||
 path==="firestore.v47.prototype.rules" ||
 path==="firebase.v47.emulator.json";
// package.json is shared; only additive V47 test scripts are allowed.
let packageScriptsSafe=true;
if(changed.includes("package.json")){
 const baseline=JSON.parse(execFileSync("git",["show",base+":package.json"],{encoding:"utf8"}));
 const current=JSON.parse(readFileSync("package.json","utf8"));
 const originalScripts=baseline.scripts||{};
 const currentScripts=current.scripts||{};
 packageScriptsSafe=Object.entries(originalScripts).every(([key,value])=>currentScripts[key]===value)
   && Object.keys(currentScripts).filter(key=>!(key in originalScripts)).every(key=>key.startsWith("test:v47"))
   && Object.entries(baseline).filter(([key])=>key!=="scripts").every(([key,value])=>JSON.stringify(current[key])===JSON.stringify(value))
   && Object.keys(current).every(key=>key==="scripts" || key in baseline);
}
const unexpected=changed.filter(path=>!allowed(path) && !(path==="package.json" && packageScriptsSafe));
if(unexpected.length) {
 console.error("V47 branch modified V46 production files:",unexpected);
 process.exitCode=1;
} else {
 console.log("V47 production preservation verified: "+changed.length+" V47-only files changed; no V46 production paths modified.");
}
