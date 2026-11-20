import assert from 'node:assert/strict';
import {previewIemisGradeSheet} from './iemis-grade-sheet-preview.mjs';
import {iemisEntrySchema} from '../iemis-entry.js';
import {iemisGpa} from '../iemis-ledger.js';
const students=[{id:'s1',nameEnglish:'Alpha'},{id:'s2',nameEnglish:'Beta'}],subjects=[{id:'eng',name:'English',creditHour:4},{id:'math',name:'Mathematics',creditHour:5}];
for(const classNo of ['1','2','3','4','5','6','7','8','9','10'])for(const [term,v46term] of [['1st','first'],['2nd','second'],['3rd','third'],['final','annual']]){
 const draftsBySubject={};
 for(const subject of subjects){const schema=iemisEntrySchema(classNo,v46term,subject.name);const draft={values:Object.fromEntries(schema.filter(x=>!x.readonly).map(x=>[x.key,x.key==='count'?'10':x.key==='obtained'?'35':String(x.max)])),isAbsent:false,incompatible:false};draftsBySubject[subject.id]={s1:draft,s2:draft}}
 const args={classNo,term,students,subjects,draftsBySubject,studentId:'s1'};
 const result=previewIemisGradeSheet(args);
 const expectedReady=term==='final'||Number(classNo)<=5;
 assert.equal(result.ready,expectedReady);
 if(expectedReady){assert.equal(result.student.studentName,'Alpha');assert.equal(result.student.subjects.length,2);
 assert.equal(result.student.gpa,iemisGpa(result.student.subjects,{annual:term==='final',primary:Number(classNo)<=5}));}
 else {assert.equal(result.student,null);assert.match(result.reason,/GPA/)}
 const partial=previewIemisGradeSheet({...args,draftsBySubject:{...draftsBySubject,eng:{s1:draftsBySubject.eng.s1}}});
 assert.equal(partial.ready,false);assert.equal(partial.student,null);
 assert.throws(()=>previewIemisGradeSheet({...args,studentId:'outsider'}),/not in selected class/);
 assert.throws(()=>previewIemisGradeSheet({...args,studentId:'../other'}),/Valid student ID/);
 assert.throws(()=>previewIemisGradeSheet({...args,studentId:'x'.repeat(129)}),/Valid student ID/);
 assert.throws(()=>previewIemisGradeSheet({...args,studentId:'s1',subjects:[subjects[0],subjects[0]]}),/duplicate/);
 assert.throws(()=>previewIemisGradeSheet({...args,students:[...students,{id:'s2',nameEnglish:'Duplicate'}]}),/duplicate/);
 assert.throws(()=>previewIemisGradeSheet({...args,studentId:'s1',draftsBySubject:{...draftsBySubject,outsider:{}}}),/Unexpected/);
}
console.log('V47 read-only grade sheet preview and class-completeness tests passed');
