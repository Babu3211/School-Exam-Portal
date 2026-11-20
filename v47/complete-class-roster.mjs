import {loadClassRoster} from './attendance-roster.mjs';
// Reads every page from the verified school/class collection. Do not use
// a manually selected subset as the authoritative roster.
export async function loadCompleteClassRoster({db,api,actor,schoolId,classId,pageSize=100,maxStudents=1500}){
 if(!Number.isInteger(maxStudents)||maxStudents<1||maxStudents>1500)throw new RangeError('Roster cap must be 1–1500');
 const seen=new Set(),students=[];
 let cursor=null,previous=null,pages=0,lastId=null;
 do{
  const page=await loadClassRoster({db,api,actor,schoolId,schoolClass:classId,pageSize,cursor});
  pages++;
  if(pages>1501)throw new Error('Roster pagination exceeded safe bound');
  for(const student of page.students){
   if(seen.has(student.id))throw new Error('Duplicate student across roster pages');
   if(lastId!==null&&student.id<=lastId)throw new Error('Roster pagination order changed; reload class');
   lastId=student.id;
   seen.add(student.id);students.push(student);
   if(students.length>maxStudents)throw new RangeError('Class roster exceeds '+maxStudents+' students');
  }
  if(page.hasMore){
   if(!page.students.length||!page.cursor||page.cursor.id===previous)throw new Error('Roster pagination stalled');
   previous=page.cursor.id;cursor=page.cursor;
  }else cursor=null;
 }while(cursor);
 if(!students.length)throw new Error('Class has no students');
 return {students,studentIds:students.map(s=>s.id),count:students.length,pages};
}
