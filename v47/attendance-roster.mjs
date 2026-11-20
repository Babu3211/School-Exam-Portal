import {validateSchoolId} from './school-paths.mjs';
import {validSchoolClass} from './class-catalog.mjs';
import {canAccessSchool} from './permissions.mjs';
export async function loadClassRoster({db,api,actor,schoolId,schoolClass,pageSize=100,cursor=null}){
 validateSchoolId(schoolId);
 if(!canAccessSchool(actor,schoolId,'read'))throw new Error('School membership required');
 const identity={uid:actor.uid,role:actor.role,active:actor.active,schoolId:actor.schoolId};
 if(!validSchoolClass(schoolClass))throw new Error('Invalid class');
 if(!Number.isInteger(pageSize)||pageSize<1||pageSize>100)throw new RangeError('Page size must be 1–100');
 if(cursor!==null&&(typeof cursor?.id!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(cursor.id)))throw new TypeError('Invalid roster pagination cursor');
 for(const method of ['collection','query','where','orderBy','limit','getDocs','startAfter'])if(typeof api?.[method]!=='function')throw new TypeError('Missing Firebase SDK method: '+method);
 const constraints=[api.where('class','==',schoolClass),api.orderBy('__name__'),api.limit(pageSize+1)];
 if(cursor)constraints.push(api.startAfter(cursor));
 const snap=await api.getDocs(api.query(api.collection(db,'schools',schoolId,'students'),...constraints));
 if(!canAccessSchool(actor,schoolId,'read')||actor.uid!==identity.uid||actor.role!==identity.role||actor.active!==identity.active||actor.schoolId!==identity.schoolId)throw new Error('School membership changed during roster query');
 const docs=snap.docs;
 if(!Array.isArray(docs)||docs.length>pageSize+1)throw new RangeError('Unexpected result size');
 const ids=new Set();
 let lastId=cursor?.id??null;
 for(const d of docs){
  if(typeof d.id!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(d.id)||ids.has(d.id))throw new Error('Invalid or duplicate roster document ID');
  if(lastId!==null&&d.id<=lastId)throw new Error('Roster query returned out-of-order document IDs');
  ids.add(d.id);lastId=d.id;
 }
 const page=docs.slice(0,pageSize);
 for(const d of docs)if(d.data().schoolId!==schoolId||d.data().class!==schoolClass)throw new Error('Cross-school or wrong-class roster record');
 return {students:page.map(d=>({...d.data(),id:d.id})),hasMore:docs.length>pageSize,cursor:page.at(-1)??null};
}
