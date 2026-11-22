// Pure integrity check for a proposed class staging plan. This is NOT a
// cryptographic signature, a Firestore authorization check or publication.
export function verifyClassMarkStagingPlan(plan){
 if(!plan||typeof plan!=='object'||plan.diagnosticOnly!==true||plan.canPublish!==false)
  throw new Error('Untrusted staging plan');
 if(!Number.isSafeInteger(plan.studentCount)||plan.studentCount<1||plan.studentCount>1500
  ||!Number.isSafeInteger(plan.chunkCount)||plan.chunkCount<1
  ||!Array.isArray(plan.chunks)||plan.chunks.length!==plan.chunkCount)
  throw new Error('Invalid staging manifest counts');
 const ids=new Set();
 let offset=0,previous=null;
 for(let index=0;index<plan.chunks.length;index++){
  const chunk=plan.chunks[index];
  if(!chunk||chunk.index!==index||chunk.offset!==offset||!Array.isArray(chunk.rows)
   ||chunk.rows.length<1||chunk.rows.length>200||chunk.count!==chunk.rows.length
   ||chunk.firstStudentId!==chunk.rows[0]?.studentId
   ||chunk.lastStudentId!==chunk.rows.at(-1)?.studentId)
   throw new Error('Staging chunk boundary mismatch');
  for(const row of chunk.rows){
   if(!row||typeof row.studentId!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(row.studentId)
    ||ids.has(row.studentId)||previous!==null&&row.studentId<=previous
    ||row.schoolId!==plan.schoolId||row.class!==plan.classId
    ||row.term!==plan.term||row.subjectId!==plan.subjectId
    ||typeof row.theory!=='number'||!Number.isFinite(row.theory)||row.theory<0
    ||typeof row.practical!=='number'||!Number.isFinite(row.practical)||row.practical<0)
    throw new Error('Staging row identity, order or marks invalid');
   ids.add(row.studentId);previous=row.studentId;
  }
  offset+=chunk.count;
 }
 if(offset!==plan.studentCount||ids.size!==plan.studentCount)
  throw new Error('Staging plan student count mismatch');
 return Object.freeze({valid:true,studentCount:offset,chunkCount:plan.chunkCount,diagnosticOnly:true,canPublish:false});
}
