// Same-origin isolated V47 API only. No direct Firestore writes or batch fallback.
export async function requestAtomicAttendance({schoolId,classId,date,entries,reviewDigest,getIdToken,fetchImpl,assertCurrent}){
 if(typeof getIdToken!=='function'||typeof fetchImpl!=='function'||typeof assertCurrent!=='function'||
    !Array.isArray(entries)||!entries.length||entries.length>500||
    (reviewDigest!==null&&(typeof reviewDigest!=='string'||!/^[a-f0-9]{64}$/.test(reviewDigest))))throw Error('Invalid atomic attendance request');
 assertCurrent();const token=await getIdToken();assertCurrent();
 if(typeof token!=='string'||!token.trim())throw Error('Verified login required');
 const response=await fetchImpl('/api/v47/attendance/atomic',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
  credentials:'same-origin',cache:'no-store',redirect:'error',body:JSON.stringify({schoolId,classId,date,entries,reviewDigest})});
 assertCurrent();
 if(!response?.ok)throw Error('Isolated atomic attendance API unavailable or review changed');
 let body;try{body=await response.json()}catch{throw Error('Atomic attendance API response unavailable')}
 assertCurrent();const r=body?.result;
 if(r?.atomic!==true||r.schoolId!==schoolId||r.classId!==classId||r.date!==date||
    r.count!==entries.length||!Number.isInteger(r.changed)||r.changed<0||r.changed>r.count||
    r.committed!==(reviewDigest!==null)||(reviewDigest===null&&!/^[a-f0-9]{64}$/.test(r.reviewDigest??'')))
  throw Error('Unexpected or unverified atomic attendance response');
 return r;
}
