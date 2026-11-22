import {validateSchoolId} from './school-paths.mjs';
import {validSchoolClass} from './class-catalog.mjs';
import {validateExamTerm} from './term-catalog.mjs';

const COLLECTIONS=new Set(['students','subjects','subject_assignments','marks','component_marks']);
const DOCUMENT_ID=/^[A-Za-z0-9_:-]{1,256}$/;

// Validate every paginated Firestore result before rendering/exporting any tenant data.
// Firestore document paths alone are insufficient if a migrated record embeds a foreign school ID.
export function validateLedgerReviewPage({docs,schoolId,schoolClass,term,collection,previousId=null}){
 validateSchoolId(schoolId);
 if(!validSchoolClass(schoolClass))throw new Error('Invalid ledger review class');
 validateExamTerm(term);
 if(!COLLECTIONS.has(collection))throw new Error('Unsupported ledger review collection');
 if(!Array.isArray(docs)||docs.length>100)throw new Error('Invalid ledger review page size');
 if(previousId!==null&&(typeof previousId!=='string'||!DOCUMENT_ID.test(previousId)))throw new Error('Invalid ledger review cursor');
 let lastId=previousId;
 const records=[];
 for(const doc of docs){
  if(!doc||typeof doc.id!=='string'||!DOCUMENT_ID.test(doc.id)||lastId!==null&&doc.id<=lastId)
   throw new Error('Invalid or out-of-order ledger review document');
  if(doc.ref?.path!==undefined&&doc.ref.path!=='schools/'+schoolId+'/'+collection+'/'+doc.id)
   throw new Error('Foreign ledger review document path');
  if(typeof doc.data!=='function')throw new Error('Malformed ledger review document');
  const data=doc.data();
  if(!data||typeof data!=='object'||Array.isArray(data)||data.schoolId!==schoolId||data.class!==schoolClass||
   data.id!==undefined&&data.id!==doc.id||
   (collection==='marks'||collection==='component_marks')&&data.term!==term)
   throw new Error('Foreign or mismatched ledger review record');
  records.push({...data,id:doc.id});
  lastId=doc.id;
 }
 return records;
}
