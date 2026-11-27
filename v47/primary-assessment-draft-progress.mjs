// Bounded, on-demand school-admin progress for one student and assigned subject.
// Missing drafts remain unassessed, never zero marks. No collection-group scan.
import {loadMathAssessmentDraft,hasAssessmentStages} from './primary-assessment-math-draft.mjs';
import {draftThemeSlots} from './primary-assessment-teacher-worksheet.mjs';
import {scoreSeroferoDraft} from './primary-assessment-v46-serofero-text.mjs';
export async function readAssessmentDraftProgress(args){
 const {actor,model,assertCurrent,reviewTeacherUid}=args;
 if(actor?.role!=='school_admin'||!reviewTeacherUid||!Array.isArray(model?.themes)||model.themes.length<1||model.themes.length>100)throw Error('Verified Admin review required');
 const binary=model.key==='serophero',staged=hasAssessmentStages(model),stages=staged?['regular','support']:[undefined];
 const rows=[];
 for(const [themeIndex,theme] of model.themes.entries()){
  assertCurrent();
  const slots=draftThemeSlots(model,themeIndex),available=slots.every(s=>s.sourceText);
  const total=binary?slots.length*4:slots.length;
  const saved=available?await Promise.all(stages.map(stage=>loadMathAssessmentDraft({...args,themeIndex,stage}))):stages.map(()=>null);
  assertCurrent();
  for(const [i,stage] of stages.entries()){
   const d=saved[i],entered=d?[...d.ratings].filter(v=>v!=='_').length:0;
   const complete=d?(binary?scoreSeroferoDraft(d.ratings).completed:entered):0;
   rows.push(Object.freeze({theme:theme.theme,stage:stage??'assessment',sourceAvailable:available,total,entered,complete,totalGroups:slots.length,revision:d?.revision??null}));
  }
 }
 assertCurrent();
 const totals=stages.map(stage=>{const items=rows.filter(r=>r.stage===(stage??'assessment')&&r.sourceAvailable);return Object.freeze({stage:stage??'assessment',entered:items.reduce((n,r)=>n+r.entered,0),total:items.reduce((n,r)=>n+r.total,0),complete:items.reduce((n,r)=>n+r.complete,0),totalGroups:items.reduce((n,r)=>n+r.totalGroups,0),unavailableThemes:model.themes.length-items.length})});
 return Object.freeze({rows:Object.freeze(rows),totals:Object.freeze(totals),binary,officialAssessmentApproved:false});
}
