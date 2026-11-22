import {loadClassRoster} from './attendance-roster.mjs';
// Reads every page from the verified school/class collection. Do not use
// a manually selected subset as the authoritative roster.
export async function loadCompleteClassRoster({db,api,actor,schoolId,classId,pageSize=100,maxStudents=1500}){
 if(!Number.isInteger(maxStudents)||maxStudents<1||maxStudents>1500)throw new RangeError('Roster cap must be 1–1500');
 if(!Number.isInteger(pageSize)||pageSize<1||pageSize>100)throw new RangeError('Page size must be 1–100');
 const identity={uid:actor?.uid,role:actor?.role,active:actor?.active,schoolId:actor?.schoolId};
 const checkIdentity=()=>{if(actor?.uid!==identity.uid||actor?.role!==identity.role||actor?.active!==identity.active||actor?.schoolId!==identity.schoolId)throw new Error('School membership changed during roster load');};
 const seen=new Set(),students=[];
 let cursor=null,previous=null,pages=0,lastId=null;
 do{
  checkIdentity();
  const page=await loadClassRoster({db,api,actor,schoolId,schoolClass:classId,pageSize,cursor});
  checkIdentity();
  pages++;
  if(pages>Math.ceil(maxStudents/pageSize)+1)throw new Error('Roster pagination exceeded safe bound');
  if(!Array.isArray(page?.students)||page.students.length>pageSize||typeof page.hasMore!=='boolean')throw new Error('Invalid roster page');
  for(const student of page.students){
   if(seen.has(student.id))throw new Error('Duplicate student across roster pages');
   if(lastId!==null&&student.id<=lastId)throw new Error('Roster pagination order changed; reload class');
   lastId=student.id;
   seen.add(student.id);students.push(student);
   if(students.length>maxStudents)throw new RangeError('Class roster exceeds '+maxStudents+' students');
  }
  if(page.hasMore){
   if(!page.students.length||!page.cursor||page.cursor.id===previous)throw new Error('Roster pagination stalled');
   if(page.cursor.id!==lastId)throw new Error('Roster cursor does not match last student');
   previous=page.cursor.id;cursor=page.cursor;
  }else{
   if(page.cursor!==null&&page.cursor?.id!==lastId)throw new Error('Roster terminal cursor mismatch');
   cursor=null;
  }
 }while(cursor);
 checkIdentity();
 if(!students.length)throw new Error('Class has no students');
 return {students,studentIds:students.map(s=>s.id),count:students.length,pages};
}
