import {validateSchoolId} from './school-paths.mjs';
import {validSchoolClass} from './class-catalog.mjs';
import {canAccessSchool} from './permissions.mjs';
export async function loadClassRoster({db,api,actor,schoolId,schoolClass,pageSize=100,cursor=null}){
 validateSchoolId(schoolId);
 if(!canAccessSchool(actor,schoolId,'read'))throw new Error('School membership required');
 if(!validSchoolClass(schoolClass))throw new Error('Invalid class');
 if(!Number.isInteger(pageSize)||pageSize<1||pageSize>100)throw new RangeError('Page size must be 1–100');
 for(const method of ['collection','query','where','orderBy','limit','getDocs','startAfter'])if(typeof api?.[method]!=='function')throw new TypeError('Missing Firebase SDK method: '+method);
 const constraints=[api.where('class','==',schoolClass),api.orderBy('__name__'),api.limit(pageSize+1)];
 if(cursor)constraints.push(api.startAfter(cursor));
 const snap=await api.getDocs(api.query(api.collection(db,'schools',schoolId,'students'),...constraints));
 const docs=snap.docs;
 if(!Array.isArray(docs)||docs.length>pageSize+1)throw new RangeError('Unexpected result size');
 const ids=new Set();
 for(const d of docs){if(typeof d.id!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(d.id)||ids.has(d.id))throw new Error('Invalid or duplicate roster document ID');ids.add(d.id);}
 const page=docs.slice(0,pageSize);
 for(const d of page)if(d.data().schoolId!==schoolId||d.data().class!==schoolClass)throw new Error('Cross-school or wrong-class roster record');
 return {students:page.map(d=>({...d.data(),id:d.id})),hasMore:docs.length>pageSize,cursor:page.at(-1)??null};
}
