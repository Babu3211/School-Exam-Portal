import {validateSchoolId} from './school-paths.mjs';
import {canAccessSchool} from './permissions.mjs';
import {validSchoolClass} from './class-catalog.mjs';
import {validateExamTerm} from './term-catalog.mjs';
export async function loadMarksByClassTerm({db,api,actor,schoolId,schoolClass,term,pageSize=50,cursor=null}){
 validateSchoolId(schoolId);
 if(!canAccessSchool(actor,schoolId,'read'))throw new Error('School membership required');
 if(!validSchoolClass(schoolClass))throw new Error('Invalid class');
 validateExamTerm(term);
 if(!Number.isInteger(pageSize)||pageSize<1||pageSize>100)throw new RangeError('Page size must be 1–100');
 for(const method of ['collection','query','where','orderBy','limit','getDocs','startAfter'])if(typeof api?.[method]!=='function')throw new TypeError('Missing Firebase SDK: '+method);
 const filters=[api.where('class','==',schoolClass),api.where('term','==',term),api.orderBy('__name__'),api.limit(pageSize+1)];
 if(cursor)filters.push(api.startAfter(cursor));
 const snap=await api.getDocs(api.query(api.collection(db,'schools',schoolId,'marks'),...filters));
 const docs=snap.docs;
 if(!Array.isArray(docs)||docs.length>pageSize+1)throw new RangeError('Unexpected result size');
 return {records:docs.slice(0,pageSize).map(d=>({...d.data(),id:d.id})),hasMore:docs.length>pageSize,cursor:docs.slice(0,pageSize).at(-1)??null};
}
