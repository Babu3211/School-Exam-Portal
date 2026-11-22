import {validateSchoolId} from './school-paths.mjs';
import {validSchoolClass} from './class-catalog.mjs';
import {canAccessSchool} from './permissions.mjs';
export async function loadClassRoster({db,api,actor,schoolId,schoolClass,pageSize=100,cursor=null}){
 validateSchoolId(schoolId);
 if(typeof actor?.uid!=='string'||!actor.uid.trim()||!canAccessSchool(actor,schoolId,'read'))throw new Error('School membership required');
 const identity={uid:actor.uid,role:actor.role,active:actor.active,schoolId:actor.schoolId};
 if(!validSchoolClass(schoolClass))throw new Error('Invalid class');
 if(!Number.isInteger(pageSize)||pageSize<1||pageSize>100)throw new RangeError('Page size must be 1–100');
 if(cursor!==null&&(typeof cursor?.id!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(cursor.id)||
  cursor.ref?.path!==undefined&&cursor.ref.path!=='schools/'+schoolId+'/students/'+cursor.id||
  cursor.schoolId!==undefined&&cursor.schoolId!==schoolId||
  cursor.class!==undefined&&cursor.class!==schoolClass))throw new TypeError('Invalid roster pagination cursor');
 for(const method of ['collection','query','where','orderBy','limit','getDocs','startAfter'])if(typeof api?.[method]!=='function')throw new TypeError('Missing Firebase SDK method: '+method);
 const constraints=[api.where('class','==',schoolClass),api.orderBy('__name__'),api.limit(pageSize+1)];
 // Ordered by document ID: Firestore startAfter expects the ordered ID value,
 // not the materialized student object returned as our UI pagination cursor.
 if(cursor)constraints.push(api.startAfter(cursor.id));
 const snap=await api.getDocs(api.query(api.collection(db,'schools',schoolId,'students'),...constraints));
 if(!canAccessSchool(actor,schoolId,'read')||actor.uid!==identity.uid||actor.role!==identity.role||actor.active!==identity.active||actor.schoolId!==identity.schoolId)throw new Error('School membership changed during roster query');
 const docs=snap?.docs;
 if(!Array.isArray(docs)||docs.length>pageSize+1)throw new RangeError('Unexpected result size');
 const ids=new Set();
 let lastId=cursor?.id??null;
 for(const d of docs){
  if(!d||d.ref?.path!==undefined&&d.ref.path!=='schools/'+schoolId+'/students/'+d.id||typeof d.id!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(d.id)||ids.has(d.id))throw new Error('Invalid or duplicate roster document ID');
  if(lastId!==null&&d.id<=lastId)throw new Error('Roster query returned out-of-order document IDs');
  ids.add(d.id);lastId=d.id;
 }
 const students=docs.map(d=>{
  if(typeof d.data!=='function')throw new Error('Malformed roster document');
  const data=d.data();
  if(!data||typeof data!=='object'||Array.isArray(data)||data.schoolId!==schoolId||data.class!==schoolClass)throw new Error('Cross-school or wrong-class roster record');
  return {...data,id:d.id};
 });
 if(!canAccessSchool(actor,schoolId,'read')||actor.uid!==identity.uid||actor.role!==identity.role||actor.active!==identity.active||actor.schoolId!==identity.schoolId)throw new Error('School membership changed during roster query');
 const page=docs.slice(0,pageSize);
 return {students:students.slice(0,pageSize),hasMore:docs.length>pageSize,cursor:page.at(-1)??null};
}
