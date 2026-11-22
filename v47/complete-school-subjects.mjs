import {validateSchoolId} from './school-paths.mjs';
import {validSchoolClass} from './class-catalog.mjs';
import {canAccessSchool} from './permissions.mjs';
// Read-only subject roster. No client-supplied subset can certify class results.
export async function loadCompleteSchoolSubjects({db,api,actor,schoolId,schoolClass,pageSize=100,maxSubjects=100}){
 validateSchoolId(schoolId);
 if(!canAccessSchool(actor,schoolId,'read'))throw new Error('School membership required');
 if(!validSchoolClass(schoolClass))throw new Error('Invalid class');
 if(!Number.isInteger(pageSize)||pageSize<1||pageSize>100||!Number.isInteger(maxSubjects)||maxSubjects<1||maxSubjects>100)throw new RangeError('Invalid subject roster bounds');
 for(const key of ['collection','query','where','orderBy','limit','getDocs','startAfter'])if(typeof api?.[key]!=='function')throw new TypeError('Missing Firestore method '+key);
 const identity={uid:actor?.uid,role:actor?.role,schoolId:actor?.schoolId,active:actor?.active};
 const verify=()=>{if(!canAccessSchool(actor,schoolId,'read')||Object.keys(identity).some(key=>actor?.[key]!==identity[key]))throw new Error('School membership changed during subject roster load');};
 const subjects=[];let cursor=null,lastId=null,pages=0;
 do{
  verify();
  const filters=[api.where('class','==',schoolClass),api.orderBy('__name__'),api.limit(pageSize+1)];
  if(cursor)filters.push(api.startAfter(cursor));
  const snap=await api.getDocs(api.query(api.collection(db,'schools',schoolId,'subjects'),...filters));
  verify();
  if(!Array.isArray(snap.docs)||snap.docs.length>pageSize+1)throw new Error('Invalid subject page');
  const page=snap.docs.slice(0,pageSize);
  for(const d of page){
   if(typeof d.id!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(d.id)||lastId!==null&&d.id<=lastId)throw new Error('Subject pagination order invalid');
   lastId=d.id;
   const data=d.data();
   if(data.schoolId!==schoolId||data.class!==schoolClass)throw new Error('Foreign subject in roster');
  }
  if(snap.docs.length>pageSize){
   const extra=snap.docs[pageSize];
   if(typeof extra?.id!=='string'||extra.id<=lastId)throw new Error('Invalid subject lookahead cursor');
   if(extra.data().schoolId!==schoolId||extra.data().class!==schoolClass)throw new Error('Foreign subject in lookahead');
  }
  for(const d of page){
   const data=d.data();
   if(data.active!==true)throw new Error('Inactive subject requires verified exclusion policy');
   subjects.push({...data,id:d.id});
   if(subjects.length>maxSubjects)throw new RangeError('Subject roster exceeds configured bound');
  }
  pages++;
  if(snap.docs.length>pageSize){
   if(!page.length||!page.at(-1)?.id)throw new Error('Subject pagination stalled');
   cursor=page.at(-1);
   lastId=cursor.id;
  }else cursor=null;
 }while(cursor);
 verify();
 if(!subjects.length)throw new Error('No active subjects in class');
 return {subjects,count:subjects.length,pages};
}
