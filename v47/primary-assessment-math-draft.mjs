// Private, source-bound teacher worksheet draft. No write to migrated CDC
// observations, grades, marks, or other teachers' records.
import {validAssessmentDate2083} from './assessment-date-2083.mjs';
import {draftThemeSlots} from './primary-assessment-teacher-worksheet.mjs';
import {validateSchoolId} from './school-paths.mjs';
import {sameMarkJson} from './mark-json-equality.mjs';
const sourceRevision='ad2e3b96a22601fed9d956397a98c564b3ffb768';
const formats=Object.freeze({mathematics:'smss-v47-primary-math-draft-v1',science:'smss-v47-primary-science-draft-v1',socialstudies:'smss-v47-primary-social-draft-v1',nepali:'smss-v47-primary-nepali-draft-v1',english:'smss-v47-primary-english-draft-v1',healthphysicalcreativeart:'smss-v47-primary-health-draft-v1',serophero:'smss-v47-primary-serofero-draft-v1'});
const segment=/^[A-Za-z0-9_-]{1,128}$/;
export function validateMathDraftValues({ratings,date,count,binary=false,rowDates}){
 if(!Number.isInteger(count)||count<1||count>500||typeof ratings!=='string'||ratings.length!==count||(binary?(!/^[01_]+$/.test(ratings)||!/[01]/.test(ratings)||count%4!==0):(!/^[1-4_]+$/.test(ratings)||!/[1-4]/.test(ratings)))||!validAssessmentDate2083(date))throw Error('Invalid assessment draft date or ratings');
 if(rowDates!==undefined&&(typeof rowDates!=='string'||rowDates.length!==(binary?count/4:count)*10||!rowDates.match(/.{10}/g)?.every(validAssessmentDate2083)))throw Error('Invalid assessment row dates');
 return rowDates===undefined?{ratings,date}:{ratings,date,rowDates};
}
async function context({db,api,auth,actor,model,studentId,themeIndex,stage,assertCurrent,reviewTeacherUid},readOnly=false){
 const schoolId=validateSchoolId(model?.schoolId);
 const reviewer=readOnly&&reviewTeacherUid!==undefined,uid=reviewer?reviewTeacherUid:actor?.uid,actorUid=actor?.uid,role=reviewer?'school_admin':'teacher';
 const binary=model?.key==='serophero';
 const lowerLanguage=['1','2','3'].includes(model?.grade)&&['nepali','english','serophero'].includes(model?.key);
 if(binary&&!lowerLanguage)throw Error('Invalid indicator grade');
 if(lowerLanguage?!['regular','support'].includes(stage):stage!==undefined)throw Error('Invalid assessment stage');
 if(!segment.test(uid??'')||actor?.schoolId!==schoolId||actor?.role!==role||actor?.active!==true||auth?.currentUser?.uid!==actorUid||!Object.hasOwn(formats,model.key)||!['1','2','3','4','5'].includes(model.grade)||(model.key!=='mathematics'&&!lowerLanguage&&!['4','5'].includes(model.grade))||!segment.test(model.subjectId??'')||!segment.test(studentId??'')||!model.students?.some(s=>s.id===studentId)||typeof assertCurrent!=='function')throw Error('Verified assigned primary worksheet required');
 const theme=model.themes?.[themeIndex],slots=draftThemeSlots(model,themeIndex);
 if(!theme||!slots.every(s=>s.sourceText)||theme.sourceRows?.length!==slots.length||(binary&&slots.some(s=>s.sourceText.indicators?.length!==4)))throw Error('Source text unavailable');
 const check=()=>{assertCurrent();if(auth?.currentUser?.uid!==actorUid||actor.uid!==actorUid||actor.schoolId!==schoolId||actor.role!==role||actor.active!==true)throw Error('Worksheet session changed')};
 check();
 const bytes=await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([sourceRevision,model.grade,theme.theme,theme.sourceRows,...(lowerLanguage?[stage]:[])])));
 const themeId=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
 check();
 const identity={format:lowerLanguage?'smss-v47-primary-lower-'+model.key+'-'+stage+'-draft-v1':formats[model.key],schoolId,teacherUid:uid,classId:model.grade,subjectId:model.subjectId,studentId,themeId,sourceRevision,themeName:theme.theme};
 const ref=api.doc(db,'schools',schoolId,'teacher_assessment_drafts',uid,'classes',model.grade,'subjects',model.subjectId,'students',studentId,'themes',themeId);
 const read=snap=>{
  if(!snap.exists())return null;
  const d=snap.data();
  if(Object.keys(d).sort().join(',')!==[...Object.keys(identity),'ratings','date','revision','updatedAt',...(Object.hasOwn(d,'rowDates')?['rowDates']:[])].sort().join(',')||Object.entries(identity).some(([k,v])=>d[k]!==v)||!Number.isSafeInteger(d.revision)||d.revision<1||d.revision>1000000000)throw Error('Saved assessment draft identity changed');
  const values=validateMathDraftValues({ratings:d.ratings,date:d.date,count:slots.length*(binary?4:1),binary,rowDates:d.rowDates});
  return {...values,revision:d.revision};
 };
 return {check,identity,ref,read,count:slots.length*(binary?4:1),binary};
}
export async function loadMathAssessmentDraft(args){
 const c=await context(args,true);
 const snap=await args.api.getDocFromServer(c.ref);c.check();
 return c.read(snap);
}
export async function saveMathAssessmentDraft(args){
 const c=await context(args),{api,db,expectedRevision}=args;
 const values=validateMathDraftValues({ratings:args.ratings,date:args.date,count:c.count,binary:c.binary,rowDates:args.rowDates});
 if(!Number.isSafeInteger(expectedRevision)||expectedRevision<0||expectedRevision>=1000000000)throw Error('Invalid revision');
 const revision=expectedRevision+1;
 await api.runTransaction(db,async tx=>{
  const old=c.read(await tx.get(c.ref));c.check();
  if((old?.revision??0)!==expectedRevision)throw Error('Worksheet draft revision changed; reload');
  if(old?.rowDates!==undefined&&values.rowDates===undefined)throw Error('Existing row dates must be preserved');
  tx.set(c.ref,{...c.identity,...values,revision,updatedAt:api.serverTimestamp()});
 });
 c.check();
 const actual=c.read(await api.getDocFromServer(c.ref));c.check();
 if(!sameMarkJson(actual,{...values,revision}))throw Error('Draft save needs verification; reload');
 return Object.freeze({...actual,officialAssessmentApproved:false});
}
