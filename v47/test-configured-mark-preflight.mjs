import assert from 'node:assert/strict';
import {inspectConfiguredClassMarks} from './configured-mark-preflight.mjs';
const base={schoolId:'12345',subjectId:'computer',examId:'final',classId:'9',expectedStudentIds:['a','b']};
const settings={schoolId:'12345',subjectId:'computer',examId:'final',classId:'9',active:true,components:[{key:'participation',name:'Participation',fullMarks:7},{key:'practical',name:'Practical',fullMarks:63},{key:'term',name:'Term',fullMarks:30}]};
const result=inspectConfiguredClassMarks({...base,settings,drafts:[{studentId:'a',values:{participation:7,practical:63,term:30}},{studentId:'b',values:{participation:0,practical:0,term:0}}]});
assert.equal(result.complete,true);assert.equal(result.ready[0].totalObtained,100);
assert.deepEqual(result.ready[0].values,{participation:7,practical:63,term:30});
assert.equal(Object.isFrozen(result.ready[0].values),true);
assert.equal(result.publicationAllowed,false);
const invalid=inspectConfiguredClassMarks({...base,settings,drafts:[{studentId:'a',values:{participation:8,practical:63,term:30}},{studentId:'b',values:{participation:0,practical:0,term:0}}]});
assert.equal(invalid.complete,false);assert.match(invalid.invalid[0].message,/Out of range/);
const missing=inspectConfiguredClassMarks({...base,settings,drafts:[{studentId:'a',values:{participation:7,practical:63,term:30}}]});
assert.deepEqual(missing.missing,['b']);
assert.throws(()=>inspectConfiguredClassMarks({...base,settings:{...settings,schoolId:'99999'},drafts:[]}),/Verified subject/);
assert.throws(()=>inspectConfiguredClassMarks({...base,settings:{...settings,components:[...settings.components,settings.components[0]]},drafts:[]}),/duplicate/);
assert.throws(()=>inspectConfiguredClassMarks({...base,settings:{...settings,components:[{key:'x',name:'X',fullMarks:0}]},drafts:[]}),/Invalid/);
const otherSubject={...settings,subjectId:'math',components:[{key:'theory',name:'Theory',fullMarks:80},{key:'project',name:'Project',fullMarks:20}]};
const math=inspectConfiguredClassMarks({...base,subjectId:'math',settings:otherSubject,drafts:[{studentId:'a',values:{theory:80,project:20}},{studentId:'b',isAbsent:true}]});
assert.equal(math.complete,true);
assert.equal(math.ready[1].isAbsent,true);
assert.equal(math.ready[1].values,undefined);
const encoded=inspectConfiguredClassMarks({...base,settings,drafts:[{studentId:'a',values:{participation:'0x7',practical:'63',term:'30'}},{studentId:'b',isAbsent:true}]});
assert.equal(encoded.complete,false);
const decimal=inspectConfiguredClassMarks({...base,settings,drafts:[{studentId:'a',values:{participation:'6.5',practical:'62.25',term:'30'}},{studentId:'b',isAbsent:true}]});
assert.equal(decimal.complete,true);
const exponential=inspectConfiguredClassMarks({...base,settings,drafts:[{studentId:'a',values:{participation:'7e0',practical:'63',term:'30'}},{studentId:'b',isAbsent:true}]});
assert.equal(exponential.complete,false);
const whitespace=inspectConfiguredClassMarks({...base,settings,drafts:[{studentId:'a',values:{participation:' 6.5 ',practical:'62.25',term:'30'}},{studentId:'b',isAbsent:true}]});
assert.equal(whitespace.complete,true);
const nonNumeric=inspectConfiguredClassMarks({...base,settings,drafts:[{studentId:'a',values:{participation:true,practical:63,term:30}},{studentId:'b',isAbsent:true}]});
assert.equal(nonNumeric.complete,false);
assert.match(inspectConfiguredClassMarks({...base,settings,drafts:[{studentId:'a',isAbsent:true,values:{participation:7}},{studentId:'b',isAbsent:true}]}).invalid[0].message,/Absent student/);
assert.match(inspectConfiguredClassMarks({...base,settings,drafts:[{studentId:'a',isAbsent:'true'},{studentId:'b',isAbsent:true}]}).invalid[0].message,/absence flag/);
assert.throws(()=>inspectConfiguredClassMarks({...base,settings:{...settings,components:[{key:'x',name:'X',fullMarks:100001}]},drafts:[]}),/Invalid/);
for(const values of [[],null,{unexpected:''}]){
 const malformed=inspectConfiguredClassMarks({...base,settings,drafts:[{studentId:'a',isAbsent:true,values},{studentId:'b',isAbsent:true}]});
 assert.equal(malformed.complete,false);
 assert.match(malformed.invalid[0].message,/Invalid absent/);
}
console.log('V47 dynamic subject examination settings marks tests passed');

// Missing or malformed context must never be accepted even when settings share the same missing value.
for(const key of ['schoolId','subjectId','examId','classId']){
 for(const value of [undefined,null,'','../other','bad/id']){
  const badSettings={...settings,[key]:value};
  assert.throws(()=>inspectConfiguredClassMarks({...base,[key]:value,settings:badSettings,drafts:[]}),/Verified subject examination settings required/);
 }
}

// A draft must not bypass the school roster with unsafe Firestore document IDs.
for(const id of [' ','../student','student/id','student:id','student.id','a'.repeat(129),null,123]){
 assert.throws(()=>inspectConfiguredClassMarks({...base,settings,expectedStudentIds:['a',id],drafts:[]}),/Invalid or duplicate student in roster/);
}

// Malformed draft containers must fail before a publication review can be marked complete.
for(const draft of [null,undefined,[],42,'a',true,{studentId:123,values:{}}]){
 assert.throws(()=>inspectConfiguredClassMarks({...base,settings,drafts:[draft,{studentId:'b',isAbsent:true}]}),/Duplicate or out-of-roster mark draft/);
}

// The tenant must be the official numeric IEMIS school code, not a generic document key.
for(const schoolId of ['school_a','1234','123456789012345678901','12-345','१२३४५']){
 assert.throws(()=>inspectConfiguredClassMarks({...base,schoolId,settings:{...settings,schoolId},drafts:[]}),/Verified subject examination settings required/);
}

// Unexpected draft fields (including cross-tenant or publication flags) cannot be smuggled into review.
for(const extra of [{schoolId:'99999'},{publicationAllowed:true},{approved:true},{role:'super_admin'}]){
 assert.throws(()=>inspectConfiguredClassMarks({...base,settings,drafts:[{studentId:'a',isAbsent:true,...extra},{studentId:'b',isAbsent:true}]}),/Duplicate or out-of-roster mark draft/);
}
