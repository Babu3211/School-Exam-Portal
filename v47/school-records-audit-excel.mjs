// Read-only, bounded multi-collection V47 School Records AUDIT Excel.
// NOT an atomic Firestore backup and NOT a supported restore format.
// Firebase Auth users, hidden collections and attachments are not exported.
import {validateSchoolId} from './school-paths.mjs';
import {excelWorkbook} from './excel-workbook.mjs';
export const AUDIT_COLLECTIONS=Object.freeze([
 'students','staff','classes','subjects','subject_assignments',
 'teacher_assignments','exams','marks','component_marks','attendance',
 'mark_settings','school_settings','members','class_mark_drafts'
]);
export const AUDIT_MAX_RECORDS=20000;
const CELL_CHARACTERS=24000,MAX_EXCEL_ROWS=48000;
const SENSITIVE=/^(?:password|passwordHash|passcode|secret|token|refreshToken|accessToken|apiKey|privateKey)$/i;
const HEADERS=Object.freeze(['Collection','Document ID','Part','Parts','JSON Segment']);
function splitText(text){
 const parts=[];
 for(let start=0;start<text.length;){
  let end=Math.min(text.length,start+CELL_CHARACTERS);
  if(end<text.length&&end>start){
   const last=text.charCodeAt(end-1);
   if(last>=0xd800&&last<=0xdbff)end--;
  }
  if(end<=start)throw Error('Invalid Excel audit text segment');
  parts.push(text.slice(start,end));
  start=end;
 }
 return parts;
}
export async function collectSchoolAuditExcel({
 store,actor,schoolId,assertSession,onProgress=()=>{},
 collections=AUDIT_COLLECTIONS,pageSize=100,maxPerCollection=5000,
 maxTotalRecords=AUDIT_MAX_RECORDS,createdAt=new Date().toISOString()
}={}){
 validateSchoolId(schoolId);
 if(!actor||actor.role!=='school_admin'||actor.active!==true||
    actor.schoolId!==schoolId||typeof actor.uid!=='string'||!actor.uid)
  throw Error('Verified School Admin is required for sensitive School Records export');
 if(!store||store.schoolId!==schoolId||typeof store.listPage!=='function')
  throw Error('Verified same-school records reader required');
 if(typeof assertSession!=='function'||typeof onProgress!=='function')
  throw Error('Live export session checks required');
 if(!Array.isArray(collections)||!collections.length||collections.some(n=>!AUDIT_COLLECTIONS.includes(n))||
    new Set(collections).size!==collections.length)throw Error('Unreviewed or duplicate export collection');
 if(!Number.isSafeInteger(pageSize)||pageSize<1||pageSize>100||
    !Number.isSafeInteger(maxPerCollection)||maxPerCollection<1||maxPerCollection>5000||
    !Number.isSafeInteger(maxTotalRecords)||maxTotalRecords<1||maxTotalRecords>AUDIT_MAX_RECORDS)
  throw RangeError('Unsafe export pagination or record limits');
 if(typeof createdAt!=='string'||!Number.isFinite(Date.parse(createdAt))||createdAt.length>40)
  throw Error('Invalid audit collection timestamp');
 const rows=[],counts={},metadata={format:'smss-v47-school-records-audit-v1',schoolId,
  generatedAtClient:createdAt,pointInTime:false,officialBackup:false,restorable:false,
  omitted:'Firebase Auth, external files and unlisted collections',
  sensitiveFieldsRedacted:true,collections:{}};
 let total=0,redacted=0,totalCharacters=0;
 for(const name of collections){
  assertSession();
  let cursor=null,lastId=null,pages=0,count=0;
  do{
   assertSession();
   const page=await store.listPage(name,{pageSize,cursor});
   assertSession();
   if(!page||!Array.isArray(page.records)||page.records.length>pageSize||
      typeof page.hasMore!=='boolean')
    throw Error('Malformed or incomplete '+name+' page; no Excel file created');
   if(page.hasMore&&(!page.records.length||typeof page.cursor?.id!=='string'||!page.cursor.id))
    throw Error('Pagination did not advance in '+name);
   for(const record of page.records){
    if(!record||typeof record!=='object'||Array.isArray(record)||
       record.schoolId!==schoolId||typeof record.id!=='string'||!record.id||
       lastId!==null&&record.id<=lastId)
     throw Error('Duplicate, unsorted or cross-school '+name+' record');
    lastId=record.id;
    count++;total++;
    if(count>maxPerCollection||total>maxTotalRecords)
     throw RangeError('School records exceed configured Excel limit; no partial export');
    const json=JSON.stringify(record,(key,value)=>{
     if(key&&SENSITIVE.test(key)){redacted++;return '[REDACTED]'}
     if(typeof value==='bigint'||typeof value==='function'||typeof value==='symbol')
      throw Error('Unsupported Firestore value in School Records audit');
     return value;
    });
    if(typeof json!=='string')throw Error('Non-serializable school record');
    totalCharacters+=json.length;
    if(totalCharacters>16000000)throw RangeError('School Records Excel exceeds 16 million characters; no partial export');
    const parts=splitText(json);
    if(rows.length+parts.length+1>MAX_EXCEL_ROWS)
     throw RangeError('School Records Excel too large; no partial export');
    for(let i=0;i<parts.length;i++)rows.push([name,record.id,i+1,parts.length,parts[i]]);
   }
   pages++;
   if(pages>Math.ceil(maxPerCollection/pageSize)+1)
    throw Error('School Records pagination did not terminate');
   if(page.hasMore&&page.cursor.id!==lastId)
    throw Error('School Records cursor mismatch');
   assertSession();onProgress({collection:name,count,total});assertSession();
   cursor=page.hasMore?page.cursor:null;
  }while(cursor);
  counts[name]=count;
  metadata.collections[name]=count;
 }
 assertSession();
 metadata.records=total;metadata.redactedFields=redacted;
 const manifest=JSON.stringify(metadata);
 if(manifest.length>CELL_CHARACTERS)throw Error('Audit manifest too large');
 const workbook=excelWorkbook(HEADERS,[['__MANIFEST__',schoolId,1,1,manifest],...rows],{
  sheetName:'School Records Audit'
 });
 assertSession();
 return Object.freeze({
  schoolId,recordCount:total,counts:Object.freeze(counts),
  redactedFields:redacted,complete:true,notDatabaseBackup:true,
  filename:'smss-v47-school-records-AUDIT-'+schoolId+'.xlsx',
  blob:workbook
 });
}
