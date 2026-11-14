import assert from "node:assert/strict";
import {normalizeV47AttendanceDate} from "../src/v47/attendance-date-adapter.mjs";
assert.equal(normalizeV47AttendanceDate({value:"2026-11-14"}),"2026-11-14");
assert.equal(normalizeV47AttendanceDate({value:"2083-01-01",calendar:"BS",bsToAd:value=>{assert.equal(value,"2083-01-01");return "2026-04-14";}}),"2026-04-14");
assert.throws(()=>normalizeV47AttendanceDate({value:"2083-01-01",calendar:"BS"}),/converter required/);
assert.throws(()=>normalizeV47AttendanceDate({value:"2026-02-30"}),/Invalid AD date/);
assert.throws(()=>normalizeV47AttendanceDate({value:"2083-01-01",calendar:"BS",bsToAd:()=>""}),/conversion failed/);
assert.throws(()=>normalizeV47AttendanceDate({value:"2083-01-01",calendar:"BS",bsToAd:()=>"2026-02-30"}),/Invalid AD date/);
console.log("V47 BS to AD attendance boundary tests passed");
