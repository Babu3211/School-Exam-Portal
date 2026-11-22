// Read-only preflight against the complete school roster, never just the visible page.
// Does not reserve identifiers; a final save transaction must recheck duplicates.
export async function checkExistingStudentIemisIds({store,accepted,assertSession,maxRecords=20000}){
 if(!store||typeof store.listPage!=='function')throw new TypeError('School store required');
 if(!Array.isArray(accepted)||accepted.length>1500)throw new RangeError('Invalid import rows');
 const identities=new Map(),admissions=new Map();
 for(const item of accepted){
  const id=String(item.student?.studentIemisId??'').trim();
  const admission=String(item.student?.admissionNo??'').trim();
  if(id)identities.set(id,item.row);
  if(admission)admissions.set(admission,item.row);
 }
 const duplicates=[],seen=new Set();let cursor=null,total=0,pages=0;
 if(!identities.size&&!admissions.size)return {duplicates,scanned:0,complete:true};
 do{
  assertSession?.();
  const page=await store.listPage('students',{pageSize:100,cursor});
  assertSession?.();
  if(!Array.isArray(page.records)||page.records.length>100)throw new Error('Invalid school roster page');
  total+=page.records.length;pages++;
  if(total>maxRecords||pages>Math.ceil(maxRecords/100)+1)throw new RangeError('Roster exceeds safe duplicate-check limit');
  for(const student of page.records){
   const id=String(student.studentIemisId??student.studentIEMISId??student.iemisId??student.studentIemisNo??student.iemisStudentNo??'').trim();
   const admission=String(student.admissionNo??student.admissionNumber??'').trim();
   for(const [kind,value,match] of [['Student IEMIS Id',id,identities],['Admission Number',admission,admissions]]){
    const key=kind+':'+value;
    if(value&&match.has(value)&&!seen.has(key)){
     seen.add(key);duplicates.push({kind,value,row:match.get(value),existingStudentId:student.id});
    }
   }
  }
  if(page.hasMore&&(!page.cursor||page.cursor.id===cursor?.id||page.records.length===0))throw new Error('Roster pagination did not advance');
  cursor=page.hasMore?page.cursor:null;
 }while(cursor);
 return {duplicates,scanned:total,complete:true};
}
