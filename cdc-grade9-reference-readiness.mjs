/** Read-only connection between the actual school/bundled bank snapshot
 * and the Grade 9 reference planners. Never certifies a historical Grid,
 * changes bank metadata, produces a printable exam, or writes school data.
 */
import {cdcSubjectKey} from './cdc-grid-source-index.mjs';
import {planNepali2078ReferencePaper} from './cdc-grade9-nepali-grouped-planner.mjs';
import {planGrade9EnglishReferencePaper} from './cdc-grade9-english-grouped-planner.mjs';
import {planGrade9MathReference} from './cdc-grade9-compulsory-math-grouped.mjs';
import {planScience2078ReferencePaper} from './cdc-grade9-science-reference-planner.mjs';
import {planSocial2078ReferencePaper} from './cdc-grade9-social-reference-planner.mjs';
import {auditGrade9ModelReference} from './cdc-grade9-model-reference-audit.mjs';
const planners={nepali:planNepali2078ReferencePaper,english:planGrade9EnglishReferencePaper,math:planGrade9MathReference,science:planScience2078ReferencePaper,social:planSocial2078ReferencePaper};
export function inspectGrade9ReferenceReadiness({grade,subject,questions=[],selectedTopicIds=null,language='both'}={}){
 const key=cdcSubjectKey(subject);
 if(grade!==9||(!Object.hasOwn(planners,key)&&key!=='optional_environment'))return null;
 if(!Array.isArray(questions)||questions.length>5000)throw Error('Invalid question bank snapshot');
 const bank=questions.filter(q=>q&&q.gradeNumber===9&&q.subject===subject&&q.status!=='archived');
 const topics=selectedTopicIds===null?[...new Set(bank.map(q=>q.topicId).filter(x=>typeof x==='string'&&x.trim()))]:selectedTopicIds;
 if(!Array.isArray(topics))throw Error('Invalid selected topics');
 const selected=bank.filter(q=>topics.includes(q.topicId));
 const base={key,bankCount:bank.length,selectedBankCount:selected.length,reviewedCount:selected.filter(q=>q.reviewStatus==='teacher_reviewed'&&String(q.reviewedBy||'').trim()).length,currentCdcExactApproved:false,readyForLive:false};
 if(key==='optional_environment'){
  const audit=auditGrade9ModelReference({grade,subject,questions:selected});
  return {...base,referenceStructureMatched:false,plannerAvailable:false,missing:audit.groups.filter(g=>g.missing>0).map(g=>g.type+' '+g.marks+' marks: '+g.missing+' missing'),reason:'Conflicting school patterns; official CDC external examination Grid not verified'};
 }
 try{
  const result=planners[key]({grade,subject,questions:selected,selectedTopicIds:topics,language,rng:()=>.417,maxVisits:10000});
  const missing=(result.shortages||result.shortage||[]).map(x=>typeof x==='string'?x:[x.skill||x.type,x.group?'group '+x.group:x.number?'question '+x.number:'',x.currentUnit?'Unit '+x.currentUnit:'',x.level||'',x.marks?x.marks+' marks':'',x.choice?'choice '+x.choice:''].filter(Boolean).join(' / '));
  return {...base,plannerAvailable:true,referenceStructureMatched:result.ready===true,missing,missingUnits:result.missingUnits||[],reason:result.ready?'Reference structure can be formed; current CDC approval is still missing':result.reason||'Incomplete reference bank'};
 }catch(e){
  return {...base,plannerAvailable:true,referenceStructureMatched:false,missing:[],reason:String(e?.message||e)};
 }
}
