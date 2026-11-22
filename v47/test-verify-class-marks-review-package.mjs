import assert from 'node:assert/strict';
import {buildClassMarksReviewPackage} from './class-marks-review-package.mjs';
import {verifyClassMarksReviewPackage} from './verify-class-marks-review-package.mjs';
const actor={uid:'admin',role:'school_admin',active:true,schoolId:'12345'};
const settings={schoolId:'12345',classId:'9',subjectId:'math',examId:'final',active:true,components:[{key:'theory',name:'Theory',fullMarks:75},{key:'practical',name:'Practical',fullMarks:25}]};
const expectedStudentIds=Array.from({length:205},(_,i)=>'s'+String(i+1).padStart(4,'0'));
const base={actor,schoolId:'12345',classId:'9',subjectId:'math',examId:'final',settings,expectedStudentIds};
const drafts=expectedStudentIds.map((studentId,i)=>i===0?{studentId,isAbsent:true}:{studentId,values:{theory:60,practical:20}});
const review=buildClassMarksReviewPackage({...base,drafts});
const verify=json=>verifyClassMarksReviewPackage({...base,json});
assert.equal(verify(review.json).rosterCount,205);
assert.equal(verify(review.json).writeAuthorized,false);
assert.equal(verify(review.json).publicationAllowed,false);
const tamper=mutate=>{const obj=JSON.parse(review.json);mutate(obj);return JSON.stringify(obj)};
for(const mutate of [
 obj=>obj.schoolId='87654',
 obj=>obj.entries[1].totalObtained=99,
 obj=>obj.entries[1].values.theory=76,
 obj=>obj.entries[1].studentId=obj.entries[2].studentId,
 obj=>obj.entries.pop(),
 obj=>obj.componentLimits[0].fullMarks=100,
 obj=>obj.writeAuthorized=true,
 obj=>obj.entries[0].values={theory:20},
 obj=>obj.entries[1].unexpected=true,
 obj=>obj.unexpected=true
])assert.throws(()=>verify(tamper(mutate)));
assert.throws(()=>verify('{bad json'));
assert.throws(()=>verifyClassMarksReviewPackage({...base,json:review.json,expectedStudentIds:expectedStudentIds.slice(1)}));
assert.throws(()=>verifyClassMarksReviewPackage({...base,json:review.json,settings:{...settings,components:[{key:'theory',name:'Theory',fullMarks:80},{key:'practical',name:'Practical',fullMarks:20}]}}));
assert.throws(()=>verifyClassMarksReviewPackage({...base,json:review.json,actor:{...actor,role:'viewer'}}));
const largeIds=Array.from({length:1500},(_,i)=>'student_'+String(i).padStart(4,'0'));
const largeDrafts=largeIds.map(studentId=>({studentId,values:{theory:55,practical:20}}));
const large=buildClassMarksReviewPackage({...base,expectedStudentIds:largeIds,drafts:largeDrafts});
assert.equal(verifyClassMarksReviewPackage({...base,expectedStudentIds:largeIds,json:large.json}).rosterCount,1500);
assert.throws(()=>buildClassMarksReviewPackage({...base,expectedStudentIds:[...largeIds,'extra'],drafts:[...largeDrafts,{studentId:'extra',values:{theory:55,practical:20}}]}));
assert.throws(()=>verify(' '.repeat(900001)),/too large/);
console.log('V47 review import revalidation checks complete class, tenant, component limits and tampering; no writes');

// At the 1500-student boundary, a changed mark, roster identity, or approval flag must fail closed.
const largeVerify=json=>verifyClassMarksReviewPackage({...base,expectedStudentIds:largeIds,json});
for(const mutate of [
 obj=>obj.entries[1499].values.theory=54,
 obj=>obj.entries[1499].totalObtained=74,
 obj=>obj.entries[1499].studentId='outsider',
 obj=>obj.entries[1499].isAbsent=true,
 obj=>obj.entries[1499].values=null,
 obj=>obj.entries.reverse(),
 obj=>obj.publicationAllowed=true
]){
 const changed=JSON.parse(large.json);
 mutate(changed);
 assert.throws(()=>largeVerify(JSON.stringify(changed)));
}
assert.throws(()=>verifyClassMarksReviewPackage({...base,expectedStudentIds:largeIds,json:large.json,actor:{...actor,schoolId:'67890'}}));
