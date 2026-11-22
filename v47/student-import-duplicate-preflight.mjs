// Read-only preflight against the complete school roster, never just the visible page.
// Does not reserve identifiers; a final save transaction must recheck duplicates.
export async function checkExistingStudentIemisIds({store,accepted,assertSession,maxRecords=20000}){
 if(!store||typeof store.listPage!=='function')throw new TypeError('School store required');
 if(!Array.isArray(accepted)||accepted.length>1500)throw new RangeError('Invalid import rows');
 const ids=new Set(accepted.map(item=>item.student?.studentIemisId).filter(Boolean));
 const duplicates=[],seen=new Set();let cursor=null,total=0,pages=0;
 if(!ids.size)return {duplicates,scanned:0,complete:true};
 do{
  assertSession?.();
  const page=await store.listPage('students',{pageSize:100,cursor});
  assertSession?.();
  if(!Array.isArray(page.records)||page.records.length>100)throw new Error('Invalid school roster page');
  total+=page.records.length;pages++;
  if(total>maxRecords||pages>Math.ceil(maxRecords/100)+1)throw new RangeError('Roster exceeds safe duplicate-check limit');
  for(const student of page.records){
   const id=String(student.studentIemisId??'').trim();
   if(ids.has(id)&&!seen.has(id)){seen.add(id);duplicates.push({studentIemisId:id,existingStudentId:student.id})}
  }
  if(page.hasMore&&(!page.cursor||page.cursor.id===cursor?.id||page.records.length===0))throw new Error('Roster pagination did not advance');
  cursor=page.hasMore?page.cursor:null;
 }while(cursor);
 return {duplicates,scanned:total,complete:true};
}
