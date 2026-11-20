// Read-only V47 IEMIS subject summary projection of verified V46 iemis-ledger.js.
// This helper does not save marks or approve final grade sheets.
import {previewGrade,previewFinalGrade} from './iemis-grade-preview.mjs';
const number=v=>v===null||v===undefined||String(v).trim()===''?null:Number(v);
const valid=s=>number(s.obtained)!==null&&Number.isFinite(number(s.obtained))&&Number(s.fullMarks)>0&&number(s.obtained)>=0&&number(s.obtained)<=Number(s.fullMarks);
export function previewIemisSummary(record,{annual=false,primary=false}={}){
 if(record?.isAbsent===true)return {absent:true,complete:false,full:0,obtained:null,totalGrade:null,inGrade:null,theoryGrade:null,inObtained:null,theoryObtained:null};
 const scores=record?.scores||[];
 if(primary){const count=scores.find(s=>/no\.?\s*of\s*learning/i.test(s.name||'')),got=scores.find(s=>/obtained learning/i.test(s.name||''));const n=number(count?.obtained??count?.fullMarks),obtained=number(got?.obtained),full=n===null?0:n*4;const complete=!!record&&full>0&&obtained!==null&&Number.isFinite(obtained)&&obtained>=0&&obtained<=full;const grade=complete?previewGrade(obtained/full*100):null;return {complete,full,obtained:complete?obtained:null,totalGrade:grade,inGrade:grade,inFull:full,inObtained:complete?obtained:null,theoryFull:0,theoryObtained:null,theoryGrade:null}}
 const theory=scores.filter(s=>/^TH\b|THEORY/i.test(s.name||'')),internal=scores.filter(s=>!/^TH\b|THEORY/i.test(s.name||''));
 const part=list=>{const full=list.reduce((n,s)=>n+Number(s.fullMarks||0),0),complete=list.length>0&&list.every(valid),obtained=complete?list.reduce((n,s)=>n+Number(s.obtained),0):null;return {full,obtained,grade:complete&&full>0?previewGrade(obtained/full*100):null}};
 const i=part(internal),t=part(theory),complete=!!record&&i.grade!==null&&(!annual||t.grade!==null),full=i.full+(annual?t.full:0),obtained=complete?i.obtained+(annual?t.obtained:0):null;
 const effectivePoint=complete&&annual&&i.grade.point!==null&&t.grade.point!==null?(i.full*i.grade.point+t.full*t.grade.point)/full:null;
 const totalGrade=complete?(annual?(effectivePoint===null?previewGrade(0):previewFinalGrade(effectivePoint)):i.grade):null;
 return {complete,full,obtained,totalGrade,effectivePoint,inFull:i.full,inObtained:i.obtained,inGrade:i.grade,theoryFull:t.full,theoryObtained:t.obtained,theoryGrade:t.grade};
}
