import assert from "node:assert/strict";
import {renderV47SchoolLedger} from "../src/v47/v46-school-ledger-adapter.mjs";
const base={schoolId:"school001",term:"first",classNo:6,schoolName:"Test School",schoolCode:"001",examId:"exam001",students:[{id:"student001",name:"Test Student"}],subjects:["Mathematics"],marks:[],creditFor:()=>4,componentsFor:()=>[],applicable:()=>true};
assert.throws(()=>renderV47SchoolLedger({...base,schoolId:"invalid school"}),/school/i);
assert.throws(()=>renderV47SchoolLedger({...base,classNo:12}),/not verified/);
assert.throws(()=>renderV47SchoolLedger({...base,term:"annual"}),/Unsupported V47 exam term/);
assert.throws(()=>renderV47SchoolLedger({...base,mode:"publish"}),/Unsupported ledger mode/);
assert.throws(()=>renderV47SchoolLedger({...base,marks:[{examId:"exam001",studentId:"student001",score:90}]}),/percentage-only marks/);
assert.throws(()=>renderV47SchoolLedger({...base,marks:[{examId:"exam001",studentId:"other",scores:[{name:"IN",fullMarks:50,obtained:40}]}]}),/outside selected students/);
assert.throws(()=>renderV47SchoolLedger({...base,creditFor:null}),/Verified subject credit/);
const validMark={examId:"exam001",studentId:"student001",subject:"Mathematics",scores:[{name:"IN",fullMarks:50,obtained:40}]};
assert.throws(()=>renderV47SchoolLedger({...base,marks:[{...validMark,subject:"English"}]}),/subject is not in selected subjects/);
assert.throws(()=>renderV47SchoolLedger({...base,marks:[validMark,{...validMark}]}),/Duplicate ledger mark/);
assert.throws(()=>renderV47SchoolLedger({...base,subjects:["Mathematics","math"]}),/duplicate ledger subjects/);
assert.ok(renderV47SchoolLedger({...base,marks:[validMark]}).body.includes("40"));

const ledger=renderV47SchoolLedger(base);
assert.equal(typeof ledger,"object");
assert.ok(ledger.head.includes("Mathematics"));
assert.ok(ledger.body.includes("Test School"));
assert.ok(ledger.body.includes("Test Student"));
assert.deepEqual(ledger.subjects,["Mathematics"]);
assert.ok(Object.isFrozen(ledger));
// Never mix another school's roster or assessment components into the selected school's ledger.
assert.throws(()=>renderV47SchoolLedger({...base,students:[{...base.students[0],schoolId:"school002"}]}),/student school mismatch/);
assert.throws(()=>renderV47SchoolLedger({...base,marks:[{...validMark,schoolId:"school002"}]}),/mark school mismatch/);
assert.throws(()=>renderV47SchoolLedger({...base,marks:[{...validMark,examId:"exam002"}]}),/exam mismatch/);
assert.throws(()=>renderV47SchoolLedger({...base,marks:[{...validMark,classNo:7}]}),/class mismatch/);
assert.throws(()=>renderV47SchoolLedger({...base,marks:[{...validMark,schoolId:"school001",classNo:6},validMark]}),/Duplicate ledger mark/);
assert.throws(()=>renderV47SchoolLedger({...base,students:[base.students[0],base.students[0]]}),/duplicate student identity/);
assert.throws(()=>renderV47SchoolLedger({...base,subjects:[]}),/Complete student and subject lists required/);
assert.throws(()=>renderV47SchoolLedger({...base,marks:[{...validMark,scores:[]}]}),/percentage-only marks/);
assert.throws(()=>renderV47SchoolLedger({...base,students:[{...base.students[0],classNo:7}]}),/student class mismatch/);
assert.ok(renderV47SchoolLedger({...base,students:[{...base.students[0],classNo:6}]}).body.includes("Test Student"));
// The three V46 ledger views must share the same school boundary and original renderer.
for(const mode of ["entry","number","grade"]){
 const view=renderV47SchoolLedger({...base,mode,marks:[validMark]});
 assert.ok(view.head.includes("Mathematics"));
 assert.ok(view.body.includes("Test Student"));
 assert.throws(()=>renderV47SchoolLedger({...base,mode,marks:[{...validMark,schoolId:"school002"}]}),/mark school mismatch/);
 assert.throws(()=>renderV47SchoolLedger({...base,mode,students:[{...base.students[0],schoolId:"school002"}]}),/student school mismatch/);
}
// Class and tenant boundaries must hold for every ledger presentation mode.
for(const mode of ["entry","number","grade"]){
 assert.throws(()=>renderV47SchoolLedger({...base,mode,students:[{...base.students[0],classNo:7}]}),/student class mismatch/);
 assert.throws(()=>renderV47SchoolLedger({...base,mode,marks:[{...validMark,classNo:7}]}),/mark class mismatch/);
 assert.ok(renderV47SchoolLedger({...base,mode,students:[{...base.students[0],classNo:6}],marks:[{...validMark,classNo:6}]}).body.includes("Test Student"));
}
// Rendering all V46 ledger views is read-only and cannot mutate fetched tenant data.
for(const mode of ["entry","number","grade"]){
 const source={...base,marks:[validMark]};
 const original=structuredClone({students:source.students,subjects:source.subjects,marks:source.marks});
 renderV47SchoolLedger({...source,mode});
 assert.deepEqual({students:source.students,subjects:source.subjects,marks:source.marks},original,"Ledger renderer must not modify school records");
}
console.log("V47 school-scoped IEMIS ledger adapter checks passed");
