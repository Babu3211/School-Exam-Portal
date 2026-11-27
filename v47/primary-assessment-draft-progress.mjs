// Bounded, on-demand school-admin progress for one student and assigned subject.
// Missing drafts remain unassessed, never zero marks. No collection-group scan.
import {assessmentStagePercentage,reviewCombinedAchievement,upperAssessmentGrade,reviewAnnualAchievement,reviewLowerAchievement,summarizeLowerAchievement} from './primary-assessment-percentage.mjs';
import {loadMathAssessmentDraft,hasAssessmentStages,hasUpperAssessmentStages} from './primary-assessment-math-draft.mjs';
import {draftThemeSlots} from './primary-assessment-teacher-worksheet.mjs';
import {scoreSeroferoDraft} from './primary-assessment-v46-serofero-text.mjs';
export async function readAssessmentDraftProgress(args){
 const {actor,model,assertCurrent,reviewTeacherUid}=args;
 if(actor?.role!=='school_admin'||!reviewTeacherUid||!Array.isArray(model?.themes)||model.themes.length<1||model.themes.length>100)throw Error('Verified Admin review required');
 const binary=model.key==='serophero',staged=hasAssessmentStages(model),stages=staged?['regular','support']:[undefined];
 const rows=[],combinedThemes=[],annualThemes=[],themeReviews=[],lowerThemes=[],lower=['1','2','3'].includes(model.grade)&&model.key!=='hamrodhunibeshi';
 for(const [themeIndex,theme] of model.themes.entries()){
  assertCurrent();
  const slots=draftThemeSlots(model,themeIndex),available=slots.every(s=>s.sourceText);
  const total=binary?slots.length*4:slots.length;
  const saved=available?await Promise.all(stages.map(stage=>loadMathAssessmentDraft({...args,themeIndex,stage}))):stages.map(()=>null);
  assertCurrent();
  if(hasUpperAssessmentStages(model)){const combined=available?reviewCombinedAchievement(saved[0]?.ratings??'_'.repeat(slots.length),saved[1]?.ratings??'_'.repeat(slots.length)):null,annual=available?reviewAnnualAchievement(saved[0],saved[1],slots.length):null;if(available){combinedThemes.push(combined);annualThemes.push(annual)}themeReviews.push(Object.freeze({theme:theme.theme,expected:slots.length,combined,annual}));}
  if(lower)lowerThemes.push({expected:slots.length,review:available?reviewLowerAchievement(saved[0],saved[1],slots.length,binary):null});
  for(const [i,stage] of stages.entries()){
   const d=saved[i],entered=d?[...d.ratings].filter(v=>v!=='_').length:0;
   const complete=d?(binary?scoreSeroferoDraft(d.ratings).completed:entered):0;
   const score=hasUpperAssessmentStages(model)&&available?assessmentStagePercentage(d?.ratings??'_'.repeat(slots.length)):null;
   rows.push(Object.freeze({theme:theme.theme,stage:stage??'assessment',sourceAvailable:available,total,entered,complete,totalGroups:slots.length,revision:d?.revision??null,scoreSum:score?.sum??null,percentage:score?.percentage??null}));
  }
 }
 assertCurrent();
 const totals=stages.map(stage=>{const items=rows.filter(r=>r.stage===(stage??'assessment')&&r.sourceAvailable);const sum=items.reduce((n,r)=>n+(r.scoreSum??0),0),count=items.reduce((n,r)=>n+r.entered,0);return Object.freeze({stage:stage??'assessment',percentage:hasUpperAssessmentStages(model)&&count?sum/(4*count)*100:null,entered:items.reduce((n,r)=>n+r.entered,0),total:items.reduce((n,r)=>n+r.total,0),complete:items.reduce((n,r)=>n+r.complete,0),totalGroups:items.reduce((n,r)=>n+r.totalGroups,0),unavailableThemes:model.themes.length-items.length})});
 const count=combinedThemes.reduce((n,r)=>n+r.count,0),expected=combinedThemes.reduce((n,r)=>n+r.expected,0),sum=combinedThemes.reduce((n,r)=>n+r.sum,0),percentage=count?sum/(4*count)*100:null,complete=combinedThemes.length===model.themes.length&&expected>0&&count===expected;
 const combined=hasUpperAssessmentStages(model)?Object.freeze({count,expected,sum,denominator:count*4,percentage,complete,grade:complete?upperAssessmentGrade(percentage):null}):null;
 const annualCount=annualThemes.reduce((n,r)=>n+r.count,0),annualSum=annualThemes.reduce((n,r)=>n+r.sum,0),conflicts=annualThemes.reduce((n,r)=>n+r.conflicts,0),different=annualThemes.reduce((n,r)=>n+r.different,0),annualPercentage=annualCount?annualSum/(4*annualCount)*100:null,annualComplete=annualThemes.length===model.themes.length&&expected>0&&annualCount===expected&&conflicts===0;
 const annual=hasUpperAssessmentStages(model)?Object.freeze({count:annualCount,expected,sum:annualSum,denominator:annualCount*4,percentage:annualPercentage,conflicts,different,complete:annualComplete,grade:annualComplete?upperAssessmentGrade(annualPercentage):null}):null;
 return Object.freeze({rows:Object.freeze(rows),totals:Object.freeze(totals),combined,annual,lowerAnnual:lower?summarizeLowerAchievement(lowerThemes):null,themeReviews:Object.freeze(themeReviews),binary,officialAssessmentApproved:false});
}
