import assert from 'node:assert/strict';
import {previewV46MarkSummaries} from './mark-summary-preview.mjs';
const rows={exams:[{id:'e1'},{id:'e2'}],marks:[
 {id:'m1',studentId:'s1',examId:'e1',className:'Class 1',subject:'Math',scores:[{name:'No. of Learning Achievement',obtained:10},{name:'Obtained Learning Achievement',obtained:32}]},
 {id:'m2',studentId:'s2',examId:'e1',className:'Class 1',subject:'Math',scores:[]},
 {id:'m3',studentId:'s3',examId:'e2',className:'Class 1',subject:'Math',scores:[]},
 {id:'m4',studentId:'s4',examId:'e1',className:'Class 2',subject:'Math',scores:[]}
]};
const preview=previewV46MarkSummaries(rows,{classNo:1,examId:'e1'});
assert.equal(preview.records.length,2);
assert.equal(preview.completeCount,1);
assert.equal(preview.records[0].grade,'A');
assert.equal(preview.records[0].full,40);
assert.equal(preview.publicationAllowed,false);
assert.equal(preview.official,false);
assert.ok(Object.isFrozen(preview.records)&&Object.isFrozen(preview.records[0]));
assert.throws(()=>previewV46MarkSummaries(rows,{classNo:13,examId:'e1'}),/Verified class/);
const senior={...rows,marks:[...rows.marks,{id:'m11',studentId:'s11',examId:'e1',class:'Class 11',subject:'Computer',scores:[]},{id:'m12',studentId:'s12',examId:'e1',class:'12',subject:'Computer',scores:[]}]};
assert.equal(previewV46MarkSummaries(senior,{classNo:11,examId:'e1'}).records[0].studentId,'s11');
assert.equal(previewV46MarkSummaries(senior,{classNo:12,examId:'e1'}).records[0].studentId,'s12');
assert.equal(previewV46MarkSummaries(senior,{classNo:11,examId:'e1'}).official,false);
assert.throws(()=>previewV46MarkSummaries(rows,{classNo:1}),/Verified class/);
assert.throws(()=>previewV46MarkSummaries(rows,{classNo:1,examId:'other-school-exam'}),/verified school report snapshot/);
console.log('V47 read-only mark summary preview tests passed');
