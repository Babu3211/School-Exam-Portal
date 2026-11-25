// School subject catalogue is a display-only view. It does not certify marks or repair legacy data.
import {validSchoolClass} from './class-catalog.mjs';
import {verifySchoolSession} from './verified-school-session.mjs';
import {validateSchoolId} from './school-paths.mjs';
export async function readSchoolSubjectCatalog({db,api,actor,schoolId,schoolClass,assertCurrent}){
 validateSchoolId(schoolId);
 if(!validSchoolClass(schoolClass)||actor?.schoolId!==schoolId||actor?.active!==true||
 !['school_admin','teacher','viewer'].includes(actor?.role)||!actor.uid||typeof assertCurrent!=='function')
  throw Error('Verified school membership and class required');
 const {uid,role}=actor;
 const check=()=>{assertCurrent();if(actor.uid!==uid||actor.schoolId!==schoolId||actor.role!==role||actor.active!==true)throw Error('School membership changed')};
 const verify=async()=>{check();const member=await verifySchoolSession({schoolId,uid,readDocument:async path=>{
  const snap=await api.getDocFromServer(api.doc(db,...path.split('/')));check();return snap.exists()?snap.data():null;
 }});check();if(member.role!==role)throw Error('School membership changed')};
 await verify();
 const q=api.query(api.collection(db,'schools',schoolId,'subjects'),api.where('class','==',schoolClass),api.orderBy('__name__'),api.limit(101));
 const snap=await api.getDocsFromServer(q);check();
 if(!Array.isArray(snap?.docs)||snap.docs.length>100)throw Error('Subject catalogue exceeds safe class limit');
 const rows=[];let last='';
 for(const doc of snap.docs){
  if(typeof doc?.id!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(doc.id)||doc.id<=last||
   doc.ref?.path!==undefined&&doc.ref.path!=='schools/'+schoolId+'/subjects/'+doc.id)throw Error('Invalid subject document');
  last=doc.id;const d=doc.data();
  if(!d||d.schoolId!==schoolId||d.class!==schoolClass)throw Error('Foreign subject record');
  const mark=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:null;
  rows.push(Object.freeze({id:doc.id,name:typeof d.name==='string'?d.name:doc.id,active:typeof d.active==='boolean'?d.active:null,
   creditHour:mark(d.creditHour),theoryFullMarks:mark(d.theoryFullMarks),practicalFullMarks:mark(d.practicalFullMarks)}));
 }
 await verify();return Object.freeze(rows);
}
