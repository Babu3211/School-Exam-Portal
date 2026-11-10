import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {iemisLegacyTheory,iemisGrade,iemisFinalGrade,iemisSubjectKey,iemisSubjects,iemisSummary,iemisGpa,iemisLedger,iemisDisplaySubject} from '../iemis-ledger.js';

// Synthetic identities only. Academic vectors reproduce the verified IEMIS examples.
const subjects=['Computer Science','Nepali','English','Mathematics','Science & Technology','Social Studies & Human Value Education','Health Physical & Creative Art','Hamro Dhunibeshi'];
const credits=[4,5,5,5,5,5,3,4];
const inMarks=[41,41,42,44,41,42,44,43],thMarks=[30,28,29,18,23,23,33,27];
const records=subjects.map((subject,i)=>({studentId:'synthetic-1',examId:'synthetic-exam',subject,scores:[{name:'Internal',fullMarks:50,obtained:inMarks[i]},{name:'TH (Theory)',fullMarks:50,obtained:thMarks[i]}]}));
const snapshots=structuredClone(records);
const parts=records.map((r,i)=>({summary:iemisSummary(r,{annual:true}),creditHour:credits[i]}));
assert.equal(iemisGpa(parts,{annual:true}).toFixed(2),'2.93');
const wrongFinalGradeAverage=parts.reduce((sum,x)=>sum+x.creditHour*x.summary.totalGrade.point,0)/36;
assert.equal(wrongFinalGradeAverage.toFixed(2),'3.03');
// Secondary component-credit example shown by IEMIS (5/5/5/5/4/4/4 credits).
const secondary=[[3.75,2,1.25,3.6],[3.75,3.2,1.25,3.2],[3.75,1.6,1.25,3.6],[3.75,1.6,1.25,3.6],[3,2.4,1,3.6],[3,2,1,3.6],[2,1.6,2,4]].map(([th,tgp,inn,igp])=>({creditHour:th+inn,summary:{complete:true,full:th+inn,theoryFull:th,inFull:inn,theoryGrade:{point:tgp},inGrade:{point:igp}}}));
assert.equal(iemisGpa(secondary,{annual:true}).toFixed(2),'2.52');
assert.equal(iemisGpa(parts,{annual:false}),null,'Non-final GPA must not invent TH results');
assert.equal(iemisGpa([{...parts[0],creditHour:undefined}],{annual:true}),null);
assert.equal(iemisSummary({...records[0],scores:[{name:'IN',fullMarks:50,obtained:''},{name:'TH',fullMarks:50,obtained:30}]},{annual:true}).complete,false);
assert.equal(iemisSummary({...records[0],scores:[{name:'IN',fullMarks:50,obtained:0},{name:'TH',fullMarks:50,obtained:30}]},{annual:true}).inObtained,0,'A saved zero must survive');
assert.equal(iemisSummary({...records[0],scores:[{name:'IN',fullMarks:50,obtained:51}]},{annual:false}).complete,false);
for(const [n,expected] of [[0,'NG'],[34.99,'NG'],[35,'D'],[40,'C'],[50,'C+'],[60,'B'],[70,'B+'],[80,'A'],[90,'A+'],[100,'A+']])assert.equal(iemisGrade(n).grade,expected);
assert.equal(iemisGrade(101),null);
for(const [point,grade] of [[0,'NG'],[1.6,'D'],[2,'C'],[2.1,'C+'],[2.4,'C+'],[2.4001,'B'],[3,'B+'],[3.2,'B+'],[3.6,'A'],[3.7,'A+']])assert.equal(iemisFinalGrade(point).grade,grade);
assert.deepEqual(parts.map(x=>x.summary.totalGrade.grade),['B+','B+','B+','B','B','B','B+','B+']);
assert.equal(iemisSubjectKey('Math'),iemisSubjectKey('Mathematics'));
assert.equal(iemisDisplaySubject('OPT.II COMPUTER SCIENCE (3031)'),'Optional II: COMPUTER SCIENCE');assert.equal(iemisDisplaySubject('OPT.I ENVIRONMENT SCIENCE (2041)'),'Optional I: Environmental Science');
assert.equal(iemisDisplaySubject('Math'),'Mathematics');assert.equal(iemisDisplaySubject('Mathematics',{codes:true}),'COMP. MATHEMATICS (1031)');assert.equal(iemisDisplaySubject('COMP. NEPALI (1021)'),'Nepali');
assert.equal(iemisSubjectKey('COMP. NEPALI (1021)'),iemisSubjectKey('Nepali'));
// New grade IV/V learning-achievement sheets follow the grade I-III subject sequence.
for(const mode of ['number','grade','sheet'])for(const cl of [4,5]){
 assert.deepEqual(iemisSubjects(subjects,mode,cl),iemisSubjects(subjects,mode,1),`Class ${cl} must use primary subject order for ${mode}`);
}
const markOrder=iemisSubjects(subjects,'number',6);
assert.equal(markOrder[0],'Hamro Dhunibeshi');assert.equal(markOrder.at(-1),'Computer Science');
assert.equal(iemisSubjects(subjects,'grade',6)[0],'Nepali');
assert.equal(iemisSubjects(subjects,'sheet',6)[0],'Computer Science');
const common={classNo:6,annual:true,subjects,students:[{id:'synthetic-1',studentName:'Test <Student>',dob:'2070-01-01',fatherName:'Test Father',motherName:'Test Mother',symbolNo:'TEST01',studentIemisNo:'TESTREG'}],records,examId:'synthetic-exam',schoolName:'Test School',schoolCode:'TEST',creditFor:s=>credits[subjects.indexOf(s)]};
const mark=iemisLedger({...common,mode:'number'}),grade=iemisLedger({...common,mode:'grade'});
assert.match(mark.head,/School Name/);assert.match(mark.head,/Symbol Number/);
assert.match(mark.head,/<th>IN<\/th><th>TH<\/th>/);
assert.match(grade.head,/<th>IN<\/th><th>TH<\/th><th>Total<\/th>/);
assert.match(grade.head,/Dob/);assert.match(grade.head,/Father Name/);assert.match(grade.head,/Mother Name/);
assert.match(grade.body,/>2.93<\/td>/);
assert.match(grade.body,/Test &lt;Student&gt;/);assert.doesNotMatch(grade.body,/<Student>/);
const first=iemisLedger({...common,annual:false,mode:'number'});
assert.doesNotMatch(first.head,/<th>TH<\/th>/);
const entry=iemisLedger({...common,mode:'entry',componentsFor:()=>[{name:'Internal'},{name:'TH (Theory)'}]});
assert.match(entry.head,/Regd\. No\./);assert.match(entry.body,/TESTREG/);
assert.deepEqual(records,snapshots,'Read-only renderer must not mutate marks');
const html=readFileSync('index.html','utf8');
assert.match(html,/id="iemisLedgerFormat" checked/);assert.match(html,/id="entryLedgerTab"/);
assert.match(readFileSync('sw.js','utf8'),/\.\/iemis-ledger\.js/);
// Exercise the actual Grade Sheet renderer, rather than just its math helper.
const start=html.indexOf('function showGradeSheet(studentId)');
const end=html.indexOf("document.addEventListener('click',e=>{if(e.target.closest('#loadResultsBtn'))",start);
const box={innerHTML:''};
const student=common.students[0];student.class='6';
const perSubject=parts.map((x,i)=>({subject:subjects[i],missing:false,totalFull:100,pct:x.summary.obtained,grade:x.summary.totalGrade}));
const dependencies={iemisLegacyTheory,activeResultRows:[{student,perSubject}],document:{getElementById:id=>id==='gradeSheetView'?box:{value:'synthetic-exam'}},resultExams:[{id:'synthetic-exam',academicYear:'2082'}],resultMarks:records,resultClasses:subjects.map((subject,i)=>({className:'6',subject,creditHour:credits[i],active:true})),currentSchoolSettings:{schoolName:'Test School',iemisCode:'TEST'},englishDisplayText:String,classNoFromName:String,onlineResultDigits:String,smssTermLabelEnglish:()=> 'Final Term',smssExamTermKey:()=> 'annual',canonicalStudentClass:String,canonicalSubjectKey:iemisSubjectKey,studentOptionalSelectionComplete:()=>true,isComputerSubject:s=>/computer/i.test(s),resultEsc:s=>String(s??''),subjectEnglishLabel:String,schoolPrintName:()=> 'Test School',schoolPrintAddress:()=> 'Test Address',schoolLogoPrintMarkup:()=> '',gradeForPercent:iemisGrade,resultGradeBands:[],iemisSubjectKey,iemisSubjects,iemisSummary,iemisGpa,iemisDisplaySubject};
new Function(...Object.keys(dependencies),html.slice(start,end)+';showGradeSheet("synthetic-1");')(...Object.values(dependencies));
assert.match(box.innerHTML,/<td colspan="4"[^>]*>GRADE POINT AVERAGE = 2.93/);
assert.ok(box.innerHTML.indexOf('ONE CREDIT HOUR EQUALS 36')<box.innerHTML.indexOf('DETAILS OF GRADE SHEET'));
assert.match(box.innerHTML,/COMPUTER SCIENCE\(TH\)<br>COMPUTER SCIENCE\(IN\)/);
assert.ok(box.innerHTML.indexOf('COMPUTER SCIENCE(TH)')<box.innerHTML.indexOf('NEPALI(TH)'));
console.log('IEMIS ledger, subject order, component-weighted GPA, identity, escaping and actual Grade Sheet tests passed.');

// Historical Classes IV/V retain TH/IN; new achievement records stay primary.
const legacyIn=[42.5,47.5,42.5,42.5,42.5,47.5,42.5,47.5],legacyTh=[22.5,47.5,32.5,27.5,22.5,42.5,37.5,37.5];
const legacyRecords=records.map((r,i)=>({...r,assessmentType:'marks',scores:[{name:'Internal',fullMarks:50,obtained:legacyIn[i]},{name:'TH (Theory)',fullMarks:50,obtained:legacyTh[i]}]}));
const legacyParts=legacyRecords.map((r,i)=>({summary:iemisSummary(r,{annual:true}),creditHour:credits[i]}));
assert.equal(iemisGpa(legacyParts,{annual:true}).toFixed(2),'3.33');
assert.equal(iemisLegacyTheory(5,legacyRecords,{examId:'synthetic-exam'}),true);
assert.equal(iemisLegacyTheory(5,legacyRecords,{examId:'other-exam'}),false);
assert.equal(iemisLegacyTheory(5,legacyRecords.map(r=>({...r,assessmentType:'learning-achievement'}))),false);
for(const classNo of [4,5]){
 const st={...student,class:String(classNo)};
 const d={...dependencies,resultMarks:legacyRecords,resultClasses:dependencies.resultClasses.map(x=>({...x,className:String(classNo)})),activeResultRows:[{student:st,perSubject:legacyRecords.map(r=>{const v=iemisSummary(r,{annual:true});return {subject:r.subject,missing:false,totalFull:100,pct:v.obtained,grade:v.totalGrade};})}]};
 new Function(...Object.keys(d),html.slice(start,end)+';showGradeSheet("synthetic-1");')(...Object.values(d));
 assert.match(box.innerHTML,/GRADE POINT AVERAGE = 3.33/);
 assert.match(box.innerHTML,/NEPALI\(TH\)<br>NEPALI\(IN\)/);
 const legacyLedger=iemisLedger({...common,classNo,records:legacyRecords,mode:'grade'});
 assert.match(legacyLedger.body,/>3.33<\/td>/);
 assert.doesNotMatch(legacyLedger.head,/<th>IN<\/th>/,'Historical upper-primary IEMIS ledger has one grade column per subject');
}
assert.equal(iemisSubjects(subjects,'sheet',4,{legacyTheory:true})[0],'Nepali');
assert.equal(iemisSubjects(subjects,'sheet',4,{legacyTheory:true})[1],'Computer Science');
assert.equal(iemisSubjects(subjects,'sheet',5,{legacyTheory:true})[0],'Computer Science');
assert.equal(iemisSubjects(subjects,'grade',4,{legacyTheory:true})[0],'Computer Science');
console.log('Historical IV/V TH/IN and GPA 3.33 passed without changing new I–V entry schemas.');
const newPrimaryRecords=records.map(r=>({...r,assessmentType:'learning-achievement',scores:[{name:'No. of Learning Achievement',fullMarks:25,obtained:25},{name:'Full Marks',fullMarks:100,obtained:null},{name:'Obtained Learning Achievement',fullMarks:100,obtained:95}]}));
const currentPrimary={...dependencies,resultMarks:newPrimaryRecords,resultClasses:dependencies.resultClasses.map(x=>({...x,className:'5'})),activeResultRows:[{student:{...student,class:'5'},perSubject:newPrimaryRecords.map(r=>({subject:r.subject,missing:false,totalFull:100,pct:95,grade:iemisGrade(95)}))}]};
new Function(...Object.keys(currentPrimary),html.slice(start,end)+';showGradeSheet("synthetic-1");')(...Object.values(currentPrimary));
assert.match(box.innerHTML,/GRADE POINT AVERAGE \(GPA\): 4.00/);
assert.doesNotMatch(box.innerHTML,/NEPALI\(TH\)/);
const mixedNewStudent={...common.students[0],id:'new-primary'};
const mixedRecords=legacyRecords.concat(newPrimaryRecords.map(r=>({...r,studentId:'new-primary'})));
const mixedLedger=iemisLedger({...common,classNo:5,mode:'grade',records:mixedRecords,students:[mixedNewStudent]});
assert.match(mixedLedger.body,/>4.00<\/td>/,'An old cohort must not force new achievement records into TH/IN calculations');
console.log('New Class V achievement Grade Sheet and mixed-cohort isolation passed.');


// Populated IEMIS 2083 Class I First/Final reference; synthetic identity only.
const primarySubjects=['Nepali','English','Mathematics','Serophero','Hamro Dhunibeshi'];
const annualCredits=[5,4,4,8,5], achievementMarks=[10,9,8,11,10];
for(const [year,term,expectedCredits,hours] of [
 ['2083','first',[2.5,2,2,4,2.5],26],
 ['2083','annual',annualCredits,26],
 ['2082','first',annualCredits,30],
 ['2083','second',[2.5,2,2,4,2.5],26],
 ['2083','third',annualCredits,30]
]){
 const config=primarySubjects.map((subject,i)=>({className:'1',subject,creditHour:annualCredits[i],active:true}));
 const before=structuredClone(config);
 const fixture={...dependencies,smssExamTermKey:()=>term,resultExams:[{id:'synthetic-exam',academicYear:year}],resultClasses:config,resultMarks:[],
  activeResultRows:[{student:{...student,class:'1'},perSubject:primarySubjects.map((subject,i)=>({subject,missing:false,pct:achievementMarks[i]/12*100,grade:iemisGrade(achievementMarks[i]/12*100)}))}]};
 new Function(...Object.keys(fixture),html.slice(start,end)+';showGradeSheet("synthetic-1");')(...Object.values(fixture));
 const firstTable=box.innerHTML.match(/<table[^>]*>[\s\S]*?<\/table>/)[0];
 const rows=[...firstTable.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].slice(1,6);
 const shown=rows.map(row=>Number([...row[1].matchAll(/<td[^>]*>([^<]*)<\/td>/g)][1][1]));
 assert.deepEqual(shown,expectedCredits);
 assert.match(box.innerHTML,/GRADE POINT AVERAGE \(GPA\): 3.54/);
 assert.ok(box.innerHTML.includes('ONE CREDIT HOUR EQUALS '+hours+' HOURS.'));
 assert.deepEqual(config,before,'Report rendering must not change stored credits');
}
console.log('Class I 2083 First/Final credits, GPA 3.54, footnote and historical/unverified-term isolation passed.');
