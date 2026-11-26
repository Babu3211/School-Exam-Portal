// Prepare local teacher draft values only. Never overwrite a restored draft,
// combine examinations, infer missing marks, or recalculate grades.
import {iemisComponentKey} from './iemis-ledger.js';
import {validateConfiguredMarkComponents,primaryAchievementPair,inspectConfiguredClassMarks} from './configured-mark-preflight.mjs';
const normalized=s=>String(s??'').normalize('NFC').trim().toLowerCase().replace(/\s+/g,' ');
export function prepareLegacyDraftPrefill({history,settings,studentIds,restored=null}){
 if(restored!==null)return Object.freeze({entries:restored.entries,loaded:0,skipped:0,reason:'Saved Draft retained',examId:null});
 const {schoolId,classId,subjectId,examId:term}=settings;
 const components=validateConfiguredMarkComponents(settings,{schoolId,classId,subjectId,examId:term});
 const primary=primaryAchievementPair(components,classId);
 if(history?.schoolId!==schoolId||history.classId!==classId||history.subjectId!==subjectId||history.term!==term||history.readOnly!==true||history.publicationAllowed!==false||!Array.isArray(history.rows))throw Error('Original marks scope mismatch');
 const roster=new Set(studentIds);
 if(roster.size!==studentIds.length)throw Error('Duplicate roster');
 const exams=new Set(history.rows.map(r=>r.examId));
 const empty=(reason)=>Object.freeze({entries:Object.freeze([]),loaded:0,skipped:history.rows.length,reason,examId:null});
 if(exams.size!==1)return empty(exams.size?'Multiple original exams; no automatic copy':'No original marks');
 const examId=[...exams][0];
 if(history.rows.some(r=>String(r.academicYear)!=='2083'))return empty('Original academic year not verified');
 const entries=[],seen=new Set();let skipped=0;
 for(const r of history.rows){
  if(seen.has(r.studentId))throw Error('Duplicate original student marks');
  seen.add(r.studentId);
  if(!roster.has(r.studentId)){skipped++;continue}
  const scores=r.scores;
  if(!Array.isArray(scores)||!scores.length){skipped++;continue}
  let values={},valid=true;
  if(primary){
   const byKey=new Map();
   for(const score of scores){const key=iemisComponentKey(score.name);if(!['count','full','obtained'].includes(key)||byKey.has(key)){valid=false;break}byKey.set(key,score)}
   const count=byKey.get('count'),full=byKey.get('full'),got=byKey.get('obtained');
   const n=count?.obtained??count?.fullMarks;
   valid=valid&&byKey.size===3&&Number.isSafeInteger(n)&&n>=1&&n<=components.find(c=>c.key===primary.countKey).fullMarks&&count.fullMarks===n&&full?.fullMarks===4*n&&full.obtained===null&&got?.fullMarks===4*n;
   if(valid&&r.isAbsent!==true){valid=typeof got.obtained==='number'&&Number.isSafeInteger(got.obtained)&&got.obtained>=0&&got.obtained<=4*n&&r.totalObtained===got.obtained&&r.totalFullMarks===4*n;values={[primary.countKey]:n,[primary.scoreKey]:got.obtained}}
   if(valid&&r.isAbsent===true)valid=count.obtained===null&&got.obtained===null;
  }else{
   if(scores.length!==components.length)valid=false;
   const used=new Set();
   for(const c of components){
    const key=iemisComponentKey(c.name);
    const matches=scores.filter(s=>key?iemisComponentKey(s.name)===key:normalized(s.name)===normalized(c.name));
    if(matches.length!==1||used.has(matches[0])||matches[0].fullMarks!==c.fullMarks){valid=false;break}
    const score=matches[0];used.add(score);
    if(r.isAbsent===true){if(score.obtained!==null)valid=false}
    else if(typeof score.obtained!=='number'||!Number.isFinite(score.obtained)||score.obtained<0||score.obtained>c.fullMarks)valid=false;
    else values[c.key]=score.obtained;
   }
   if(r.isAbsent!==true&&(r.totalObtained!==Object.values(values).reduce((a,b)=>a+b,0)||r.totalFullMarks!==components.reduce((a,c)=>a+c.fullMarks,0)))valid=false;
  }
  if(!valid){skipped++;continue}
  const draft={studentId:r.studentId,isAbsent:r.isAbsent===true,values:r.isAbsent===true?{}:values};
  const review=inspectConfiguredClassMarks({schoolId,classId,subjectId,examId:term,settings,expectedStudentIds:[r.studentId],drafts:[draft]});
  if(!review.complete){skipped++;continue}
  entries.push(Object.freeze(draft));
 }
 return Object.freeze({entries:Object.freeze(entries),loaded:entries.length,skipped,reason:null,examId});
}
