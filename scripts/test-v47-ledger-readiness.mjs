import assert from "node:assert/strict";
import {auditV47LedgerReadiness} from "../src/v47/v46-ledger-readiness.mjs";
const data={students:[{id:"s1"}],subjects:[{id:"sub1",name:"Mathematics"}],exams:[{id:"e1"}],marks:[{id:"m1",studentId:"s1",examId:"e1",subject:"Mathematics",scores:[{name:"IN",obtained:30,fullMarks:50}]}]};
const clean=auditV47LedgerReadiness(data);
assert.equal(clean.counts.marks,1);
assert.equal(clean.readyForOfficialLedger,false);
assert.equal(clean.blockers.length,1);
assert.ok(Object.isFrozen(clean.blockers));
const bad=auditV47LedgerReadiness({...data,marks:[{id:"m2",studentId:"other",examId:"unknown",subject:"Unknown",score:80}]});
assert.ok(bad.blockers.some(s=>s.includes("unknown school students")));
assert.ok(bad.blockers.some(s=>s.includes("unknown school exams")));
assert.ok(bad.blockers.some(s=>s.includes("unknown school subjects")));
assert.ok(bad.blockers.some(s=>s.includes("assessment components")));
assert.throws(()=>auditV47LedgerReadiness({marks:[]}),/Complete verified/);
const inconsistent=auditV47LedgerReadiness({
 students:[{id:"s1",classNo:6,schoolId:"school001"}],
 subjects:[{id:"sub1",name:"Mathematics",schoolId:"otherSchool"}],
 exams:[{id:"e1",classNo:9,schoolId:"school001"}],
 marks:[{id:"m3",studentId:"s1",examId:"e1",subject:"Mathematics",classNo:6,schoolId:"otherSchool",scores:[{name:"IN",obtained:40,fullMarks:50}]}]
},{schoolId:"school001"});
assert.ok(inconsistent.blockers.some(s=>s.includes("different school ID")));
assert.ok(inconsistent.blockers.some(s=>s.includes("inconsistent student")));
const duplicates=auditV47LedgerReadiness({...data,students:[{id:"s1"},{id:"s1"}]});
assert.ok(duplicates.blockers.some(s=>s.includes("duplicate document identities")));
assert.throws(()=>auditV47LedgerReadiness({...data,marks:[{studentId:"s1"}]}),/Invalid marks source document identities/);
console.log("V47 ledger readiness audit checks passed");
