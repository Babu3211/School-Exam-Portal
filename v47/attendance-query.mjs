import {validateSchoolId} from './school-paths.mjs';
import {validSchoolClass} from './class-catalog.mjs';
import {validateAttendance} from './attendance-service.mjs';
import {canAccessSchool} from './permissions.mjs';
export async function loadAttendanceByClassDate({db,api,actor,schoolId,schoolClass,date,pageSize=100,cursor=null}){
 validateSchoolId(schoolId);
 if(!canAccessSchool(actor,schoolId,'read'))throw new Error('School membership required');
 if(!validSchoolClass(schoolClass))throw new Error('Invalid class');
 validateAttendance({date,studentId:'probe',class:schoolClass,present:true});
 if(!Number.isInteger(pageSize)||pageSize<1||pageSize>100)throw new RangeError('Page size must be 1–100');
 for(const method of ['collection','query','where','orderBy','limit','getDocs','startAfter'])if(typeof api?.[method]!=='function')throw new TypeError('Missing Firebase SDK method: '+method);
 const constraints=[api.where('date','==',date),api.where('class','==',schoolClass),api.orderBy('__name__'),api.limit(pageSize+1)];
 if(cursor!==null){
  if(typeof cursor?.id!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(cursor.id))throw new Error('Invalid attendance pagination cursor');
  constraints.push(api.startAfter(cursor.id));
 }
 const snapshot=await api.getDocs(api.query(api.collection(db,'schools',schoolId,'attendance'),...constraints));
 if(!canAccessSchool(actor,schoolId,'read'))throw new Error('School membership changed during attendance query');
 const docs=snapshot?.docs;
 if(!Array.isArray(docs)||docs.length>pageSize+1)throw new RangeError('Unexpected result size');
 let previous=cursor?.id??null;
 const records=[];
 for(const d of docs){
  if(!d||typeof d.id!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(d.id)||
   (previous!==null&&d.id<=previous)||typeof d.data!=='function')throw new Error('Malformed or out-of-order attendance result');
  previous=d.id;
  const data=d.data();
  if(!data||typeof data!=='object'||Array.isArray(data)||data.schoolId!==schoolId||
   data.class!==schoolClass||data.date!==date)throw new Error('Cross-school or wrong-class attendance record');
  if(records.length<pageSize)records.push({...data,id:d.id});
 }
 if(!canAccessSchool(actor,schoolId,'read'))throw new Error('School membership changed during attendance query');
 return {records,hasMore:docs.length>pageSize,cursor:docs.slice(0,pageSize).at(-1)??null};
}
