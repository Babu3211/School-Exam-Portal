import assert from 'node:assert/strict';
import {prepareConfiguredClassPublication} from './configured-class-publication-preview.mjs';
const schoolId='12345',classId='9',subjectId='computer',examId='final';
const actor={active:true,role:'school_admin',schoolId,uid:'admin1'};
const settings={active:true,schoolId,classId,subjectId,examId,components:[{key:'theory',name:'Theory',fullMarks:63},{key:'practical',name:'Practical',fullMarks:37}]};
const roster=Array.from({length:205},(_,i)=>'student'+String(i).padStart(4,'0'));
const drafts=roster.map(studentId=>({studentId,values:{theory:'60',practical:'30'}})).reverse();
const args={actor,schoolId,classId,subjectId,examId,settings,expectedStudentIds:roster,drafts};
const good=prepareConfiguredClassPublication(args);
assert.equal(good.complete,true);
assert.equal(good.rosterCount,205);
assert.deepEqual(good.reviewBatches.map(b=>b.length),[100,100,5]);
assert.equal(good.orderedEntries[0].studentId,'student0000');
assert.equal(good.orderedEntries[0].totalObtained,90);
assert.equal(good.writeAuthorized,false);
assert.equal(good.publicationAllowed,false);
assert.equal(Object.isFrozen(good.reviewBatches[0]),true);
const missing=prepareConfiguredClassPublication({...args,drafts:drafts.slice(1)});
assert.equal(missing.complete,false);
assert.equal(missing.missing.length,1);
assert.equal(missing.writeAuthorized,false);
const absent=prepareConfiguredClassPublication({...args,drafts:drafts.map((r,i)=>i===0?{studentId:r.studentId,isAbsent:true,values:{}}:r)});
assert.equal(absent.complete,true);
assert.equal(absent.orderedEntries.find(r=>r.isAbsent).values,null);
assert.throws(()=>prepareConfiguredClassPublication({...args,actor:{...actor,role:'viewer'}}),/Verified school admin/);
assert.throws(()=>prepareConfiguredClassPublication({...args,schoolId:'67890'}),/Verified school admin/);
console.log('V47 configured full-class publication preview tests passed');

// Full supported class size must remain reviewable without allowing writes.
const largeRoster=Array.from({length:1500},(_,i)=>'student'+String(i).padStart(4,'0'));
const largeDrafts=largeRoster.map(studentId=>({studentId,values:{theory:63,practical:37}}));
const large=prepareConfiguredClassPublication({...args,expectedStudentIds:largeRoster,drafts:largeDrafts});
assert.equal(large.complete,true);
assert.equal(large.rosterCount,1500);
assert.equal(large.reviewBatches.length,15);
assert.equal(large.reviewBatches.reduce((count,batch)=>count+batch.length,0),1500);
assert.equal(large.writeAuthorized,false);
assert.equal(large.publicationAllowed,false);
assert.throws(()=>prepareConfiguredClassPublication({...args,expectedStudentIds:[...largeRoster,'student1500'],drafts:largeDrafts}),/Complete authoritative class roster required/);
for(const uid of [' ','admin/other','admin.name','a'.repeat(129)]){
 assert.throws(()=>prepareConfiguredClassPublication({...args,actor:{...actor,uid}}),/Verified school admin required/);
}

const primarySettings={...settings,classId:'1',subjectId:'math',components:[
 {key:'count',name:'No. of Learning Achievement',fullMarks:10},
 {key:'got',name:'Obtained Learning Achievement',fullMarks:40}]};
const primaryArgs={...args,classId:'1',subjectId:'math',settings:primarySettings,expectedStudentIds:['s1'],drafts:[{studentId:'s1',values:{count:5,got:20}}]};
assert.equal(prepareConfiguredClassPublication(primaryArgs).complete,true);
for(const values of [{count:5,got:21},{count:0,got:0},{count:5.5,got:20},{count:5,got:19.5}]){
 const review=prepareConfiguredClassPublication({...primaryArgs,drafts:[{studentId:'s1',values}]});
 assert.equal(review.complete,false);
 assert.match(review.invalid[0].message,/learning achievement/);
}
assert.throws(()=>prepareConfiguredClassPublication({...primaryArgs,settings:{...primarySettings,components:[primarySettings.components[0],{...primarySettings.components[1],fullMarks:39}]}}),/maximum count/);
