import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {primarySubjectKey,draftThemeSlots,loadPrimaryTeacherWorksheet,loadAssignedPrimarySubjects} from './primary-assessment-teacher-worksheet.mjs';
import {parseLocalAssessmentSource} from './primary-assessment-local-source.mjs';
import {v46SeroferoThemeRows,scoreSeroferoDraft,v46SeroferoPrintedNumber} from './primary-assessment-v46-serofero-text.mjs';
import {v46LanguageHealthThemeRows} from './primary-assessment-v46-language-health-text.mjs';
import {v46SocialThemeRows} from './primary-assessment-v46-social-text.mjs';
import {v46ScienceThemeRows} from './primary-assessment-v46-science-text.mjs';
import {v46MathThemeRows} from './primary-assessment-v46-math-text.mjs';
import {assessmentThemeReference} from './primary-assessment-reference.mjs';
const catalogue=JSON.parse(readFileSync(new URL('./primary-assessment-reference-2083.json',import.meta.url)));
for(const [grade,expected] of [['1',27],['2',36],['3',35]]){
 let total=0;
 for(const t of catalogue.rows[grade+':serophero']){
  const rows=v46SeroferoThemeRows(grade,t.theme,t.scoreBlocks);
  assert.equal(rows.length,t.scoreBlocks);total+=rows.length;
  assert.equal(v46SeroferoThemeRows(grade,t.theme,t.scoreBlocks+1),null);
  const slots=draftThemeSlots({writeAuthorized:false,officialAssessmentApproved:false,key:'serophero',themes:[{...t,sourceRows:rows}]},0);
  assert.equal(slots.length,t.scoreBlocks);assert.ok(slots.every(s=>s.sourceText.indicators.length===4));
 }
 assert.equal(total,expected);
}
assert.deepEqual(scoreSeroferoDraft('00001111_101'),{blocks:[0,4,null],completed:2,total:4});
assert.throws(()=>scoreSeroferoDraft('0123'));
assert.throws(()=>scoreSeroferoDraft('111'));
assert.equal(primarySubjectKey('नेपाली'),'nepali');assert.equal(primarySubjectKey('Mathematics'),'mathematics');assert.equal(primarySubjectKey('Optional Mathematics'),null);
for(const name of ['सेरोफेरो','हाम्रो सेरोफेरो'])assert.equal(primarySubjectKey(name),'serophero');
for(const name of ['हाम्रो धुनिबेँशी','स्थानीय','Our Dhunibeshi','मातृभाषा वा स्थानीय विषय'])assert.equal(primarySubjectKey(name),'hamrodhunibeshi');
for(const grade of ['4','5']){
 let count=0;
 for(const theme of catalogue.rows[grade+':mathematics']){
  const rows=v46MathThemeRows(grade,theme.theme,theme.count);
  assert.ok(rows,'V46 text missing or count mismatch: '+grade+' '+theme.theme);
  assert.equal(rows.length,theme.count);count+=rows.length;
  const slots=draftThemeSlots({writeAuthorized:false,officialAssessmentApproved:false,key:'mathematics',themes:[{...theme,sourceRows:rows}]},0);
  assert.equal(slots.length,theme.count);assert.equal(slots[0].sourceText.achievement,rows[0].achievement);
  assert.equal(v46MathThemeRows(grade,theme.theme,theme.count+1),null);
 }
 assert.equal(count,30);
}
assert.equal(v46MathThemeRows('3','ज्यामिति',4),null);
for(const grade of ['4','5']){
 let count=0;
 const themes=catalogue.rows[grade+':science'];
 assert.equal(themes.length,8);
 for(const theme of themes){
  const rows=v46ScienceThemeRows(grade,theme.theme,theme.count);
  assert.ok(rows,'V46 Science text mismatch '+grade+' '+theme.theme);
  count+=rows.length;
  const slots=draftThemeSlots({writeAuthorized:false,officialAssessmentApproved:false,key:'science',themes:[{...theme,sourceRows:rows}]},0);
  assert.equal(slots.length,theme.count);
  assert.ok(slots.every(s=>s.sourceText.achievement&&s.sourceText.titleEn));
  assert.equal(v46ScienceThemeRows(grade,theme.theme,theme.count+1),null);
 }
 assert.equal(count,49);
}
assert.equal(v46ScienceThemeRows('3','वैज्ञानिक सिकाइ',5),null);
for(const grade of ['4','5']){
 let count=0;
 const themes=catalogue.rows[grade+':socialstudies'];
 assert.equal(themes.length,7);
 for(const theme of themes){
  const rows=v46SocialThemeRows(grade,theme.theme,theme.count);
  assert.ok(rows,'V46 Social text mismatch '+grade+' '+theme.theme);
  count+=rows.length;
  assert.ok(rows.every(r=>Object.keys(r).length===1&&/[\u0900-\u097f]/.test(r.title)));
  const slots=draftThemeSlots({writeAuthorized:false,officialAssessmentApproved:false,key:'socialstudies',themes:[{...theme,sourceRows:rows}]},0);
  assert.equal(slots.length,theme.count);
  assert.equal(slots[0].sourceText.title,rows[0].title);
  assert.equal(v46SocialThemeRows(grade,theme.theme,theme.count+1),null);
 }
 assert.equal(count,32);
}
assert.equal(v46SocialThemeRows('3','हामी र हाम्रो समुदाय',4),null);
for(const [grade,subject,total] of [['4','nepali',90],['5','nepali',90],['4','english',73],['5','english',83],['4','healthphysicalcreativeart',86],['5','healthphysicalcreativeart',88]]){
 let count=0;
 for(const theme of catalogue.rows[grade+':'+subject]){
  const rows=v46LanguageHealthThemeRows(grade,subject,theme.theme,theme.count);
  assert.ok(rows,'V46 source mismatch '+grade+' '+subject+' '+theme.theme);
  count+=rows.length;
  for(const row of rows){
   if(subject==='english'){assert.doesNotMatch(row.title,/[\u0900-\u097f]/);assert.equal(row.titleEn,undefined);}
   else {assert.match(row.title,/[\u0900-\u097f]/);if(subject==='healthphysicalcreativeart')assert.ok(row.titleEn);else assert.equal(row.titleEn,undefined);}
  }
  const slots=draftThemeSlots({writeAuthorized:false,officialAssessmentApproved:false,key:subject,themes:[{...theme,sourceRows:rows}]},0);
  assert.equal(slots.length,theme.count);
  assert.equal(slots[0].sourceText.title,rows[0].title);
  assert.equal(v46LanguageHealthThemeRows(grade,subject,theme.theme,theme.count+1),null);
 }
 assert.equal(count,total);
}
assert.equal(v46LanguageHealthThemeRows('3','english','Unit 1',7),null);
for(const grade of ['1','2','3']){
 const ref=assessmentThemeReference({catalogue,grade,subject:'mathematics'});
 assert.ok(ref.themeCount>0);
 assert.equal(ref.writeAuthorized,false);
 assert.equal(ref.rawFullMarks,ref.learningAchievements*4);
 for(const theme of ref.rows){
  assert.equal(theme.status,'v46WorkingReference');
  assert.equal(theme.printedPage,true);
  assert.equal(theme.sourceRows.length,theme.count);
  const slots=draftThemeSlots({writeAuthorized:false,officialAssessmentApproved:false,key:'mathematics',themes:[theme]},0);
  assert.equal(slots[0].sourceText.criteria.length,4);
 }
 console.log('V46 lower math reference grade '+grade+': '+ref.themeCount+' themes, '+ref.learningAchievements+' working rows');
}
const sid='300160003',actor={schoolId:sid,uid:'teacher1',role:'teacher',active:true},grade='4';
let active=true,role='teacher',foreign=false,studentForeign=false,revoked=false;
const school='schools/'+sid;
const subject={schoolId:sid,class:grade,name:'नेपाली',active:true};
const assignment={schoolId:sid,classId:grade,subjectId:'nep',uid:actor.uid};
const doc=(id,data)=>({id,data:()=>data,exists:()=>true});
const api={doc:(_,...p)=>p.join('/'),collection:(_,...p)=>p.join('/'),query:(path,...constraints)=>({path,constraints}),where:(...p)=>p,orderBy:(...p)=>p,limit:(...p)=>p,startAfter:(...p)=>p,
 getDocFromServer:async p=>{if(p===school)return doc(sid,{id:sid,active:true});if(p===school+'/members/'+actor.uid)return doc(actor.uid,{uid:actor.uid,schoolId:sid,role,active:true});if(p===school+'/subjects/nep')return doc('nep',subject);if(p===school+'/teacher_assignments/'+sid+':teacher1:4:nep')return doc('a',{...assignment,active,schoolId:foreign?'99999':sid});throw Error('Unexpected document read')},
 getDocsFromServer:async q=>{if(q.path===school+'/subjects')return {docs:[doc('nep',subject)]};if(q.path===school+'/students')return {docs:[doc('s1',{schoolId:studentForeign?'99999':sid,class:grade,name:'Student',active:true})]};throw Error('Unexpected collection')}}
const args={db:{},api,actor,schoolId:sid,grade,catalogue,subjectId:'nep',assertCurrent:()=>{if(revoked)throw Error('Stale')}};
assert.equal((await loadAssignedPrimarySubjects(args)).length,1);
const model=await loadPrimaryTeacherWorksheet(args);assert.equal(model.students.length,1);assert.equal(model.writeAuthorized,false);assert.equal(model.officialAssessmentApproved,false);
assert.equal(draftThemeSlots(model,0).length,6);assert.equal(draftThemeSlots(model,0)[0].min,1);
assert.equal(draftThemeSlots({writeAuthorized:false,officialAssessmentApproved:false,key:'serophero',themes:[{scoreBlocks:2,fullMarks:8}]},0)[0].min,0);
assert.throws(()=>draftThemeSlots({...model,writeAuthorized:true},0));
active=false;assert.equal((await loadAssignedPrimarySubjects(args)).length,0);await assert.rejects(loadPrimaryTeacherWorksheet(args),/inactive/);active=true;
foreign=true;await assert.rejects(loadAssignedPrimarySubjects(args),/identity mismatch/);await assert.rejects(loadPrimaryTeacherWorksheet(args),/mismatched/);foreign=false;
studentForeign=true;await assert.rejects(loadPrimaryTeacherWorksheet(args),/Cross-school/);studentForeign=false;
role='viewer';await assert.rejects(loadPrimaryTeacherWorksheet(args),/membership changed/);role='teacher';
await assert.rejects(loadPrimaryTeacherWorksheet({...args,actor:{...actor,role:'viewer'}}),/Verified primary teacher/);
await assert.rejects(loadPrimaryTeacherWorksheet({...args,schoolId:'99999'}),/Verified primary teacher/);
revoked=true;await assert.rejects(loadPrimaryTeacherWorksheet(args),/Stale/);
console.log('PASS primary teacher worksheet: verified assignments, source counts, active roster, stale and tenant rejection, no persistence');

const localRows=parseLocalAssessmentSource('# स्थानीय थिम\nउपलब्धि एक\nउपलब्धि दुई\n# अर्को थिम\nअर्को उपलब्धि','विद्यालयको स्थानीय पाठ्यक्रम २०८३');assert.equal(localRows.length,2);assert.equal(localRows[0].fullMarks,8);assert.equal(localRows[1].fullMarks,4);assert.throws(()=>parseLocalAssessmentSource('# थिम\n# अर्को\nउपलब्धि','Source'));assert.throws(()=>parseLocalAssessmentSource('# थिम\nउपलब्धि\nउपलब्धि','Source'));assert.throws(()=>parseLocalAssessmentSource('उपलब्धि','Source'));

// Display numbers are distinct from stable source-row identities. Repeated printed 5 is intentional.
for(const grade of ['1','2','3']){
 const ref=assessmentThemeReference({catalogue,grade,subject:'serophero'});
 let previous=0,total=0;
 for(const t of ref.rows){const rows=v46SeroferoThemeRows(grade,t.theme,t.scoreBlocks);const outcomes=[...new Set(rows.map(r=>r.outcome))];for(const ordinal of outcomes){const n=v46SeroferoPrintedNumber(grade,t.theme,ordinal);assert.ok(n>=previous);previous=n;total++;}assert.ok(rows.every(r=>!Object.hasOwn(r,'printedNumber')));}
 assert.equal(total,grade==='1'?25:grade==='2'?28:24);assert.equal(previous,Number(grade==='1'?25:grade==='2'?28:24));
}
assert.equal(v46SeroferoPrintedNumber('2','म र मेरो परिवार',5),5);assert.equal(v46SeroferoPrintedNumber('2','म र मेरो परिवार',6),5);assert.equal(v46SeroferoPrintedNumber('2','मेरो दैनिक जीवन',1),7);assert.throws(()=>v46SeroferoPrintedNumber('2','Unknown',1));
