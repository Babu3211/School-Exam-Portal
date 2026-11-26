import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {subjectsForGrade,assessmentThemeReference} from './primary-assessment-reference.mjs';
const catalogue=JSON.parse(readFileSync(new URL('./primary-assessment-reference-2083.json',import.meta.url),'utf8'));
let themes=0;
for(const grade of ['4','5'])for(const [subject] of subjectsForGrade(grade)){
 const ref=assessmentThemeReference({catalogue,grade,subject});
 themes+=ref.themeCount;
 assert.equal(ref.officialAssessmentApproved,false);assert.equal(ref.writeAuthorized,false);
 if(subject==='hamrodhunibeshi')assert.equal(ref.rawFullMarks,null);
 else assert.equal(ref.rawFullMarks,ref.learningAchievements*4);
 if(subject==='mathematics'){assert.equal(ref.rawFullMarks,120);assert.equal(ref.learningAchievements,30)}
}
assert.equal(themes,129);
for(const [grade,main,indicators] of [['1',25,108],['2',28,144],['3',24,140]]){
 const ref=assessmentThemeReference({catalogue,grade,subject:'serophero'});
 assert.equal(ref.themeCount,10);assert.equal(ref.learningAchievements,main);assert.equal(ref.rawFullMarks,indicators);assert.equal(ref.scoreBlocks,indicators/4);
}
assert.throws(()=>assessmentThemeReference({catalogue,grade:'2',subject:'serophero',year:'2084'}));
const invalid=structuredClone(catalogue);invalid.rows['2:serophero'][0].fullMarks=999;
assert.throws(()=>assessmentThemeReference({catalogue:invalid,grade:'2',subject:'serophero'}),/Indicator/);
const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
assert.match(html,/href="\.\/primary-assessment\.html"/);
console.log('PASS V47 2083 primary assessment reference: 129 upper-primary themes, 30 lower-primary Our Surroundings forms, separate indicator denominators, no official writes');

import {prepareObservationPortfolio,readObservationPortfolio} from './primary-assessment-portfolio.mjs';
const sid='300160003',student={id:'s1',schoolId:sid,class:'1',active:true,section:''};
const obs={schoolId:sid,studentId:'s1',academicYear:'2083',className:'कक्षा १',section:'',subject:'नेपाली',unit:'पठन',topic:'अक्षर चिन्ने',date:'2083-08-01',level:3,stage:'regular'};
const doc=(id,d)=>({id,data:()=>d});
const args={schoolId:sid,grade:'1',student,docs:[doc('a',obs)]};
const portfolio=prepareObservationPortfolio(args);
assert.equal(portfolio.rows[0].level,3);assert.equal(portfolio.rows[0].subject,'नेपाली');assert.equal(portfolio.indicatorBlocksIncluded,false);assert.equal(portfolio.readOnly,true);
assert.equal(prepareObservationPortfolio({...args,docs:[doc('a',{...obs,className:'Class 2'})]}).historical,1);
for(const data of [{...obs,schoolId:'99999'},{...obs,studentId:'s2'},{...obs,academicYear:'2084'},{...obs,level:5}])assert.throws(()=>prepareObservationPortfolio({...args,docs:[doc('a',data)]}));
assert.throws(()=>prepareObservationPortfolio({...args,docs:[doc('a',obs),doc('a',obs)]}),/duplicate/);
const actor={uid:'admin1',schoolId:sid,role:'school_admin',active:true};
let queries=0;
const api={doc:(_db,...parts)=>parts.join('/'),getDocFromServer:async path=>({exists:()=>true,data:()=>path==='schools/'+sid?{id:sid,active:true}:path.endsWith('/members/admin1')?actor:student}),collection:(_db,...parts)=>parts.join('/'),where:(...x)=>x,limit:n=>n,query:(...x)=>x,getDocsFromServer:async q=>{queries++;assert.deepEqual(q,['schools/'+sid+'/cdc_observations',['studentId','==','s1'],['academicYear','==','2083'],2001]);return {docs:[doc('a',obs)]}}};
const readArgs={db:{},api,actor,schoolId:sid,grade:'1',studentId:'s1',assertCurrent:()=>{}};
assert.equal((await readObservationPortfolio(readArgs)).rows.length,1);
await assert.rejects(readObservationPortfolio({...readArgs,actor:{...actor,role:'teacher'}}),/Admin or Viewer/);
await assert.rejects(readObservationPortfolio({...readArgs,schoolId:'99999'}),/Admin or Viewer/);
assert.equal(queries,1);
let stale=false;
await assert.rejects(readObservationPortfolio({...readArgs,api:{...api,getDocsFromServer:async()=>{stale=true;return {docs:[doc('a',obs)]}}},assertCurrent:()=>{if(stale)throw Error('Stale selection')}}),/Stale selection/);
console.log('PASS scoped V46 CDC portfolio: exact saved ratings, Admin/Viewer, no cross-school, no stale selection, no publication');
