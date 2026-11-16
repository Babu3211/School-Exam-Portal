import assert from "node:assert/strict";
import {v47MarkGradePreview} from "../src/v47/v46-mark-grade-preview.mjs";
assert.equal(v47MarkGradePreview({score:95}),"A+");
assert.equal(v47MarkGradePreview({score:35}),"D");
assert.equal(v47MarkGradePreview({score:20}),"NG");
for(const value of [null,{}, {score:"95"},{score:101},{score:-1},{scores:[],classId:"ECD",term:"first"}])
 assert.equal(v47MarkGradePreview(value),null);
const primary={classId:"1",term:"first",assessmentType:"learning-achievement",scores:[
 {name:"No. of Learning Achievement",fullMarks:10,obtained:10},
 {name:"Full Marks",fullMarks:40,obtained:null},
 {name:"Obtained Learning Achievement",fullMarks:40,obtained:36}
]};
assert.equal(v47MarkGradePreview(primary),"A+");
assert.equal(v47MarkGradePreview({...primary,term:"invalid"}),null);
assert.equal(v47MarkGradePreview({...primary,term:"final"}),"A+");
assert.equal(v47MarkGradePreview({...primary,scores:[]}),null);
console.log("V47/V46 grade preview compatibility checks passed");
