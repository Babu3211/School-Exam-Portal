// New Staff only. No account provisioning, role changes, overwrites or deletes.
import {previewV46StaffExcelRows} from './staff-excel-preview.mjs';
import {checkExistingStaffEmployeeIds} from './staff-import-duplicate-preflight.mjs';
import {validateSchoolId,schoolDocumentPath} from './school-paths.mjs';
export const MAX_STAFF_IMPORT=100;
export async function importNewStaff({db,api,actor,schoolId,cells,store,confirmed,assertCurrent}){
 validateSchoolId(schoolId);
 const uid=actor?.uid;
 if(confirmed!==true||actor?.schoolId!==schoolId||actor.role!=='school_admin'||actor.active!==true||typeof uid!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(uid)||typeof assertCurrent!=='function'||store?.schoolId!==schoolId)throw Error('Verified School Admin confirmation required');
 const check=()=>{assertCurrent();if(actor.uid!==uid||actor.role!=='school_admin'||actor.schoolId!==schoolId||actor.active!==true)throw Error('School session changed')};
 check();
 const preview=previewV46StaffExcelRows({schoolId,cells});
 if(!preview.ready||preview.warnings.length||preview.rows.length<1||preview.rows.length>MAX_STAFF_IMPORT)throw Error('Import requires 1–100 valid rows with Employee ID and English name');
 const existing=await checkExistingStaffEmployeeIds({store,preview,assertSession:check});
 if(!existing.ready||!existing.scannedAll||existing.scanned+preview.rows.length>5000)throw Error('Duplicate Employee ID or school Staff limit; no import');
 const records=[];
 for(const item of preview.rows){
  const [staffId,nameNepali,nameEnglish,permanentAddress,levelCategory,appointmentDateBs,appointmentType,qualification,subject,phone,status]=item.cells;
  const digest=await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(staffId.toUpperCase()));
  check();
  const id='staff_'+Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
  records.push({id,data:{schoolId,staffId,name:nameEnglish,nameEnglish,nameNepali,position:levelCategory,levelCategory,permanentAddress,appointmentDateBs,appointmentType,qualification,subject,phone,status:status||'कार्यरत'}});
 }
 const ref=(...p)=>api.doc(db,...p);
 return api.runTransaction(db,async tx=>{
  check();
  const school=await tx.get(ref('schools',schoolId)),member=await tx.get(ref('schools',schoolId,'members',uid));
  check();
  const s=school.exists()?school.data():null,m=member.exists()?member.data():null;
  if(s?.id!==schoolId||s.active!==true||m?.uid!==uid||m.schoolId!==schoolId||m.role!=='school_admin'||m.active!==true)throw Error('School Admin permission changed');
  const targets=records.map(r=>api.doc(db,schoolDocumentPath(schoolId,'staff',r.id)));
  for(const target of targets){if((await tx.get(target)).exists())throw Error('Employee ID already imported; reload staff');check()}
  for(let i=0;i<records.length;i++){check();tx.set(targets[i],records[i].data)}
  return {schoolId,count:records.length,accountsCreated:false};
 });
}
