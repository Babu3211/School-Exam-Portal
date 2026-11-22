import {inspectConfiguredClassMarks} from './configured-mark-preflight.mjs';

// Auditable all-student publication proposal. Pure, deterministic, and
// explicitly non-writable until server-side atomic publication exists.
export function prepareConfiguredClassPublication({actor,schoolId,classId,subjectId,examId,settings,expectedStudentIds,drafts}){
 if(actor?.active!==true||actor?.role!=='school_admin'||actor?.schoolId!==schoolId||typeof actor.uid!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(actor.uid))throw new Error('Verified school admin required');
 const inspected=inspectConfiguredClassMarks({schoolId,classId,subjectId,examId,settings,expectedStudentIds,drafts});
 if(!inspected.complete) return Object.freeze({complete:false,schoolId,classId,subjectId,examId,rosterCount:inspected.rosterCount,missing:inspected.missing,invalid:inspected.invalid,writeAuthorized:false,publicationAllowed:false});
 const ordered=inspected.ready.map(row=>Object.freeze({studentId:row.studentId,isAbsent:row.isAbsent,values:row.isAbsent?null:row.values,totalObtained:row.totalObtained})).sort((a,b)=>a.studentId<b.studentId?-1:a.studentId>b.studentId?1:0);
 const batches=[];
 for(let i=0;i<ordered.length;i+=100)batches.push(Object.freeze(ordered.slice(i,i+100)));
 return Object.freeze({complete:true,schoolId,classId,subjectId,examId,rosterCount:inspected.rosterCount,componentLimits:inspected.components,orderedEntries:Object.freeze(ordered),reviewBatches:Object.freeze(batches),writeAuthorized:false,publicationAllowed:false,warning:'Preview only. Review batches are NOT atomic transactions; no marks are written or published.'});
}
