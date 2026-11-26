// Teacher assessment worksheet: verified assignment and source counts only.
// Never writes observations, assigns privileges, or claims official form parity.
import {v46SocialThemeRows} from './primary-assessment-v46-social-text.mjs';
import {v46ScienceThemeRows} from './primary-assessment-v46-science-text.mjs';
import {v46MathThemeRows} from './primary-assessment-v46-math-text.mjs';
import {readSchoolSubjectCatalog} from './subject-catalog-view.mjs';
import {verifyTeacherSubjectAssignment} from './verified-teacher-subject-assignment.mjs';
import {assessmentThemeReference} from './primary-assessment-reference.mjs';
import {loadCompleteClassRoster} from './complete-class-roster.mjs';
import {verifySchoolSession} from './verified-school-session.mjs';

const aliases={
 nepali:['nepali','नेपाली'],english:['english','अंग्रेजी','अङ्ग्रेजी'],mathematics:['mathematics','math','गणित'],
 serophero:['our surroundings','hamro sero fero','hamro serophero','हाम्रो सेरोफेरो','हाम्रो सेरो फेरो','सेरोफेरो'],
 science:['science','science and technology','विज्ञान','विज्ञान तथा प्रविधि'],
 socialstudies:['social studies','social studies and human values education','सामाजिक अध्ययन','सामाजिक अध्ययन तथा मानव मूल्य शिक्षा'],
 healthphysicalcreativeart:['health physical education and creative arts','health physical education and creative art','स्वास्थ्य शारीरिक तथा सिर्जनात्मक कला','स्वास्थ्य शारीरिक शिक्षा तथा सिर्जनात्मक कला'],
 hamrodhunibeshi:['mother tongue or local subject','local subject','hamro dhuni beshi','हाम्रो धुनीबेँसी','हाम्रो धुनीबेशी','हाम्रो धुनिबेँशी','हाम्रो धुनिवेशी','हाम्रो धुनिबेशी','हाम्रो धुनिबेसी','स्थानीय विषय','स्थानीय','local','Our Dhunibesi','Our Dhunibeshi','मातृभाषा','मातृभाषा वा स्थानीय विषय']
};
const norm=s=>String(s??'').normalize('NFC').toLowerCase().replace(/[(),،–-]/g,' ').replace(/\s+/g,' ').trim();
export function primarySubjectKey(name){
 const n=norm(name);
 return Object.keys(aliases).find(k=>aliases[k].some(v=>norm(v)===n))??null;
}
function scope(args){
 const {actor,schoolId,grade,assertCurrent,api,db}=args;
 if(actor?.active!==true||actor.role!=='teacher'||actor.schoolId!==schoolId||!['1','2','3','4','5'].includes(grade)||typeof assertCurrent!=='function')throw Error('Verified primary teacher required');
 const uid=actor.uid;
 const check=()=>{assertCurrent();if(actor.uid!==uid||actor.role!=='teacher'||actor.active!==true||actor.schoolId!==schoolId)throw Error('Teacher scope changed')};
 const verify=async()=>{check();const member=await verifySchoolSession({schoolId,uid,readDocument:async path=>{const s=await api.getDocFromServer(api.doc(db,...path.split('/')));check();return s.exists()?s.data():null}});check();if(member.role!=='teacher')throw Error('Teacher membership changed')};
 return {check,verify};
}
export async function loadAssignedPrimarySubjects(args){
 const {actor,schoolId,grade,db,api,catalogue}=args;
 const {check,verify}=scope(args);
 await verify();
 const subjects=await readSchoolSubjectCatalog({db,api,actor,schoolId,schoolClass:grade,assertCurrent:check});
 const out=[];
 for(const s of subjects){
  check();
  if(s.active!==true)continue;
  const key=primarySubjectKey(s.name);
  if(!key)continue;
  let ref;try{ref=assessmentThemeReference({catalogue,grade,subject:key})}catch{continue}
  if(!ref.rows.length)continue;
  const id=schoolId+':'+actor.uid+':'+grade+':'+s.id;
  const snap=await api.getDocFromServer(api.doc(db,'schools',schoolId,'teacher_assignments',id));check();
  if(!snap.exists())continue;
  const a=snap.data();
  if(a?.schoolId!==schoolId||a.uid!==actor.uid||a.classId!==grade||a.subjectId!==s.id)throw Error('Assignment identity mismatch');
  if(a.active===true)out.push(Object.freeze({id:s.id,name:s.name,key}));
 }
 await verify();check();return Object.freeze(out);
}
export async function loadPrimaryTeacherWorksheet(args){
 const {actor,schoolId,grade,subjectId,db,api,catalogue}=args;
 const {check,verify}=scope(args);
 const verifyAssignment=()=>verifyTeacherSubjectAssignment({db,api:{...api,getDoc:api.getDocFromServer},actor,schoolId,classId:grade,subjectId,revalidate:verify});
 const assigned=await verifyAssignment();check();
 const key=primarySubjectKey(assigned.subjectName);
 if(!key)throw Error('Subject reference not verified');
 const ref=assessmentThemeReference({catalogue,grade,subject:key});
 if(!ref.rows.length)throw Error('Theme reference unavailable');
 const roster=await loadCompleteClassRoster({db,api:{...api,getDocs:api.getDocsFromServer},actor,schoolId,classId:grade,activeOnly:true});check();
 await verifyAssignment();check();
 return Object.freeze({schoolId,grade,subjectId,subjectName:assigned.subjectName,key,students:Object.freeze(roster.students.map(s=>Object.freeze({id:s.id,name:String(s.nameEnglish??s.name??s.id),section:String(s.section??'')}))),themes:Object.freeze(ref.rows.map(r=>Object.freeze({theme:r.theme,en:r.en,count:r.count,fullMarks:r.fullMarks,scoreBlocks:r.scoreBlocks,sourceUrl:r.sourceUrl,status:r.status,sourceRows:key==='mathematics'&&['4','5'].includes(grade)?v46MathThemeRows(grade,r.theme,r.count):key==='science'&&['4','5'].includes(grade)?v46ScienceThemeRows(grade,r.theme,r.count):key==='socialstudies'&&['4','5'].includes(grade)?v46SocialThemeRows(grade,r.theme,r.count):r.sourceRows??null}))),writeAuthorized:false,officialAssessmentApproved:false});
}
export function draftThemeSlots(model,themeIndex){
 if(model?.writeAuthorized!==false||model.officialAssessmentApproved!==false||!Number.isInteger(themeIndex))throw Error('Unverified worksheet');
 const theme=model.themes?.[themeIndex];if(!theme)throw Error('Theme unavailable');
 const indicators=model.key==='serophero';
 const n=indicators?theme.scoreBlocks:theme.count;
 if(!Number.isInteger(n)||n<1||n>500||theme.fullMarks!==n*4)throw Error('Invalid worksheet denominator');
 return Object.freeze(Array.from({length:n},(_,i)=>Object.freeze({number:i+1,min:indicators?0:1,max:4,indicatorBlock:indicators,...(theme.sourceRows?.length===n?{sourceText:theme.sourceRows[i]}:{})})));
}
