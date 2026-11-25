import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cdcSubjectKey,findCdcGridSources,grade9RequiredPaperLanguage} from '../cdc-grid-source-index.mjs';
const register=JSON.parse(readFileSync(new URL(
 '../data/cdc-question-paper-sources-2083.json',import.meta.url),'utf8'));
const examples=[
 [6,'Social Studies and Human Values','social'],
 [6,'सामाजिक अध्ययन तथा मानव मूल्य शिक्षा','social'],
 [7,'गणित','math'],
 [8,'Science and Technology','science'],
 [8,'अङ्ग्रेजी','english'],
 [9,'Compulsory Mathematics','math'],
 [9,'अनिवार्य नेपाली','nepali'],
 [9,'Optional Mathematics','optional_math'],
 [9,'ऐच्छिक गणित','optional_math'],
 [9,'ऐच्छिक कम्प्युटर विज्ञान','optional_computer'],
 [10,'Optional Computer Science','optional_computer'],
 [10,'ऐच्छिक अर्थशास्त्र','optional_economics'],

];
for(const [grade,subject,key] of examples){
 assert.equal(cdcSubjectKey(subject),key,subject+' maps to CDC subject');
 const sources=findCdcGridSources(register,grade,subject);
 assert.ok(sources.length,'No registered official CDC grid source for '+grade+' '+subject);
 assert.ok(sources.every(x=>x.grade===grade&&x.subjectKey===key&&
  x.sourceOnly===true&&x.verifiedGridRows===false),
  'Source reference must not claim a transcribed/approved Grid');
 assert.equal(new Set(sources.map(x=>x.sourceUrl)).size,sources.length);
 assert.ok(sources.every(x=>/^https:\/\/(?:www\.|lib\.)?moecdc\.gov\.np\/|^https:\/\/giwmscdnone\.gov\.np\//i.test(x.sourceUrl)));
}
assert.equal(cdcSubjectKey('Health and Physical Education'),'health');
for(const s of ['Optional I: Environmental Science','ऐच्छिक प्रथम: वातावरण विज्ञान']){
 assert.equal(cdcSubjectKey(s),'optional_environment');
 assert.ok(findCdcGridSources(register,9,s).every(x=>x.subjectKey==='optional_environment'),'No compulsory Science grid reuse');
}
assert.equal(cdcSubjectKey('Optional I: Additional Mathematics'),'optional_math');
assert.equal(cdcSubjectKey('ऐच्छिक प्रथम: अतिरिक्त गणित'),'optional_math');
assert.deepEqual(findCdcGridSources(register,10,'Health and Physical Education'),[],
 'The official health curriculum is NOT a specification Grid; do not label it as such');
for(const grade of [9,10]){
 const computer=findCdcGridSources(register,grade,'Optional Computer Science');
 assert.ok(computer.some(x=>x.sourceUrl.startsWith('https://giwmscdnone.gov.np/')),
  'Must include official government CDC PDF CDN for computer');
 assert.ok(!computer.some(x=>x.title.includes('ऐच्छिक गणित')));
 const math=findCdcGridSources(register,grade,'Optional Mathematics');
 assert.ok(math.some(x=>x.sourceUrl.includes('Opt.%20Math')),
  'Official optional Math source must be found');
 assert.ok(!math.some(x=>/Computer|कम्प्युटर/.test(x.title)));
 assert.ok(!findCdcGridSources(register,grade,'Mathematics').some(
  x=>/ऐच्छिक गणित|Optional Mathematics/.test(x.title)),
  'Compulsory maths must never inherit optional maths grid');
}
for(const grade of [6,7,8]){
 assert.equal(findCdcGridSources(register,grade,'Optional Computer Science').length,0,
  'Do not reuse Grade 9/10 Computer Science grid in lower grades');
}
assert.deepEqual(findCdcGridSources(register,11,'Science and Technology'),[]);
assert.deepEqual(findCdcGridSources(register,8,''),[]);
assert.deepEqual(findCdcGridSources({},8,'Science'),[]);
const fake={sources:[
 {grades:[8],subject:'विज्ञान तथा प्रविधि',kind:'specification_grid',
  url:'https://unsafe.example/cdc-grid',version:'2083',status:'official_current'},
 {grades:[8],subject:'विज्ञान तथा प्रविधि',kind:'curriculum',
  url:'https://moecdc.gov.np/content/284/',status:'official'},
 {grades:[8],subject:'विज्ञान तथा प्रविधि',kind:'specification_grid',
  url:'https://moecdc.gov.np/content/284/',version:'2082',status:'official'}
]};
const found=findCdcGridSources(fake,8,'Science and Technology');
assert.deepEqual(found.map(x=>x.sourceUrl),['https://moecdc.gov.np/content/284/']);
console.log('PASS CDC source index for grades 6-10, Nepali and English subject aliases,');
console.log('official PDF CDN accepted, no class/optional subject leaks, no fake approved grids');

const retrieved=register.sources.filter(s=>s.retrievalEvidence?.runId===45387109761);
assert.equal(retrieved.length,5);
assert.deepEqual(retrieved.map(s=>s.retrievalEvidence.resource).sort(),['11166','11167','11168','11169','11170']);
for(const s of retrieved){
 const e=s.retrievalEvidence;
 assert.match(e.sha256,/^[a-f0-9]{64}$/);
 assert.ok(e.pages>0&&e.byteCount>0);
 assert.equal(e.currentCdcExactApproved,false);
 assert.equal(e.verifiedGridRows,false);
 assert.ok(findCdcGridSources(register,9,s.subject).some(x=>x.sourceUrl===s.url&&x.sourceOnly&&!x.verifiedGridRows));
}
console.log('PASS five full government PDF retrieval fingerprints; source evidence only, no automatic approval');

assert.equal(cdcSubjectKey('Computer Science'),'optional_computer');
for(const subject of ['Nepali','नेपाली','Social Studies','सामाजिक अध्ययन','हाम्रो सेरोफेरो'])assert.equal(grade9RequiredPaperLanguage(9,subject),'ne');
for(const subject of ['Mathematics','Science and Technology','Optional Mathematics','Computer Science','Environmental Science','Economics'])assert.equal(grade9RequiredPaperLanguage(9,subject),'both');
assert.equal(grade9RequiredPaperLanguage(9,'English'),'en');
assert.equal(grade9RequiredPaperLanguage(10,'Social Studies'),null);
assert.equal(grade9RequiredPaperLanguage(9,''),null);
console.log('PASS Grade 9 school language policy and existing grades preserved');

const {grade9GridLibrary}=await import('../cdc-grade9-grid-library.mjs');
const library=grade9GridLibrary(register);
assert.equal(library.length,11);
assert.ok(library.every(x=>!x.currentCdcExactApproved&&!x.readyForLive));
const byKey=Object.fromEntries(library.map(x=>[x.key,x]));
assert.equal(byKey.optional_math.tables[1].rows.length,6);
assert.equal(byKey.optional_math.tables[1].rows.reduce((n,r)=>n+r[4],0),75);
assert.equal(byKey.optional_computer.tables[0].rows.reduce((n,r)=>n+r[5],0),50);
assert.equal(byKey.nepali.tables[0].rows.reduce((n,r)=>n+r[1],0),75);
assert.equal(byKey.optional_environment.sources.every(s=>s.kind==='curriculum'),true);
const envCrosswalk=register.sources.find(s=>s.environmentTextbookCrosswalk).environmentTextbookCrosswalk;
assert.equal(envCrosswalk.chapters.length,9);
assert.deepEqual(envCrosswalk.chapters.map(c=>c[1]),[1,15,32,68,94,110,135,149,184]);
assert.equal(envCrosswalk.schoolAreas.length,10);
assert.deepEqual(envCrosswalk.candidateChapters[5],[3,6]);
assert.ok(envCrosswalk.candidateChapters.flat().every(n=>Number.isInteger(n)&&n>=1&&n<=9));
assert.equal(envCrosswalk.contentsVisuallyChecked,true);
assert.equal(envCrosswalk.mappingVerified,false);
assert.equal(envCrosswalk.completeUnitMatrixVerified,false);
assert.equal(envCrosswalk.officialExamApproved,false);
assert.equal(envCrosswalk.currentCdcExactApproved,false);
assert.ok(byKey.optional_environment.tables.some(t=>t.title==='CDC textbook contents (not examination marks)'&&t.rows.length===9));
assert.ok(byKey.optional_environment.tables.some(t=>t.title.includes('tentative topic alignment only')&&t.rows.length===10));
assert.equal(byKey.optional_environment.currentCdcExactApproved,false);
assert.equal(byKey.optional_environment.readyForLive,false);

assert.equal(byKey.optional_economics.tables.length,6);
assert.ok(library.every(x=>x.sources.every(s=>!s.url.includes('unsafe.example'))));
const healthSource=register.sources.find(s=>s.healthCurriculumReview);
const healthReview=healthSource.healthCurriculumReview;
assert.equal(healthSource.kind,'curriculum');
assert.equal(healthReview.units.length,9);
assert.equal(healthReview.units.reduce((n,r)=>n+r[2]+r[3],0),128);
assert.equal(healthReview.units.reduce((n,r)=>n+r[2],0),64);
assert.equal(healthReview.internalComponents.reduce((n,r)=>n+r[1],0),50);
assert.equal(healthReview.practicalRubric.reduce((n,r)=>n+r[1],0),40);
assert.deepEqual(healthReview.externalAreas.map(r=>r[2]),[40,10]);
assert.equal(healthReview.externalAreas.reduce((n,r)=>n+r[2],0),50);
assert.equal(healthReview.officialExamApproved,false);assert.equal(healthReview.currentCdcExactApproved,false);
assert.equal(byKey.health.fullMarks,50);assert.equal(byKey.health.durationMinutes,null);assert.equal(byKey.health.currentCdcExactApproved,false);assert.equal(byKey.health.readyForLive,false);
assert.ok(byKey.health.sources.every(s=>s.kind==='curriculum'));
assert.ok(byKey.health.tables.some(t=>t.title==='Curriculum working hours (not marks)'&&t.rows.length===9));
assert.ok(grade9GridLibrary({sources:[{grades:[9],subject:'Nepali',kind:'specification_grid',url:'https://unsafe.example/grid'}]}).every(x=>x.sources.length===0));
const portal=readFileSync(new URL('../cdc-question-paper.js',import.meta.url),'utf8');
assert.match(portal,/id="qpGrade9GridLibrary"/);
assert.match(portal,/renderGrade9GridLibrary\(\$\("qpGrade9GridLibraryContent"\),cdcSourceRegister,\[\.\.\.new Set\(classSubjects\.filter\(x=>x\.gradeNumber===9\)\.map\(x=>x\.subject\)\)\]\)/);
console.log('PASS read-only Class 9 Grid Library, all 8 school subjects plus 3 catalog subjects, no invented approval');

const findTable=(key,title)=>byKey[key].tables.find(t=>t.title===title);
const scienceMatrix=findTable('science','Historical question count by cognitive level');
assert.equal(scienceMatrix.rows.length,4);
assert.deepEqual(scienceMatrix.rows.map(r=>r[5]),[10,9,14,7]);
assert.equal(scienceMatrix.rows.reduce((n,r)=>n+r[7],0),75);
assert.deepEqual([1,2,3,4].map(i=>scienceMatrix.rows.reduce((n,r)=>n+r[i]*r[6],0)),[12,22,22,19]);
const grammar=findTable('english','Historical grammar detail');
assert.deepEqual(grammar.rows.map(r=>r[3]),[6,5]);
assert.deepEqual(findTable('math','Historical question structure').rows,[[16,49,75]]);
assert.ok(['science','english','math'].every(key=>!byKey[key].currentCdcExactApproved));
console.log('PASS complete available science cognitive matrix, English grammar detail and mathematics historical question counts');

const optionalFingerprints=register.sources.filter(s=>s.optionalRetrievalEvidence);
assert.equal(optionalFingerprints.length,3);
assert.deepEqual(optionalFingerprints.map(s=>s.optionalRetrievalEvidence.resource).sort(),['optional-computer','optional-economics','optional-math']);
for(const s of optionalFingerprints){const e=s.optionalRetrievalEvidence;assert.match(e.sha256,/^[a-f0-9]{64}$/);assert.ok(e.pages>0&&e.byteCount>0&&e.firstPageRendered);assert.equal(e.currentCdcExactApproved,false);assert.equal(e.verifiedGridRows,false);assert.ok(s.grades.includes(9));}
console.log('PASS optional source fingerprints; no automatic approval');

const mathTextSource=register.sources.find(s=>s.optionalRetrievalEvidence?.resource==='optional-math');
const mathText=mathTextSource.structuralTextReview;
const {getCdcOptionalMathGuide:readMathSourceGuide}=await import('../cdc-optional-math-2082.mjs');
const mathTextGuide=readMathSourceGuide({grade:9,subject:'Optional Mathematics'});
assert.equal(mathText.sha256,mathTextSource.optionalRetrievalEvidence.sha256);
assert.equal(mathTextGuide.fullMarks,mathText.fullMarks);
assert.equal(mathTextGuide.areas.reduce((n,a)=>n+a.workHours,0),mathText.workingHours);
assert.deepEqual(mathTextGuide.questionGroups.map(g=>g.totalMarks),mathText.groupMarks);
assert.deepEqual(['knowledge','understanding','application','higher'].map(k=>mathTextGuide.cognitiveDistribution[k]),mathText.cognitivePercent);
for(const e of mathText.readableAreaHours){const area=mathTextGuide.areas.find(a=>a.unitCode===e.unitCode);assert.equal(area.workHours,e.hours);if(e.totalMarks!==undefined)assert.equal(area.totalMarks,e.totalMarks);}
assert.equal(mathText.visualCellReviewComplete,true);
assert.equal(mathText.officialExamApproved,false);
console.log('PASS optional mathematics original PDF extracted totals cross-check; current edition approval pending');

// Cross-check the actual reference paper planners, not just the display tables,
// against independently recorded government PDF extraction evidence.
const evidenceFor=resource=>{
 const source=register.sources.find(s=>s.retrievalEvidence?.resource===resource);
 assert.ok(source?.retrievalEvidence?.numericReferenceCrosscheck);
 assert.equal(source.retrievalEvidence.currentCdcExactApproved,false);
 return source.retrievalEvidence.numericReferenceCrosscheck;
};
const {getScience2078Reference}=await import('../cdc-grade9-science-reference-planner.mjs');
const {getGrade9MathReference}=await import('../cdc-grade9-compulsory-math-grouped.mjs');
const {auditEnglishChart}=await import('../cdc-grade9-english-practice.mjs');
const {getSocial2078Reference}=await import('../cdc-grade9-social-reference-planner.mjs');
const scienceEvidence=evidenceFor('11167');
const scienceRef=getScience2078Reference({grade:9,subject:'Science and Technology'});
assert.equal(scienceRef.fullMarks,scienceEvidence.fullMarks);
assert.deepEqual(scienceRef.units.map(u=>u.marks),scienceEvidence.unitMarks);
assert.deepEqual(scienceRef.groups.map(g=>g.count),scienceEvidence.questionCounts);
assert.deepEqual(scienceRef.groups.map(g=>g.marksEach),scienceEvidence.marksEach);
assert.deepEqual(scienceRef.groups.map(g=>g.levelCounts),scienceEvidence.typeLevelCounts);
assert.deepEqual(scienceRef.cognitiveMarks,scienceEvidence.cognitiveMarks);
const mathEvidence=evidenceFor('11170');
const mathRef=getGrade9MathReference({grade:9,subject:'Mathematics'});
assert.equal(mathRef.fullMarks,mathEvidence.fullMarks);
assert.equal(mathRef.groupCount,mathEvidence.groupCount);
assert.equal(mathRef.itemCount,mathEvidence.subitemCount);
assert.deepEqual(mathRef.areas.map(a=>a.marks),mathEvidence.unitMarks);
assert.deepEqual(mathRef.cognitiveMarks,mathEvidence.cognitiveMarks);
const englishEvidence=evidenceFor('11169');
const englishRef=auditEnglishChart({grade:9,subject:'English'});
assert.equal(englishRef.fullMarks,englishEvidence.fullMarks);
assert.deepEqual(englishRef.reading.map(x=>x.marks),englishEvidence.readingMarks);
assert.deepEqual(englishRef.writing.map(x=>x.marks),englishEvidence.writingMarks);
assert.deepEqual(englishRef.grammar.map(x=>[x.count,x.marksEach]),[[englishEvidence.grammar.transformationCount,englishEvidence.grammar.transformationMarksEach],[englishEvidence.grammar.contextualMcqCount,englishEvidence.grammar.contextualMcqMarksEach]]);
const englishVisual=register.sources.find(s=>s.retrievalEvidence?.resource==='11169').retrievalEvidence.primaryVisualReview;
assert.equal(englishVisual.chartVisualReviewComplete,true);
assert.deepEqual(englishVisual.reading,englishRef.reading);
assert.deepEqual(englishVisual.writing.map(({marks,words})=>({marks,words})),englishRef.writing);
assert.deepEqual({...englishVisual.comprehensionCounts,vocabulary:englishVisual.vocabularyItemsDerived},englishRef.comprehensionCounts);
assert.equal(Object.values(englishVisual.comprehensionCounts).reduce((n,v)=>n+v,0)+englishVisual.vocabularyItemsDerived,40);
assert.deepEqual(englishVisual.grammar,englishRef.grammar);
assert.equal(englishVisual.grammarAreas.length,14);
assert.equal(englishVisual.mcqChoices,4);assert.equal(englishVisual.vocabularyOnlyReading,4);
assert.equal(englishVisual.durationMinutes,180);assert.equal(englishVisual.modelGrade,10);
assert.equal(englishVisual.grade9ModelVerified,false);assert.equal(englishVisual.currentEditionConfirmed,false);assert.equal(englishVisual.officialExamApproved,false);assert.equal(englishVisual.currentCdcExactApproved,false);
assert.ok(byKey.english.tables.some(t=>t.title==='Original CDC reading chart'&&t.rows.length===4));
const socialEvidence=evidenceFor('11166');
const socialRef=getSocial2078Reference({grade:9,subject:'Social Studies'});
assert.equal(socialRef.fullMarks,socialEvidence.fullMarks);
assert.deepEqual(socialRef.unitMarks,socialEvidence.unitMarks);
const socialTypes=['very_short','short','long'];
assert.deepEqual(socialTypes.map(type=>socialRef.slots.filter(s=>s.type===type).length),socialEvidence.questionCounts);
assert.deepEqual(socialRef.unitMarks.map((_,i)=>socialTypes.map(type=>socialRef.slots.filter(s=>s.historicUnit===i+1&&s.type===type).reduce((n,s)=>n+s.marks,0))),socialEvidence.unitTypeMarks);
const sv=socialEvidence.cognitiveMatrixTextReview;
assert.equal(sv.sha256,register.sources.find(s=>s.retrievalEvidence?.resource==='11166').retrievalEvidence.sha256);
assert.equal(sv.unitTypeCategoryCounts.length,10);
assert.deepEqual(sv.unitTypeCategoryCounts,socialRef.unitMarks.map((_,i)=>socialTypes.flatMap(type=>[0,1,2].map(c=>socialRef.slots.filter(s=>s.historicUnit===i+1&&s.type===type&&s.category===c).length))));
assert.deepEqual(sv.typeCategoryCounts,[[5,3,3],[4,2,3],[1,2,1]]);
assert.deepEqual(sv.cognitiveMarks,socialRef.cognitiveMarks);
assert.equal(sv.workingHours.reduce((n,v)=>n+v,0),128);
assert.equal(sv.primaryVisualReview.matchedUnitCountCells,90);
assert.equal(sv.primaryVisualReview.sha256,sv.sha256);
assert.equal(sv.primaryVisualReview.workingHours,128);
assert.equal(sv.primaryVisualReview.currentEditionConfirmed,false);
assert.equal(sv.primaryVisualReview.officialExamApproved,false);
assert.equal(sv.mirrorVisualReview.matchedUnitCountCells,90);
assert.equal(sv.mirrorVisualReview.totalWorkingHours,128);
assert.equal(sv.mirrorVisualReview.unit3Marks,8);
assert.equal(sv.mirrorVisualReview.byteEquivalenceEstablished,false);
assert.equal(sv.mirrorVisualReview.currentEditionConfirmed,false);
assert.equal(sv.mirrorVisualReview.officialExamApproved,false);
assert.ok(byKey.social.tables.some(t=>t.title==='प्रतिलिपिको चित्रबाट पुष्टि'));
assert.equal(sv.visualReviewComplete,false);assert.equal(sv.currentEditionConfirmed,false);assert.equal(sv.currentCdcExactApproved,false);assert.equal(sv.officialExamApproved,false);
assert.ok(byKey.social.tables.some(t=>t.title.includes('प्रश्न सङ्ख्या')&&t.rows.length===10));
assert.ok([scienceRef,mathRef,englishRef,socialRef].every(ref=>ref.currentCdcExactApproved===false));
console.log('PASS four compulsory reference planners against government PDF numeric extraction: historical comparison only, no current CDC approval');

// Test the actual original practice bank and revised Nepali planner against
// the few marks read from the original government PDF, not its historical fixture.
const {grade9NepaliReferenceBank,grade9NepaliPracticeSummaryDrafts}=await import('../cdc-grade9-nepali-reference-bank.mjs');
const {planNepaliRevisedMarksPractice}=await import('../cdc-grade9-nepali-grouped-planner.mjs');
const {referencePreviewTopics}=await import('../cdc-grade9-reference-preview.mjs');
const nepaliEvidence=evidenceFor('11168');
const nepaliSubject='Nepali';
const nepaliQuestions=[...grade9NepaliReferenceBank({grade:9,subject:nepaliSubject}).questions,...grade9NepaliPracticeSummaryDrafts({grade:9,subject:nepaliSubject})];
const nepaliTopics=referencePreviewTopics({grade:9,subject:nepaliSubject,questions:nepaliQuestions});
const nepaliRevised=planNepaliRevisedMarksPractice({grade:9,subject:nepaliSubject,questions:nepaliQuestions,selectedTopicIds:nepaliTopics,allowOriginalReferenceDraft:true,allowOriginalSummaryPractice:true,rng:()=>.39});
assert.equal(nepaliRevised.ready,true,nepaliRevised.reason);
const ng=nepaliRevised.paper.groups;
assert.equal(ng.reduce((n,g)=>n+g.marks,0),nepaliEvidence.fullMarks);
assert.equal(ng.find(g=>g.skill==='grammar_passage').marks,nepaliEvidence.extractedTaskMarks.languageStructureReading);
assert.equal(ng.find(g=>g.skill==='unseen_passage').marks,nepaliEvidence.extractedTaskMarks.unseenReading);
assert.deepEqual(ng.find(g=>g.skill==='notes_and_summary').choices[0].components.map(c=>c.marks),[nepaliEvidence.extractedTaskMarks.noteTaking,nepaliEvidence.extractedTaskMarks.summaryWriting]);
// Original archived government Grid pages now independently corroborate the totals.
const nepaliSource=register.sources.find(s=>s.retrievalEvidence?.resource==='11168');
const nepaliVisual=nepaliSource.retrievalEvidence.primaryVisualReview;
assert.equal(nepaliVisual.sha256,nepaliSource.retrievalEvidence.sha256);
assert.equal(nepaliVisual.sourceEdition,2080);assert.equal(nepaliVisual.tableGrade,10);assert.equal(nepaliVisual.appliesAsBasisToGrade,9);
assert.equal(nepaliVisual.taskRows.length,21);
assert.equal(nepaliVisual.taskRows.reduce((n,r)=>n+r[5],0),75);
assert.deepEqual(Array.from({length:12},(_,i)=>nepaliVisual.taskRows.filter(r=>r[0]===i+1).reduce((n,r)=>n+r[5],0)),nepaliEvidence.secondaryCorroboration.areaMarks);
assert.deepEqual(['K','U','A','HA'].map(k=>nepaliVisual.taskRows.filter(r=>r[2]===k).reduce((n,r)=>n+r[5],0)),[8,12,24,31]);
assert.deepEqual(Object.values(nepaliRevised.cognitiveMarks),nepaliVisual.cognitiveMarks);
assert.deepEqual(nepaliVisual.pages,[1,2,3,4,5]);
assert.equal(nepaliVisual.currentEditionConfirmed,false);assert.equal(nepaliVisual.grade9SpecificTaskAdaptationsReviewed,false);assert.equal(nepaliVisual.officialExamApproved,false);assert.equal(nepaliVisual.currentCdcExactApproved,false);
assert.ok(byKey.nepali.tables.some(t=>t.title.includes('परीक्षणीय पक्ष')&&t.rows.length===21));
assert.equal(nepaliRevised.currentCdcExactApproved,false);
assert.equal(nepaliRevised.readyForLive,false);
assert.equal(nepaliEvidence.visualCellReviewComplete,false);
console.log('PASS revised Nepali practice against four extracted official marks; cognitive comparison secondary only; authentic passages and exact current Grid remain unapproved');

const mathVisual=mathTextSource.structuralVisualReview;
assert.equal(mathVisual.sha256,mathTextSource.optionalRetrievalEvidence.sha256);
assert.equal(mathVisual.matchedCells,72);
assert.equal(mathVisual.expectedCells,72);
assert.deepEqual(mathTextGuide.areas.map(a=>['objective','WCA','CCA'].flatMap(g=>a.marksByGroup[g])),mathVisual.matrix);
assert.deepEqual(mathTextGuide.areas.map(a=>a.totalMarks),mathVisual.unitMarks);
assert.deepEqual(mathTextGuide.areas.map(a=>a.workHours),mathVisual.workingHours);
assert.deepEqual(mathTextGuide.areas.map(a=>a.wcaQuestionCount),mathVisual.wcaQuestionCounts);
assert.deepEqual(mathTextGuide.questionGroups.map(g=>g.questionCount),mathVisual.groupQuestionCounts);
assert.deepEqual(mathTextGuide.questionGroups.map(g=>g.totalMarks),mathVisual.groupMarks);
assert.equal(mathTextGuide.durationMinutes,mathVisual.durationMinutes);
assert.equal(mathVisual.visualCellReviewComplete,true);
assert.equal(mathVisual.currentEditionConfirmed,false);
assert.equal(mathVisual.teacherReviewComplete,false);
assert.equal(mathVisual.officialExamApproved,false);
console.log('PASS Grade 9 Optional Mathematics all 72 original 2082 CDC grid cells visually matched; no release approval');

const mathHistoricalVisual=register.sources.find(s=>s.retrievalEvidence?.resource==='11170').historicalVisualReview;
const scienceHistoricalVisual=register.sources.find(s=>s.retrievalEvidence?.resource==='11167').historicalVisualReview;
const crosscheckLevels=['knowledge','understanding','application','higher'];
assert.deepEqual(mathRef.areas.map(a=>crosscheckLevels.map(l=>a.itemsByLevel[l])),mathHistoricalVisual.itemCounts);
assert.deepEqual(mathRef.areas.map(a=>crosscheckLevels.map(l=>a.marksByLevel[l])),mathHistoricalVisual.levelMarks);
assert.deepEqual(mathRef.areas.map(a=>a.groups),mathHistoricalVisual.groupCounts);
assert.equal(mathHistoricalVisual.workingHours.reduce((n,x)=>n+x,0),160);
assert.deepEqual(scienceRef.units.map(u=>u.marks),scienceHistoricalVisual.unitMarks);
assert.deepEqual(scienceRef.contentGroups.map(g=>g.marks),scienceHistoricalVisual.contentGroupMarks);
assert.deepEqual(scienceRef.groups.map(g=>g.levelCounts),scienceHistoricalVisual.typeLevelCounts);
assert.deepEqual(scienceRef.cognitiveMarks,scienceHistoricalVisual.cognitiveMarks);
assert.equal(scienceHistoricalVisual.workingHours.reduce((n,x)=>n+x,0),160);
for(const e of [mathHistoricalVisual,scienceHistoricalVisual]){assert.equal(e.sourceYear,2078);assert.equal(e.currentEditionConfirmed,false);assert.equal(e.officialExamApproved,false);}
console.log('PASS historical visual source cross-check for compulsory math and science, no current grid approval');

// A ministry revision notice is proof of a change, not the revised numerical grid.
for(const id of ['11167','11170']){
 const source=register.sources.find(s=>s.retrievalEvidence?.resource===id);
 const notice=source.revisionNoticeEvidence;
 assert.equal(notice.effectiveSchoolYear,2082);
 assert.equal(notice.openEndedQuestionsReported,true);
 assert.equal(notice.revisedNumericalGridRetrieved,false);
 assert.equal(notice.currentGridApproved,false);
 assert.equal(source.retrievalEvidence.currentCdcExactApproved,false);
}
console.log('PASS ministry revision notice remains separate from exact Grid approval');

for(const key of ['math','science']){
 const item=byKey[key];
 assert.match(item.status,/revision effective 2082/);
 assert.deepEqual(findTable(key,'Ministry revision notice (not a specification Grid)').rows,[[2082,'Yes','No']]);
 assert.ok(item.sources.some(s=>s.kind==='revision_notice'&&s.url.includes('Educational%20information%20book')));
 assert.equal(item.currentCdcExactApproved,false);
}

const econSource=register.sources.find(s=>s.optionalRetrievalEvidence?.resource==='optional-economics');
const econ=econSource.economicsTextReview;
assert.equal(econ.sha256,econSource.optionalRetrievalEvidence.sha256);
assert.equal(econ.areas.reduce((n,r)=>n+r[1],0),75);
assert.equal(econ.questionCounts.reduce((n,v)=>n+v,0),22);
assert.deepEqual(econ.questionCounts.map((v,i)=>v*econ.marksEach[i]),[11,40,24]);
assert.deepEqual(econ.marksEach.map((_,i)=>econ.levelTypeCounts.reduce((n,r)=>n+r[i],0)),econ.questionCounts);
assert.deepEqual(econ.levelTypeCounts.map(row=>row.reduce((n,v,i)=>n+v*econ.marksEach[i],0)),[13,24,17,21]);
assert.deepEqual(econ.alternativeQuestionNumbers,[12,16,18,22]);
assert.equal(econ.extractedProseConflicts.length,3);
assert.equal(econ.completeUnitMatrixVerified,false);
assert.equal(econ.visualCellReviewComplete,false);
const econVisual=econSource.economicsVisualReview;
assert.equal(econVisual.sha256,econ.sha256);
assert.equal(econVisual.matchedCells,72);
assert.deepEqual(econVisual.workingHours,[12,30,12,8,15,19]);
assert.equal(econVisual.workingHours.reduce((n,v)=>n+v,0),96);
assert.equal(econVisual.unitLevelTypeCounts.length,6);
assert.ok(econVisual.unitLevelTypeCounts.every(r=>r.length===12&&r.every(v=>Number.isInteger(v)&&v>=0)));
assert.deepEqual(econVisual.unitLevelTypeCounts.map(r=>r.reduce((n,v,i)=>n+v*econ.marksEach[i%3],0)),econ.areas.map(r=>r[1]));
assert.deepEqual(econVisual.unitLevelTypeCounts[0],[2,0,0,1,1,0,1,0,0,0,0,0]);
assert.deepEqual(econVisual.unitLevelTypeCounts[0].map((_,i)=>econVisual.unitLevelTypeCounts.reduce((n,r)=>n+r[i],0)),econ.levelTypeCounts.flat());
assert.equal(econVisual.completeUnitMatrixVerified,true);
assert.equal(econVisual.fullDocumentVisualReviewComplete,false);
assert.equal(econVisual.officialExamApproved,false);
assert.equal(econVisual.currentCdcExactApproved,false);
assert.ok(byKey.optional_economics.tables.some(t=>t.title.includes('unit-wise question counts')&&t.rows.length===6));
assert.equal(econ.officialExamApproved,false);
assert.equal(byKey.optional_economics.currentCdcExactApproved,false);
assert.equal(byKey.optional_economics.readyForLive,false);
assert.equal(byKey.optional_economics.fullMarks,75);
assert.equal(byKey.optional_economics.durationMinutes,180);
console.log('PASS Economics 2082 text-based model/summary arithmetic, alternative choices, explicit source conflicts; no exact approval');

const acctSource=register.sources.find(s=>s.accountingRetrievalEvidence?.resource==='accounting');
const acct=acctSource.accountingTextReview;
assert.equal(acct.units.length,15);
assert.equal(acct.units.reduce((n,r)=>n+r[1],0),acct.workingHours);
assert.equal(acct.workingHours,96);
assert.equal(acct.questionCounts.reduce((n,v)=>n+v,0),22);
assert.deepEqual(acct.questionCounts.map((v,i)=>v*acct.marksEach[i]),[11,40,24]);
assert.equal(acct.questionCounts.reduce((n,v,i)=>n+v*acct.marksEach[i],0),75);
assert.deepEqual(acct.modelAlternativeQuestionNumbers,[17,19,22]);
assert.equal(acct.knowledgeMaxPercent,20);assert.equal(acct.higherAbilityMinPercent,20);
assert.equal(acct.completeUnitMatrixVerified,false);assert.equal(acct.visualCellReviewComplete,false);
assert.equal(acct.officialExamApproved,false);assert.equal(byKey.accounting.currentCdcExactApproved,false);
assert.equal(byKey.accounting.tables.length,6);assert.equal(byKey.accounting.fullMarks,75);assert.equal(byKey.accounting.durationMinutes,180);
assert.ok(byKey.accounting.sources.some(s=>s.url===acct.textSourceUrl));
const acctVisual=acctSource.accountingVisualReview;
assert.equal(acctVisual.sha256,acctSource.accountingRetrievalEvidence.sha256);
assert.deepEqual(acctVisual.unitGroups,[[1],[2,3],[4],[5,6],[7],[8,9],[10],[11],[12,13],[14],[15]]);
assert.ok(acctVisual.groupLevelTypeCounts.every(r=>r.length===12&&r.every(v=>Number.isInteger(v)&&v>=0)));
assert.deepEqual(acctVisual.groupLevelTypeCounts.map(r=>r.reduce((n,v,i)=>n+v*acct.marksEach[i%3],0)),[6,7,8,6,10,6,6,8,7,5,6]);
assert.deepEqual(acctVisual.groupLevelTypeCounts[0].map((_,i)=>acctVisual.groupLevelTypeCounts.reduce((n,r)=>n+r[i],0)),[4,2,0,5,2,1,1,2,1,1,2,1]);
assert.deepEqual(acctVisual.groupMarks,[6,7,8,6,10,6,6,8,7,5,6]);
assert.equal(acctVisual.groupMarks.reduce((n,v)=>n+v,0),75);
assert.equal(acctVisual.individualMergedUnitAllocationKnown,false);
assert.equal(acctVisual.officialExamApproved,false);
assert.equal(acctVisual.currentCdcExactApproved,false);
assert.equal(acctVisual.fullDocumentVisualReviewComplete,false);
assert.ok(byKey.accounting.tables.some(t=>t.title.includes('grouped question counts')&&t.rows.length===11));
console.log('PASS Accounting 2081 official PDF extracted topic hours, model structure, alternatives and review guards');

const schoolEnv=register.sources.find(s=>s.schoolSyllabus2080Evidence).schoolSyllabus2080Evidence;
assert.equal(schoolEnv.periods.reduce((n,v)=>n+v,0),128);
assert.equal(schoolEnv.questionCounts.reduce((n,v)=>n+v,0),22);
assert.equal(schoolEnv.questionCounts.reduce((n,v,j)=>n+v*schoolEnv.marksEach[j],0),75);
assert.equal(schoolEnv.alternativeRules.length,3);
assert.equal(schoolEnv.officialCdcSource,false);
assert.equal(schoolEnv.officialExamApproved,false);
assert.equal(schoolEnv.completeUnitMatrixVerified,false);
assert.equal(schoolEnv.sourceToPortalUnitMappingVerified,false);
assert.equal(byKey.optional_environment.currentCdcExactApproved,false);
assert.ok(byKey.optional_environment.tables.some(t=>t.title.includes('not implemented')));
assert.ok(byKey.optional_environment.sources.every(s=>s.kind==='curriculum'));
