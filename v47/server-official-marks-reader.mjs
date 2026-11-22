// Trusted-server reader boundary: only committed publication pointers may
// select official marks. Staging IDs and draft rows are never a fallback.
// The caller must authenticate and fetch these records from the same tenant.
const id=/^[A-Za-z0-9_-]{8,128}$/;
const segment=/^[A-Za-z0-9_-]{1,128}$/;
export function resolveOfficialClassMarks({schoolId,classId,subjectId,examId,pointer,publication,entries}){
 if(typeof schoolId!=='string'||!/^[0-9]{5,20}$/.test(schoolId)||
  ![classId,subjectId,examId].every(v=>typeof v==='string'&&segment.test(v)))throw new Error('Invalid official result scope');
 if(pointer===null||pointer===undefined)return Object.freeze({published:false,schoolId,classId,subjectId,examId,entries:Object.freeze([])});
 if(!pointer||typeof pointer!=='object'||Array.isArray(pointer)||!id.test(pointer.publicationId??''))throw new Error('Invalid official pointer');
 for(const key of ['schoolId','classId','subjectId','examId']){
  if(pointer[key]!==({schoolId,classId,subjectId,examId})[key])throw new Error('Official pointer scope mismatch');
 }
 if(!publication||publication.publicationId!==pointer.publicationId||publication.state!=='committed'||
  publication.digest!==pointer.digest||typeof publication.digest!=='string'||!/^[a-f0-9]{64}$/.test(publication.digest))
  throw new Error('Committed publication missing or mismatched');
 for(const key of ['schoolId','classId','subjectId','examId']){
  if(publication[key]!==pointer[key])throw new Error('Publication scope mismatch');
 }
 if(!Number.isSafeInteger(pointer.rosterCount)||pointer.rosterCount<1||pointer.rosterCount>1500||
  publication.rosterCount!==pointer.rosterCount||!Array.isArray(entries)||entries.length!==pointer.rosterCount)
  throw new Error('Official publication roster incomplete');
 const seen=new Set(),rows=[];
 for(const row of entries){
  if(!row||typeof row!=='object'||Array.isArray(row)||row.publicationId!==pointer.publicationId||
   typeof row.studentId!=='string'||!segment.test(row.studentId)||seen.has(row.studentId)||
   typeof row.isAbsent!=='boolean')throw new Error('Invalid or duplicate official marks row');
  if(row.isAbsent){
   if(row.values!==null||row.totalObtained!==0)throw new Error('Invalid absent marks row');
  }else{
   if(!row.values||typeof row.values!=='object'||Array.isArray(row.values)||
    Object.keys(row.values).length===0||Object.values(row.values).some(v=>typeof v!=='number'||!Number.isFinite(v)||v<0)||
    typeof row.totalObtained!=='number'||!Number.isFinite(row.totalObtained)||
    Math.abs(Object.values(row.values).reduce((sum,v)=>sum+v,0)-row.totalObtained)>1e-7)throw new Error('Invalid official component marks');
  }
  seen.add(row.studentId);
  rows.push(Object.freeze({studentId:row.studentId,isAbsent:row.isAbsent,values:row.isAbsent?null:Object.freeze({...row.values}),totalObtained:row.totalObtained}));
 }
 rows.sort((a,b)=>a.studentId.localeCompare(b.studentId,'en'));
 return Object.freeze({published:true,schoolId,classId,subjectId,examId,publicationId:pointer.publicationId,digest:pointer.digest,rosterCount:rows.length,entries:Object.freeze(rows)});
}
