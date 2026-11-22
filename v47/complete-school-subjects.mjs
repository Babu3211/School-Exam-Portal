import {validateSchoolId} from './school-paths.mjs';
import {validSchoolClass} from './class-catalog.mjs';
import {canAccessSchool} from './permissions.mjs';
// Read-only, fully paginated subject roster. A client-selected subset cannot certify results.
export async function loadCompleteSchoolSubjects({db,api,actor,schoolId,schoolClass,pageSize=100,maxSubjects=100}){
 validateSchoolId(schoolId);
 if(typeof actor?.uid!=='string'||!actor.uid.trim()||!canAccessSchool(actor,schoolId,'read'))throw new Error('School membership required');
 if(!validSchoolClass(schoolClass))throw new Error('Invalid class');
 if(!Number.isInteger(pageSize)||pageSize<1||pageSize>100||!Number.isInteger(maxSubjects)||maxSubjects<1||maxSubjects>100)throw new RangeError('Invalid subject roster bounds');
 for(const key of ['collection','query','where','orderBy','limit','getDocs','startAfter'])if(typeof api?.[key]!=='function')throw new TypeError('Missing Firestore method '+key);
 const identity={uid:actor.uid,role:actor.role,schoolId:actor.schoolId,active:actor.active};
 const verify=()=>{if(!canAccessSchool(actor,schoolId,'read')||Object.keys(identity).some(key=>actor?.[key]!==identity[key]))throw new Error('School membership changed during subject roster load');};
 const subjects=[];let cursor=null,lastId=null,pages=0;
 do{
  verify();
  const filters=[api.where('class','==',schoolClass),api.orderBy('__name__'),api.limit(pageSize+1)];
  if(cursor)filters.push(api.startAfter(cursor));
  const snap=await api.getDocs(api.query(api.collection(db,'schools',schoolId,'subjects'),...filters));
  verify();
  const docs=snap?.docs;
  if(!Array.isArray(docs)||docs.length>pageSize+1)throw new Error('Invalid subject page');
  const loaded=[];
  for(const d of docs){
   if(typeof d?.id!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(d.id)||lastId!==null&&d.id<=lastId)throw new Error('Subject pagination order invalid');
   lastId=d.id;
   if(typeof d.data!=='function')throw new Error('Malformed subject record');
   const data=d.data();
   if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Malformed subject record');
   if(data.schoolId!==schoolId||data.class!==schoolClass)throw new Error('Foreign subject in roster');
   if(data.active!==true)throw new Error(docs.indexOf(d)>=pageSize?'Inactive subject in lookahead':'Inactive subject requires verified exclusion policy');
   if(typeof data.creditHour!=='number'||!Number.isFinite(data.creditHour)||data.creditHour<=0||data.creditHour>100)throw new Error((docs.indexOf(d)>=pageSize?'Subject creditHour missing or invalid in lookahead: ':'Subject creditHour missing or invalid in Firestore: ')+d.id);
   loaded.push({...data,id:d.id});
  }
  verify();
  for(const item of loaded.slice(0,pageSize)){
   subjects.push(item);
   if(subjects.length>maxSubjects)throw new RangeError('Subject roster exceeds configured bound');
  }
  pages++;
  if(pages>Math.ceil(maxSubjects/pageSize)+1)throw new Error('Subject pagination exceeded safe bound');
  if(docs.length>pageSize){
   cursor=docs[pageSize-1];
   if(!cursor)throw new Error('Subject pagination stalled');
   lastId=cursor.id;
  }else cursor=null;
 }while(cursor);
 verify();
 if(!subjects.length)throw new Error('No active subjects in class');
 return {subjects,count:subjects.length,pages};
}
