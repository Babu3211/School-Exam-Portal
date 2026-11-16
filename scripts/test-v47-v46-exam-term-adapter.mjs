import assert from "node:assert/strict";
import {toV46IemisTerm,toV47ExamTerm} from "../src/v47/v46-exam-term-adapter.mjs";
for(const [v47,v46] of [["first","first"],["second","second"],["final","annual"]]){
 assert.equal(toV46IemisTerm(v47),v46);
 assert.equal(toV47ExamTerm(v46),v47);
}
for(const invalid of ["",null,undefined,"third","half-yearly","annual","FINAL",0,{},["first"]])
 assert.throws(()=>toV46IemisTerm(invalid),/Unsupported V47 exam term/);
for(const invalid of ["",null,undefined,"third","half-yearly","final","ANNUAL",0,{},["annual"]])
 assert.throws(()=>toV47ExamTerm(invalid),/Unsupported V46 IEMIS exam term/);
console.log("V47/V46 IEMIS exam term compatibility checks passed");
