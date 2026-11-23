/**
 * CDC Grade 8 Science and Technology: archival MODEL QUESTION audit.
 *
 * Basis:
 * - CDC publication listing (9 Bhadra 2082):
 *   https://moecdc.gov.np/content/284/specification-grid--grade-8--science-and-technology/
 * - CDC library archive record (2078 Grid + model + answer key):
 *   https://lib.moecdc.gov.np/catalog/opac_css/index.php?id=13717&lvl=notice_display
 * - Dhangadhi municipality government PDF archive of source materials:
 *   https://dhangadhimun.gov.np/ (archived Grade 8 specification and model PDF).
 * - Secondary independently published 2078 BLE science structural synopsis:
 *   https://science-playground.com/learn/grade-8-science/papers
 *
 * Important: The government-archive PDF's searchable text gives 40 for a
 * Grade 8 Science GRID total but 50 for the model paper. Its source page
 * could not be visually rechecked, and the direct CDC 2082 PDF attachment
 * has not been inspected. No assertion of current official Grid compliance
 * is made. Exact generation must stay blocked until the primary original
 * PDF and discrepancy are reconciled by a human, independently of this
 * source snapshot. No copied questions or answers are included here.
 */
export const GRADE8_SCIENCE_MODEL_2078=Object.freeze({
 grade:8,subjectKey:'science',version:'2078',
 officialPublicationPage:'https://moecdc.gov.np/content/284/specification-grid--grade-8--science-and-technology/',
 archivedCdcCatalogUrl:'https://lib.moecdc.gov.np/catalog/opac_css/index.php?id=13717&lvl=notice_display',
 secondaryCrossCheckUrl:'https://science-playground.com/learn/grade-8-science/papers',
 modelFullMarks:50,durationMinutes:120,
 // Four groups in the 2078 model (not an approved 2083 Grid).
 groups:Object.freeze([
  Object.freeze({code:'mcq',count:10,marksEach:1,groupMarks:10,
   cognitionCounts:Object.freeze([2,3,3,2])}),
  Object.freeze({code:'very_short',count:8,marksEach:1,groupMarks:8,
   cognitionCounts:Object.freeze([2,2,2,2])}),
  Object.freeze({code:'short',count:8,marksEach:2,groupMarks:16,
   cognitionCounts:Object.freeze([1,3,3,1])}),
  Object.freeze({code:'long',count:4,marksEach:4,groupMarks:16,
   cognitionCounts:Object.freeze([1,1,1,1])})
 ]),
 unitMarks:Object.freeze([3,6,4,3,5,5,7,3,6,5,3]),
 teachingHours:Object.freeze([10,30,12,8,15,15,20,10,15,15,10]),
 unitGroupTotalMarks:Object.freeze([9,12,18,11]),
 unitGroups:Object.freeze([[1,2],[3,4,5],[6,7,8,11],[9,10]].map(x=>Object.freeze(x))),
 cognitiveMarks:Object.freeze([10,15,15,10]),
 cognitiveLevels:Object.freeze(['knowledge','understanding','application','higher']),
 publishedMunicipalPdfTextGridMarks:40,
 publishedMunicipalPdfTextModelMarks:50,
 fullCurrentCdcAttachmentVisuallyInspected:false,
 governmentArchiveScreenshotVerified:false,
 currentVersionApproved:false
});
const sum=a=>a.reduce((s,x)=>s+x,0);
function normalizedSubject(subject){
 const s=String(subject||'').trim().toLowerCase().replace(/\s+/g,' ');
 return /^(science|science and technology|science & technology|general science|विज्ञान|विज्ञान तथा प्रविधि|अनिवार्य विज्ञान(?: तथा प्रविधि)?)$/.test(s);
}
export function checkGrade8Science2078Model({grade,subject}={}){
 if(grade!==8||!normalizedSubject(subject))return null;
 const src=GRADE8_SCIENCE_MODEL_2078;
 const rowTotal=src.groups.map(r=>r.count*r.marksEach);
 const cognitive=src.cognitiveLevels.map((level,i)=>
  sum(src.groups.map(g=>g.cognitionCounts[i]*g.marksEach)));
 const grouped=src.unitGroups.map(group=>sum(group.map(u=>src.unitMarks[u-1])));
 const internal={
  questionCount:sum(src.groups.map(g=>g.count)),
  sectionMarks:rowTotal,fullMarks:sum(rowTotal),unitMarks:sum(src.unitMarks),
  groupMarks:grouped,teachingHours:sum(src.teachingHours),cognitiveMarks:cognitive
 };
 const consistencyErrors=[];
 if(internal.questionCount!==30||internal.fullMarks!==src.modelFullMarks||
    internal.unitMarks!==50||internal.teachingHours!==160||
    JSON.stringify(internal.sectionMarks)!==JSON.stringify([10,8,16,16])||
    JSON.stringify(grouped)!==JSON.stringify(src.unitGroupTotalMarks)||
    JSON.stringify(cognitive)!==JSON.stringify(src.cognitiveMarks))
  consistencyErrors.push('Historic model synopsis arithmetic does not reconcile');
 const publicationConflict=src.publishedMunicipalPdfTextGridMarks!==
  src.publishedMunicipalPdfTextModelMarks;
 const concerns=[
  'Original CDC 2082 publication is listed, but its original Grade 8 Science PDF has not been visually inspected',
  'Government archive PDF searchable text shows a grid/model full-mark discrepancy; recheck original pages'
 ];
 return {
  grade:8,subject,sourceYear:2078,model:src,modelArithmeticChecks:internal,
  modelArithmeticInternallyConsistent:consistencyErrors.length===0,
  conflicts:publicationConflict?['government_archive_grid_40_vs_model_50']:[],
  concerns:[...concerns,...consistencyErrors],
  sourceOnly:true,officialGridValidatedFor2083:false,
  readyForExactGeneration:false,
  requiresPrimaryPdfReview:true,
  note:'Historical CDC model reference only; never represent the transcribed pattern as approved 2083 Grid'
 };
}
export function compareGrade8SciencePracticeBank({grade,subject,questions}={}){
 const model=checkGrade8Science2078Model({grade,subject});
 if(!model)return null;
 if(!Array.isArray(questions))throw Error('Grade 8 Science question list required');
 const have=Object.fromEntries(model.model.groups.map(group=>{
  const candidate=questions.filter(q=>{
   const type=String(q?.questionType||'');
   return type===group.code&&Number(q.marks)===group.marksEach&&
    typeof q.questionText==='string'&&q.questionText.trim()&&
    typeof q.answer==='string'&&q.answer.trim();
  });
  return [group.code,candidate.length];
 }));
 const lacking=model.model.groups.map(g=>({
  group:g.code,need:g.count,matchingSourceQuestions:have[g.code],
  missingAtLeast:Math.max(0,g.count-have[g.code]),
  marksEach:g.marksEach
 }));
 const missingCognition=model.model.groups.flatMap(g=>
  model.model.cognitiveLevels.map((level,i)=>{
   const matching=questions.filter(q=>
    q?.questionType===g.code&&Number(q.marks)===g.marksEach&&
    q.cognitiveLevel===level&&
    typeof q.questionText==='string'&&q.questionText.trim()&&
    typeof q.answer==='string'&&q.answer.trim()).length;
   return {group:g.code,level,required:g.cognitionCounts[i],
    matching,missingAtLeast:Math.max(0,g.cognitionCounts[i]-matching)};
  }).filter(row=>row.missingAtLeast>0)
 );
 return {...model,
  practiceQuestionCount:questions.length,
  compatibleBankCounts:have,
  missingTypes:lacking.filter(g=>g.missingAtLeast>0),
  missingCognition,
  readyForExactGeneration:false,
  bankIncludesOnlyPracticeMaterial:true
 };
}

/**
 * Historical 2078 MODEL format only, offered for PRACTICE composition.
 * It never includes verifiedBy/unitGrid and must not enable CDC Exact.
 */
export function getGrade8ScienceHistoricalPracticePattern({grade,subject,fullMarks=50}={}){
 const audit=checkGrade8Science2078Model({grade,subject});
 if(!audit||Number(fullMarks)!==50)return null;
 return {
  fullMarks:50,durationMinutes:120,
  pattern:audit.model.groups.map(g=>({type:g.code,count:g.count,marks:g.marksEach})),
  practiceOnly:true,currentCdcExactApproved:false,
  sourceVersion:'२०७८ historical model (२०८३ source review pending)',
  sourceUrl:audit.model.archivedCdcCatalogUrl
 };
}
