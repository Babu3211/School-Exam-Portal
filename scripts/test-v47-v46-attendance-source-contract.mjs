import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const checks=[
 ["attendance is stored as class/date batches",/addDoc\(collection\(db,"attendance"\),\{\.\.\.payload,createdAt:/],
 ["attendance type is persisted",/attendanceType:key\.type/],
 ["attendance date is AD from BS selection",/date=attendanceBsToAd\(bsDate\)/],
 ["attendance className is persisted",/className:key\.className/],
 ["attendance subject is persisted",/subject:key\.subject\|\|null/],
 ["attendance students array is persisted",/subject:key\.subject\|\|null,students,totalStudents:/],
 ["attendance daily query matches field",/where\("attendanceType","==","daily"\)/],
 ["attendance subject mode is supported",/value="subject">/],
 ["attendance history uses stored AD dates",/attendanceAdToBs\(x\.date\)/]
];
for(const [name,pattern] of checks)assert.match(source,pattern,name);
console.log("V47 V46 source attendance schema and AD date compatibility checks passed");
