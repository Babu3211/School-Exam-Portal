/**
 * School-safe Grade 9 question-paper release audit for V46.
 * CDC publication listings alone do not mean a full Grid, verified question
 * bank or teacher-tested paper exists. The audit is READ ONLY and cannot
 * approve or deploy school data.
 */
import {cdcSubjectKey,findCdcGridSources} from './cdc-grid-source-index.mjs';
import {getBundledComputerGrid} from './cdc-verified-computer-grids.mjs';
import {getCdcOptionalMathGuide} from './cdc-optional-math-2082.mjs';
export const GRADE9_BASE_SUBJECTS=Object.freeze([
 Object.freeze({key:'nepali',name:'Compulsory Nepali',labelNe:'अनिवार्य नेपाली'}),
 Object.freeze({key:'english',name:'Compulsory English',labelNe:'अनिवार्य अङ्ग्रेजी'}),
 Object.freeze({key:'math',name:'Compulsory Mathematics',labelNe:'अनिवार्य गणित'}),
 Object.freeze({key:'science',name:'Science and Technology',labelNe:'विज्ञान तथा प्रविधि'}),
 Object.freeze({key:'social',name:'Social Studies',labelNe:'सामाजिक अध्ययन'})
]);
export const GRADE9_OPTIONAL_SUBJECTS=Object.freeze([
 Object.freeze({key:'optional_math',name:'Optional Mathematics',labelNe:'ऐच्छिक गणित'}),
 Object.freeze({key:'optional_computer',name:'Optional Computer Science',labelNe:'ऐच्छिक कम्प्युटर विज्ञान'}),
 Object.freeze({key:'optional_economics',name:'Optional Economics',labelNe:'ऐच्छिक अर्थशास्त्र'}),
 Object.freeze({key:'accounting',name:'Office Management and Accounting',labelNe:'कार्यालय सञ्चालन तथा लेखा'})
]);
const GRADES=Object.freeze([...GRADE9_BASE_SUBJECTS,...GRADE9_OPTIONAL_SUBJECTS]);
export const GRADE9_PUBLISH_GATE_VERSION='2083-dev-grade9-only';
const failReason={
 source_missing:'CDC specification source not registered for Grade 9',
 grid_not_transcribed:'Official CDC source listed but exact Grid allocation not fully transcribed',
 question_bank_not_verified:'CDC format set, but reviewed question bank and real teacher end-to-end test not verified',
 reviewed_paper_not_confirmed:'Question bank exists but a complete exact paper and teacher review are unverified'
};
function scopeKey(raw){
 const s=String(raw||'').trim();
 if(!s)return '';
 if(/^(office management|office operation|accounting|book keeping|कार्यालय|लेखा)/i.test(s))
  return 'accounting';
 return cdcSubjectKey(s);
}
/**
 * A school may have a subset of optional subjects. Only actually selected
 * optional subjects are release blockers, but all five compulsory subjects
 * remain mandatory. If the school's subject list is unknown, audit ALL known
 * optional Grade9 streams rather than assuming that none is offered.
 */
export function auditGrade9Release({
 register,offeredSubjects=null,reviewedBanks={},teacherTestedPapers={},
 exactGridReviews={}
}={}){
 if(!register||!Array.isArray(register.sources))throw Error('Official CDC source register required');
 const optional=new Set(GRADE9_OPTIONAL_SUBJECTS.map(x=>x.key));
 const offered=Array.isArray(offeredSubjects)?
  new Set(offeredSubjects.map(scopeKey).filter(Boolean)):null;
 const unknown=offeredSubjects&&[
  ...offeredSubjects.map(String).map(name=>({name,key:scopeKey(name)}))
   .filter(item=>!item.key||!GRADES.some(s=>s.key===item.key))
   .map(item=>item.name)
 ];
 const selected=GRADES.filter(s=>!optional.has(s.key)||!offered||offered.has(s.key));
 const checks=selected.map(s=>{
  const sources=findCdcGridSources(register,9,s.labelNe);
  const source=sources[0]||null;
  const bundledGrid=s.key==='optional_computer'?
   getBundledComputerGrid({grade:9,subject:s.labelNe,fullMarks:50}):null;
  const groupedGrid=s.key==='optional_math'?
   getCdcOptionalMathGuide({grade:9,subject:s.labelNe}):null;
  const evidenceGrid=!!bundledGrid||!!groupedGrid;
  // One typed Admin-entered blueprint is not automatically an official CDC
  // Grid. Only separately verified exact grid reviews may count as evidence.
  const fullGrid=evidenceGrid||exactGridReviews[s.key]===true;
  const bank=reviewedBanks[s.key]===true;
  const teacherTest=teacherTestedPapers[s.key]===true;
  const status=!source?'source_missing':!fullGrid?'grid_not_transcribed':
   !bank?'question_bank_not_verified':!teacherTest?'reviewed_paper_not_confirmed':'verified_for_school_review';
  return {
   key:s.key,subject:s.name,subjectNe:s.labelNe,
   officialSourceUrl:source?.sourceUrl||null,
   sourceStatus:source?.sourceStatus||null,
   gridTranscribed:fullGrid,questionBankReviewed:bank,
   teacherPaperTested:teacherTest,ready:status==='verified_for_school_review',
   status,reason:failReason[status]||null,
   gridType:bundledGrid?'unit_wise_computer':groupedGrid?'optional_math_WCA_CCA':
    fullGrid?'independently_reviewed':'not_available'
  };
 });
 const blocked=checks.filter(x=>!x.ready);
 return Object.freeze({
  grade:9,academicYear:2083,gate: GRADE9_PUBLISH_GATE_VERSION,
  readyForLive:false, // Must also pass full V46 release workflow and get school approval.
  grade9PaperReady:blocked.length===0&&!(unknown?.length),
  unknownSchoolSubjects:Object.freeze(unknown||[]),
  missingCount:blocked.length,
  checkedSubjects:Object.freeze(checks),
  blockers:Object.freeze(blocked),
  note:'This is a prerequisite audit, never a deploy permission. Main/V46 production and V47 unaffected.'
 });
}
