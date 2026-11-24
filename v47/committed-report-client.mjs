// Browser-only, read-only request to the same-origin isolated server.
import {prepareCommittedIemisReport} from './committed-iemis-report-preview.mjs';
export async function loadCommittedReportPreview({schoolId,classNo,term,getIdToken,fetchImpl,assertCurrent}){
 if(typeof schoolId!=='string'||!/^\d{5,20}$/.test(schoolId)||
    typeof classNo!=='string'||!/^(?:[1-9]|10)$/.test(classNo)||!['1st','2nd','3rd','final'].includes(term)||
    typeof getIdToken!=='function'||typeof fetchImpl!=='function'||typeof assertCurrent!=='function')
  throw Error('Verified report request required');
 assertCurrent();
 const token=await getIdToken();assertCurrent();
 if(typeof token!=='string'||!token.trim())throw Error('Verified login required');
 const params=new URLSearchParams({schoolId,classId:classNo,examId:term});
 const response=await fetchImpl('/api/v47/committed-report?'+params,{
  method:'GET',headers:{Authorization:'Bearer '+token,Accept:'application/json'},
  cache:'no-store',credentials:'same-origin',redirect:'error'
 });
 assertCurrent();
 if(!response?.ok)throw Error('Committed report unavailable; isolated server and complete publications required');
 let body;
 try{body=await response.json()}catch{throw Error('Committed report API unavailable; static Hosting cannot serve this preview')}
 assertCurrent();
 const s=body?.snapshot;
 if(body?.previewOnly!==true||body.cdcGradeApproved!==false||s?.schoolId!==schoolId||s.classNo!==classNo||s.term!==term)
  throw Error('Unexpected or foreign report response');
 const report=prepareCommittedIemisReport(s);
 assertCurrent();
 return report;
}
