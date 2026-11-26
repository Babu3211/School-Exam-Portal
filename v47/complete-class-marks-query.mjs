import {loadMarksByClassTerm} from './marks-query.mjs';
// Read every school-scoped marks page before any class completeness check.
// This is a read-only snapshot, not an atomic exam publication transaction.
export async function loadAllClassMarks({db,api,actor,schoolId,schoolClass,term,examId=null,pageSize=100,maxRecords=30000}){
 if(!Number.isInteger(pageSize)||pageSize<1||pageSize>100)throw new RangeError('Invalid marks page size');
 if(!Number.isInteger(maxRecords)||maxRecords<1||maxRecords>30000)throw new RangeError('Invalid marks record limit');
 const identity={uid:actor?.uid,schoolId:actor?.schoolId,role:actor?.role,active:actor?.active};
 const verify=()=>{if(actor?.uid!==identity.uid||actor?.schoolId!==identity.schoolId||actor?.role!==identity.role||actor?.active!==identity.active)throw new Error('School identity changed while loading marks');};
 const records=[],seen=new Set();
 let cursor=null,previous=null,pages=0;
 do{
  verify();
  const page=await loadMarksByClassTerm({db,api,actor,schoolId,schoolClass,term,examId,pageSize,cursor});
  verify();
  pages++;
  if(pages>Math.ceil(maxRecords/pageSize)+1)throw new Error('Marks pagination exceeded safety bound');
  if(!page||typeof page.hasMore!=='boolean'||!Array.isArray(page.records)||page.records.length>pageSize)throw new Error('Invalid marks page');
  for(const record of page.records){
   if(typeof record.id!=='string'||!record.id||seen.has(record.id))throw new Error('Duplicate or invalid marks document');
   if(previous!==null&&record.id<=previous)throw new Error('Marks pagination order changed');
   if(record.class!==schoolClass||record.term!==term||examId!==null&&record.examId!==examId)throw new Error('Unexpected marks class or term');
   seen.add(record.id);previous=record.id;records.push(record);
   if(records.length>maxRecords)throw new RangeError('Marks exceed safe read limit');
  }
  if(page.hasMore){
   if(!page.records.length||!page.cursor||page.cursor.id!==previous)throw new Error('Marks pagination stalled');
   cursor=page.cursor;
  }else{
   if(page.cursor!==null&&page.cursor?.id!==previous)throw new Error('Marks terminal cursor mismatch');
   cursor=null;
  }
 }while(cursor);
 verify();
 return {records,count:records.length,pages,hasMore:false,diagnosticOnly:true};
}
