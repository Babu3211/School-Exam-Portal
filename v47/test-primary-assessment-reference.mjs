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
