import assert from "node:assert/strict";
import {prepareV47SchoolLedger} from "../src/v47/v46-ledger-read-workflow.mjs";
const source={students:[{id:"student001",name:"Student One",classNo:6,schoolId:"school001"}],subjects:[{id:"math001",name:"Mathematics",classNo:6,schoolId:"school001"}],exams:[{id:"exam001",schoolId:"school001"}],marks:[{id:"mark001",schoolId:"school001",studentId:"student001",examId:"exam001",classNo:6,subject:"Mathematics",scores:[{name:"IN",fullMarks:50,obtained:40}]}]};
const session={async listPage(name,{cursor}){if(cursor)throw Error("unexpected cursor");return {records:source[name],nextCursor:null};}};
const args={session,schoolId:"school001",term:"first",classNo:6,examId:"exam001",schoolName:"Test School",schoolCode:"001",selectStudents:(records,n)=>records.filter(r=>r.classNo===n),selectSubjects:(records,n)=>records.filter(r=>r.classNo===n).map(r=>r.name),selectMarks:(records,n,id)=>records.filter(r=>r.classNo===n&&r.examId===id),creditFor:()=>4,componentsFor:()=>[],applicable:()=>true};
const ledger=await prepareV47SchoolLedger(args);
assert.match(ledger.head,/Mathematics/);
assert.match(ledger.body,/Student One/);
assert.match(ledger.body,/40/);
// Fail closed if verified tenant reads contain records without explicit school identity.
await assert.rejects(()=>prepareV47SchoolLedger({...args,selectStudents:records=>records.map(r=>({...r,schoolId:undefined}))}),/not from the verified school/);
await assert.rejects(()=>prepareV47SchoolLedger({...args,examId:"not-real"}),/does not exist/);
await assert.rejects(()=>prepareV47SchoolLedger({...args,selectMarks:()=>[]}),/No compatible marks/);
await assert.rejects(()=>prepareV47SchoolLedger({...args,selectSubjects:()=>["English"]}),/not from verified school subjects/);
await assert.rejects(()=>prepareV47SchoolLedger({...args,selectStudents:null}),/selectors required/);
await assert.rejects(()=>prepareV47SchoolLedger({...args,selectStudents:()=>[{...source.students[0]}]}),/not from the verified school/);
await assert.rejects(()=>prepareV47SchoolLedger({...args,selectMarks:()=>[{...source.marks[0]}]}),/not from the verified school/);
await assert.rejects(()=>prepareV47SchoolLedger({...args,selectMarks:records=>records.map(m=>({...m,examId:"exam001"}))}),/not from the verified school/);
await assert.rejects(()=>prepareV47SchoolLedger({...args,selectSubjects:()=>["Science"]}),/not from verified school subjects/);
source.exams[0]={id:"exam001",classNo:9,term:"first",schoolId:"school001"};
await assert.rejects(()=>prepareV47SchoolLedger(args),/exam class mismatch/);
source.exams[0]={id:"exam001",classNo:6,term:"final",schoolId:"school001"};
await assert.rejects(()=>prepareV47SchoolLedger(args),/exam term mismatch/);
source.exams[0]={id:"exam001",classNo:6,term:"first",schoolId:"school001"};
assert.match((await prepareV47SchoolLedger(args)).body,/Student One/);
source.students[0]={...source.students[0],schoolId:"otherSchool"};
await assert.rejects(()=>prepareV47SchoolLedger(args),/student school mismatch/);
source.students[0]={id:"student001",name:"Student One",classNo:6,schoolId:"school001"};
source.marks[0]={...source.marks[0],schoolId:"otherSchool"};
await assert.rejects(()=>prepareV47SchoolLedger(args),/mark school mismatch/);
source.marks[0]={id:"mark001",schoolId:"school001",studentId:"student001",examId:"exam001",classNo:6,subject:"Mathematics",scores:[{name:"IN",fullMarks:50,obtained:40}]};
source.exams[0]={id:"exam001",classNo:6,term:"first",schoolId:"otherSchool"};
await assert.rejects(()=>prepareV47SchoolLedger(args),/exam school mismatch/);
source.exams[0]={id:"exam001",classNo:6,term:"first",schoolId:"school001"};
source.subjects[0]={id:"math001",name:"Mathematics",classNo:9,schoolId:"school001"};
await assert.rejects(()=>prepareV47SchoolLedger(args),/not from verified school subjects|Complete student and subject lists required/);
source.subjects[0]={id:"math001",name:"Mathematics",classNo:6,schoolId:"otherSchool"};
await assert.rejects(()=>prepareV47SchoolLedger(args),/not from verified school subjects|Complete student and subject lists required/);
source.subjects[0]={id:"math001",name:"Mathematics",classNo:6,schoolId:"school001"};
source.subjects.push({id:"math002",name:"Mathematics",classNo:6,schoolId:"school001"});
await assert.rejects(()=>prepareV47SchoolLedger(args),/Ambiguous selected ledger subject mapping|Duplicate or invalid selected ledger subjects/);
source.subjects.pop();
await assert.rejects(()=>prepareV47SchoolLedger({...args,selectSubjects:()=>["Mathematics","Mathematics"]}),/Duplicate or invalid selected ledger subjects/);
source.subjects[0]={id:"math001",name:"Mathematics",classNo:6,schoolId:"school001"};
await assert.rejects(()=>prepareV47SchoolLedger({...args,selectStudents:()=>[]}),/Incomplete or duplicate ledger students selection/);
await assert.rejects(()=>prepareV47SchoolLedger({...args,selectMarks:records=>[records[0],records[0]]}),/Incomplete or duplicate ledger marks selection/);
source.marks.push({id:"mark002",studentId:"student001",examId:"exam001",classNo:6,subject:"English",scores:[{name:"IN",fullMarks:50,obtained:35}]});
await assert.rejects(()=>prepareV47SchoolLedger({...args,selectMarks:records=>records.slice(0,1)}),/Incomplete or duplicate ledger marks selection/);
source.marks.pop();
// No unscoped exam or subject may enter the verified ledger read path.
source.exams[0]={...source.exams[0],schoolId:undefined};
await assert.rejects(()=>prepareV47SchoolLedger(args),/exam school mismatch/);
source.exams[0]={id:"exam001",classNo:6,term:"first",schoolId:"school001"};
source.subjects[0]={...source.subjects[0],schoolId:undefined};
await assert.rejects(()=>prepareV47SchoolLedger(args),/not from verified school subjects|Complete student and subject lists required/);
// An unscoped duplicate must not be mistaken for a verified school's subject.
source.subjects[0]={id:"math001",name:"Mathematics",classNo:6,schoolId:"school001"};
source.subjects.push({id:"unscopedMath",name:"Mathematics",classNo:6});
assert.match((await prepareV47SchoolLedger({...args,selectSubjects:(records,n)=>records.filter(r=>r.classNo===n&&r.schoolId===args.schoolId).map(r=>r.name)})).body,/Student One/);
source.subjects.pop();
// A second school's identically named subject must never contaminate any ledger mode.
for(const mode of ["entry","number","grade"]){
 source.subjects.push({id:"otherSchoolMath",name:"Mathematics",classNo:6,schoolId:"school002"});
 try{
  const scopedSubjects=(records,n)=>records.filter(r=>r.classNo===n&&r.schoolId===args.schoolId).map(r=>r.name);
  const view=await prepareV47SchoolLedger({...args,mode,selectSubjects:scopedSubjects});
  assert.match(view.body,/Student One/);
  await assert.rejects(()=>prepareV47SchoolLedger({...args,mode,selectSubjects:records=>records.filter(r=>r.classNo===6).map(r=>r.name)}),/Duplicate or invalid selected ledger subjects/);
 }finally{source.subjects.pop();}
}
// Duplicate exam IDs must fail closed before any ledger is rendered.
source.exams.push({id:"exam001",schoolId:"school002",classNo:6,term:"first"});
await assert.rejects(()=>prepareV47SchoolLedger(args),/Duplicate or invalid ledger document identity|Ambiguous selected exam identity/);
source.exams.pop();
// Invalid request scope must be rejected before a single tenant read occurs.
let attemptedReads=0;
const noReadSession={listPage:async()=>{attemptedReads++;throw Error("must not read");}};
for(const invalid of [{schoolId:"../other"},{examId:" "},{classNo:11},{classNo:0},{mode:"invalid"},{term:"annual"},{term:"third"}]){
 await assert.rejects(()=>prepareV47SchoolLedger({...args,...invalid,session:noReadSession}),/Invalid school|school ID|School ID|Exam ID required|not verified for this class|Unsupported ledger mode|Unsupported V47 exam term/i);
 assert.equal(attemptedReads,0);
}
console.log("V47 verified school ledger read workflow checks passed");
