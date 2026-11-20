// Read-only tenant-scoped Firestore snapshot loader for V46 component marks.
// Requires authenticated caller to provide the tenant-bound Firebase API and school collection.
export async function loadTenantIemisClassRecords({api,collection,schoolId,classNo,term,examId,assertCurrent=()=>{}}){
 if(typeof schoolId!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(schoolId))throw Error('Invalid school scope');
 if(!Number.isInteger(Number(classNo))||Number(classNo)<1||Number(classNo)>10)throw Error('V46 IEMIS supports classes 1–10');
 if(!['1st','2nd','3rd','final'].includes(term))throw Error('Unsupported IEMIS term');
 if(typeof examId!=='string'||!examId.trim())throw Error('Verified exam ID required');
 if(typeof collection!=='function'||!api?.query||!api?.getDocs||!api?.where||!api?.orderBy||!api?.limit)throw Error('Authenticated Firestore reader required');
 const results=[];let cursor;
 for(let page=0;page<40;page++){
  assertCurrent();
  const constraints=[api.where('class','==',String(classNo)),api.where('term','==',term),api.where('examId','==',examId),api.orderBy('__name__')];
  if(cursor)constraints.push(api.startAfter(cursor));
  constraints.push(api.limit(200));
  const snap=await api.getDocs(api.query(collection('marks'),...constraints));
  assertCurrent();
  if(!snap||!Array.isArray(snap.docs))throw Error('Invalid marks snapshot');
  for(const doc of snap.docs){
   const record=doc.data();
   if(!record||record.schoolId!==schoolId||record.class!==String(classNo)||record.term!==term||record.examId!==examId)throw Error('Cross-school or mismatched marks snapshot');
   results.push({...record,id:doc.id});
  }
  if(results.length>6000)throw Error('Class marks snapshot exceeds safe limit');
  if(snap.docs.length<200)return results;
  cursor=snap.docs[snap.docs.length-1];
 }
 throw Error('Class marks snapshot pagination incomplete');
}
