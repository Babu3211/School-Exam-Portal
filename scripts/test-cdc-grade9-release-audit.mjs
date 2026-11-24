import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {auditGrade9Release,GRADE9_BASE_SUBJECTS,GRADE9_OPTIONAL_SUBJECTS}
 from '../cdc-grade9-release-audit.mjs';
const data=JSON.parse(readFileSync(new URL(
 '../data/cdc-question-paper-sources-2083.json',import.meta.url),'utf8'));
const baseline=auditGrade9Release({register:data});
assert.equal(baseline.grade,9);
assert.equal(baseline.academicYear,2083);
assert.equal(baseline.readyForLive,false);
assert.equal(GRADE9_BASE_SUBJECTS.length,5);
assert.equal(GRADE9_OPTIONAL_SUBJECTS.length,3);
assert.equal(baseline.checkedSubjects.length,8);
assert.equal(baseline.grade9PaperReady,false);
assert.ok(baseline.blockers.length>0);
const byKey=Object.fromEntries(baseline.checkedSubjects.map(x=>[x.key,x]));
assert.equal(Object.keys(byKey).length,8);
assert.equal(byKey.optional_computer.gridTranscribed,true);
assert.equal(byKey.optional_computer.gridType,'unit_wise_computer');
assert.equal(byKey.optional_computer.questionBankReviewed,false);
assert.equal(byKey.optional_math.gridTranscribed,true);
assert.equal(byKey.optional_math.gridType,'optional_math_WCA_CCA');
assert.equal(byKey.science.gridTranscribed,false);
assert.equal(byKey.english.gridTranscribed,false);
assert.equal(byKey.nepali.gridTranscribed,false);
assert.equal(byKey.math.gridTranscribed,false);
assert.equal(byKey.social.gridTranscribed,false);
assert.equal(byKey.optional_environment.gridTranscribed,false);
assert.equal(byKey.optional_environment.status,'source_missing');
assert.equal(byKey.optional_economics,undefined,'Economics is not offered in V46 default scope');
assert.equal(byKey.accounting,undefined,'Accounting is not offered in V46 default scope');
const mainHtml=readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert.match(mainHtml,/ऐच्छिक प्रथम: वातावरण विज्ञान/);
const v46Aliases=auditGrade9Release({register:data,offeredSubjects:['Optional I: Environmental Science','Optional II: Computer Science','Optional I: Additional Mathematics']});
assert.equal(v46Aliases.checkedSubjects.length,8);
assert.deepEqual(v46Aliases.unknownSchoolSubjects,[]);
assert.ok(baseline.checkedSubjects.filter(x=>x.officialSourceUrl).length>=7);
const ownSchool=auditGrade9Release({
 register:data,offeredSubjects:['Optional Computer Science','Optional Mathematics']
});
assert.equal(ownSchool.checkedSubjects.length,7);
assert.ok(ownSchool.checkedSubjects.some(x=>x.key==='optional_math'));
assert.ok(!ownSchool.checkedSubjects.some(x=>x.key==='optional_economics'));
assert.ok(ownSchool.checkedSubjects.every(x=>x.key==='optional_math'||
 x.key==='optional_computer'||GRADE9_BASE_SUBJECTS.some(s=>s.key===x.key)));
const noOptional=auditGrade9Release({register:data,offeredSubjects:[]});
assert.equal(noOptional.checkedSubjects.length,5,'Required subjects cannot be removed');
const extra=auditGrade9Release({
 register:data,offeredSubjects:['Optional Computer Science','Robotics']
});
assert.deepEqual(extra.unknownSchoolSubjects,['Robotics'],
 'School subjects not yet in CDC source index must remain blockers');
assert.equal(extra.grade9PaperReady,false);
const forged=auditGrade9Release({register:data,offeredSubjects:[],
 exactGridReviews:{nepali:true,english:true,math:true,science:true,social:true},
 reviewedBanks:{nepali:true,english:true,math:true,science:true,social:true},
 teacherTestedPapers:{nepali:true,english:true,math:true,science:true,social:true}
});
assert.equal(forged.grade9PaperReady,true,'Fully reviewed, approved subject subset passes prerequisite audit');
assert.equal(forged.readyForLive,false,'Grade9 subject prereq never grants live deployment itself');
assert.throws(()=>auditGrade9Release({}),/Official CDC source register required/);
console.log('PASS Grade9 source, unit-grid, question review and teacher-test release gate');
console.log('Mandatory subjects 5, V46 optional streams 3, live gate stays closed without release workflow');
