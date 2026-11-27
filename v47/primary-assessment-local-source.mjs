// School-specific curriculum supplied by the school, never a national CDC catalogue.
// An immutable first source version prevents changing the meaning of saved draft keys.
import {validateSchoolId} from './school-paths.mjs';
import {verifySchoolSession} from './verified-school-session.mjs';
export const LOCAL_SOURCE_REVISION='school-local-curriculum-v1';
const segment=/^[A-Za-z0-9_-]{1,128}$/;
export function parseLocalAssessmentSource(text,sourceLabel){
 if(typeof text!=='string'||text.length>60000||typeof sourceLabel!=='string'||!sourceLabel.trim()||sourceLabel.length>200)throw Error('Local curriculum source required');
 const themes=[],seen=new Set();let current=null,total=0;
 for(const line of text.split(/\r?\n/).map(s=>s.trim().normalize('NFC')).filter(Boolean)){
  if(line.startsWith('# ')){
   const title=line.slice(2).trim();if(!title||title.length>200||seen.has(title)||themes.length>=100)throw Error('Invalid or duplicate local theme');
   current={theme:title,sourceRows:[]};themes.push(current);seen.add(title);
  }else{
   if(!current||line.length>500||current.sourceRows.some(r=>r.title===line)||++total>500)throw Error('Invalid or duplicate local achievement');
   current.sourceRows.push(Object.freeze({title:line,sourceLabel:sourceLabel.trim()}));
  }
 }
 if(!themes.length||themes.some(t=>!t.sourceRows.length))throw Error('Every local theme needs achievements');
 return Object.freeze(themes.map(t=>Object.freeze({...t,en:'',count:t.sourceRows.length,fullMarks:t.sourceRows.length*4,scoreBlocks:null,sourceRows:Object.freeze(t.sourceRows),sourceUrl:null,status:'schoolProvidedLocal'})));
}
function scope({schoolId,grade,subjectId,actor,assertCurrent}){
 validateSchoolId(schoolId);
 if(!['1','2','3','4','5'].includes(grade)||!segment.test(subjectId??'')||actor?.schoolId!==schoolId||actor.active!==true||!['school_admin','teacher'].includes(actor.role)||typeof assertCurrent!=='function')throw Error('Invalid local assessment scope');
}
export async function readLocalAssessmentSource(args){
 scope(args);const {api,db,schoolId,grade,subjectId,assertCurrent}=args;
 const snap=await api.getDocFromServer(api.doc(db,'schools',schoolId,'primary_local_curricula',grade+'_'+subjectId));assertCurrent();
 if(!snap.exists())return null;const d=snap.data();
 if(d.schoolId!==schoolId||d.grade!==grade||d.subjectId!==subjectId||d.year!=='2083'||d.format!==LOCAL_SOURCE_REVISION)throw Error('Foreign local curriculum');
 return Object.freeze({sourceLabel:d.sourceLabel,sourceText:d.sourceText,rows:parseLocalAssessmentSource(d.sourceText,d.sourceLabel)});
}
export async function saveLocalAssessmentSource(args){
 scope(args);const {api,db,schoolId,grade,subjectId,actor,assertCurrent,sourceText,sourceLabel}=args;
 if(actor.role!=='school_admin')throw Error('School Admin required');
 const rows=parseLocalAssessmentSource(sourceText,sourceLabel);
 const check=()=>{assertCurrent();if(actor.role!=='school_admin'||actor.schoolId!==schoolId||actor.active!==true)throw Error('Local curriculum session changed')};
 const verify=async()=>{const s=await verifySchoolSession({schoolId,uid:actor.uid,readDocument:async path=>{const snap=await api.getDocFromServer(api.doc(db,...path.split('/')));check();return snap.exists()?snap.data():null}});check();if(s.role!=='school_admin')throw Error('School Admin required')};
 await verify();
 const ref=api.doc(db,'schools',schoolId,'primary_local_curricula',grade+'_'+subjectId);
 const subject=api.doc(db,'schools',schoolId,'subjects',subjectId);
 await api.runTransaction(db,async tx=>{const [old,s]=await Promise.all([tx.get(ref),tx.get(subject)]);check();if(old.exists())throw Error('Local curriculum already registered; source revision required');if(!s.exists()||s.data().schoolId!==schoolId||s.data().class!==grade||s.data().active!==true)throw Error('Active subject required');tx.set(ref,{format:LOCAL_SOURCE_REVISION,schoolId,grade,subjectId,year:'2083',sourceText,sourceLabel:sourceLabel.trim(),createdBy:actor.uid,createdAt:api.serverTimestamp()})});
 await verify();const saved=await readLocalAssessmentSource(args);if(!saved||saved.sourceText!==sourceText||saved.sourceLabel!==sourceLabel.trim())throw Error('Local curriculum save not verified');return rows;
}
