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
const duplicateMarks=auditV47LedgerReadiness({...data,marks:[data.marks[0],{...data.marks[0],id:"m2"}]});
assert.ok(duplicateMarks.blockers.some(s=>s.includes("duplicate an exam, student and subject")));
const repeatedSubjects=auditV47LedgerReadiness({...data,subjects:[{id:"sub1",name:"Mathematics",classNo:6},{id:"sub2",subjectName:" mathematics ",classNo:6}]});
assert.ok(repeatedSubjects.blockers.some(s=>s.includes("subjects share a name")));
const separateClasses=auditV47LedgerReadiness({...data,subjects:[{id:"sub1",name:"Mathematics",classNo:6},{id:"sub2",name:"Mathematics",classNo:7}]});
assert.ok(!separateClasses.blockers.some(s=>s.includes("subjects share a name")));
const mixedSubjectReferences=auditV47LedgerReadiness({...data,marks:[data.marks[0],{...data.marks[0],id:"m2",subjectId:"sub1",subject:undefined}]});
assert.ok(mixedSubjectReferences.blockers.some(s=>s.includes("duplicate an exam, student and subject")));
const scopedSubjects={...data,students:[{id:"s1",classNo:6}],exams:[{id:"e1",classNo:6}],subjects:[{id:"math6",name:"Mathematics",classNo:6},{id:"math7",name:"Mathematics",classNo:7}],marks:[{...data.marks[0],classNo:6},{...data.marks[0],id:"m2",subject:undefined,subjectId:"math6",classNo:6}]};
assert.ok(auditV47LedgerReadiness(scopedSubjects).blockers.some(s=>s.includes("duplicate an exam, student and subject")));
const otherClass={...scopedSubjects,marks:[scopedSubjects.marks[0],{...scopedSubjects.marks[1],subjectId:"math7"}]};
assert.ok(!auditV47LedgerReadiness(otherClass).blockers.some(s=>s.includes("duplicate an exam, student and subject")));
assert.ok(auditV47LedgerReadiness(otherClass).blockers.some(s=>s.includes("subjects from another class")));
const normalizedSubject=auditV47LedgerReadiness({...data,marks:[{...data.marks[0],subject:" mathematics "}]});
assert.ok(!normalizedSubject.blockers.some(s=>s.includes("unknown school subjects")));
const examClassFallback={...scopedSubjects,students:[{id:"s1"}],marks:[{...scopedSubjects.marks[0],classNo:undefined},{...scopedSubjects.marks[1],classNo:undefined}]};
assert.ok(auditV47LedgerReadiness(examClassFallback).blockers.some(s=>s.includes("duplicate an exam, student and subject")));
const examClassMismatch={...examClassFallback,marks:[{...examClassFallback.marks[0],subjectId:"math7",subject:undefined}]};
assert.ok(auditV47LedgerReadiness(examClassMismatch).blockers.some(s=>s.includes("subjects from another class")));
const contradictory=auditV47LedgerReadiness({...data,marks:[{...data.marks[0],subjectId:"sub1",subject:"Science"}]});
assert.ok(contradictory.blockers.some(s=>s.includes("conflicting subject ID and subject name")));
const matchingAliases=auditV47LedgerReadiness({...data,marks:[{...data.marks[0],subjectId:"sub1",subject:" mathematics "}]});
assert.ok(!matchingAliases.blockers.some(s=>s.includes("conflicting subject ID and subject name")));
const nameOnlyOtherClass=auditV47LedgerReadiness({...data,students:[{id:"s1",classNo:6}],exams:[{id:"e1",classNo:6}],subjects:[{id:"sub7",name:"Science",classNo:7}],marks:[{...data.marks[0],subject:"Science",classNo:6}]});
assert.ok(nameOnlyOtherClass.blockers.some(s=>s.includes("subject names assigned only to another class")));
const nameOnlyCorrectClass=auditV47LedgerReadiness({...data,students:[{id:"s1",classNo:6}],exams:[{id:"e1",classNo:6}],subjects:[{id:"sub6",name:"Science",classNo:6},{id:"sub7",name:"Science",classNo:7}],marks:[{...data.marks[0],subject:"Science",classNo:6}]});
assert.ok(!nameOnlyCorrectClass.blockers.some(s=>s.includes("subject names assigned only to another class")));
const unknownIdMatchingName=auditV47LedgerReadiness({...data,marks:[{...data.marks[0],subjectId:"Mathematics",subject:"Mathematics"}]});
assert.ok(unknownIdMatchingName.blockers.some(s=>s.includes("unknown school subjects")));
const validIdMatchingName=auditV47LedgerReadiness({...data,marks:[{...data.marks[0],subjectId:"sub1",subject:"Mathematics"}]});
assert.ok(!validIdMatchingName.blockers.some(s=>s.includes("unknown school subjects")));
const ambiguousName=auditV47LedgerReadiness({...data,students:[{id:"s1",classNo:6}],exams:[{id:"e1",classNo:6}],subjects:[{id:"a",name:"Science",classNo:6},{id:"b",subjectName:" science ",classNo:6}],marks:[{...data.marks[0],subject:"Science",classNo:6}]});
assert.ok(ambiguousName.blockers.some(s=>s.includes("ambiguous subject names")));
const unambiguousName=auditV47LedgerReadiness({...data,students:[{id:"s1",classNo:6}],exams:[{id:"e1",classNo:6}],subjects:[{id:"a",name:"Science",classNo:6}],marks:[{...data.marks[0],subject:"Science",classNo:6}]});
assert.ok(!unambiguousName.blockers.some(s=>s.includes("ambiguous subject names")));
const invalidAssessment=auditV47LedgerReadiness({...data,marks:[{...data.marks[0],scores:[{name:"IN",obtained:60,fullMarks:50}]}]});
assert.ok(invalidAssessment.blockers.some(s=>s.includes("invalid assessment scores")));
const negativeAssessment=auditV47LedgerReadiness({...data,marks:[{...data.marks[0],scores:[{name:"IN",obtained:-1,fullMarks:50}]}]});
assert.ok(negativeAssessment.blockers.some(s=>s.includes("invalid assessment scores")));
const validAssessment=auditV47LedgerReadiness(data);
assert.ok(!validAssessment.blockers.some(s=>s.includes("invalid assessment scores")));
for(const score of [{name:"IN",obtained:" ",fullMarks:50},{name:"IN",obtained:20,fullMarks:""},{name:"IN",obtained:"abc",fullMarks:50}]){
 const result=auditV47LedgerReadiness({...data,marks:[{...data.marks[0],scores:[score]}]});
 assert.ok(result.blockers.some(s=>s.includes("invalid assessment scores")));
}
const numericStrings=auditV47LedgerReadiness({...data,marks:[{...data.marks[0],scores:[{name:"IN",obtained:"30",fullMarks:"50"}]}]});
assert.ok(!numericStrings.blockers.some(s=>s.includes("invalid assessment scores")));
const unnamedComponent=auditV47LedgerReadiness({...data,marks:[{...data.marks[0],scores:[{name:" ",obtained:20,fullMarks:50}]}]});
assert.ok(unnamedComponent.blockers.some(s=>s.includes("unnamed assessment components")));
const duplicateComponents=auditV47LedgerReadiness({...data,marks:[{...data.marks[0],scores:[{name:"IN",obtained:20,fullMarks:50},{name:" in ",obtained:10,fullMarks:50}]}]});
assert.ok(duplicateComponents.blockers.some(s=>s.includes("duplicate assessment component names")));
assert.ok(!clean.blockers.some(s=>s.includes("duplicate assessment component names")||s.includes("unnamed assessment components")));
console.log("V47 ledger readiness audit checks passed");
