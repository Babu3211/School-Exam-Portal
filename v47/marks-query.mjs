import {validateSchoolId} from './school-paths.mjs';
import {canAccessSchool} from './permissions.mjs';
import {validSchoolClass} from './class-catalog.mjs';
import {validateExamTerm} from './term-catalog.mjs';
export async function loadMarksByClassTerm({db,api,actor,schoolId,schoolClass,term,pageSize=50,cursor=null}){
 validateSchoolId(schoolId);
 if(typeof actor?.uid!=='string'||!actor.uid.trim()||!canAccessSchool(actor,schoolId,'read'))throw new Error('School membership required');
 if(!validSchoolClass(schoolClass))throw new Error('Invalid class');
 validateExamTerm(term);
 if(!Number.isInteger(pageSize)||pageSize<1||pageSize>100)throw new RangeError('Page size must be 1–100');
 for(const method of ['collection','query','where','orderBy','limit','getDocs','startAfter'])if(typeof api?.[method]!=='function')throw new TypeError('Missing Firebase SDK: '+method);
 const identity={uid:actor?.uid,schoolId:actor?.schoolId,role:actor?.role,active:actor?.active};
 if(cursor!==null&&(typeof cursor?.id!=='string'||!/^[A-Za-z0-9_:-]{1,256}$/.test(cursor.id)||
  cursor.ref?.path!==undefined&&cursor.ref.path!=='schools/'+schoolId+'/marks/'+cursor.id||
  cursor.schoolId!==undefined&&cursor.schoolId!==schoolId||
  cursor.class!==undefined&&cursor.class!==schoolClass||
  cursor.term!==undefined&&cursor.term!==term))throw new Error('Invalid marks cursor');
 const filters=[api.where('class','==',schoolClass),api.where('term','==',term),api.orderBy('__name__'),api.limit(pageSize+1)];
 if(cursor)filters.push(api.startAfter(cursor));
 const snap=await api.getDocs(api.query(api.collection(db,'schools',schoolId,'marks'),...filters));
 if(!canAccessSchool(actor,schoolId,'read')||Object.keys(identity).some(key=>actor?.[key]!==identity[key]))throw new Error('School membership changed during marks query');
 const docs=snap?.docs;
 if(!Array.isArray(docs)||docs.length>pageSize+1)throw new RangeError('Unexpected result size');
 const ids=new Set(),validated=[];let previous=cursor?.id??null;
 for(const d of docs){
  if(!d||d.ref?.path!==undefined&&d.ref.path!=='schools/'+schoolId+'/marks/'+d.id||
    typeof d.id!=='string'||!/^[A-Za-z0-9_:-]{1,256}$/.test(d.id)||ids.has(d.id)||previous!==null&&d.id<=previous)throw new Error('Invalid marks page order');
  ids.add(d.id);previous=d.id;
  if(typeof d.data!=='function')throw new Error('Malformed marks document');
  const data=d.data();
  if(!data||typeof data!=='object'||Array.isArray(data)||data.schoolId!==schoolId||data.class!==schoolClass||data.term!==term)throw new Error('Foreign or mismatched marks record');
  if(typeof data.studentId!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(data.studentId)||typeof data.subjectId!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(data.subjectId))throw new Error('Invalid marks student or subject identity');
  validated.push({...data,id:d.id});
 }
 if(!canAccessSchool(actor,schoolId,'read')||Object.keys(identity).some(key=>actor?.[key]!==identity[key]))throw new Error('School membership changed during marks query');
 const page=docs.slice(0,pageSize);
 return {records:validated.slice(0,pageSize),hasMore:docs.length>pageSize,cursor:page.at(-1)??null};
}
