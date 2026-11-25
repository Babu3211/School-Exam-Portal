// School Admin staff profile edits: no account, permission, Employee ID or deletion writes.
import {schoolDocumentPath} from './school-paths.mjs';
import {v46StaffExcelRow} from './v46-staff-excel-schema.mjs';
export const STAFF_EDIT_FIELDS=Object.freeze(["nameEnglish","nameNepali","permanentAddress","levelCategory","appointmentDateBs","appointmentType","qualification","subject","phone","status","email"]);
const linked=r=>[r.authUid,r.firebaseUid,r.userUid,r.uid].some(v=>String(v??'').trim()!=='');
export function staffEditSnapshot(record){
 if(!record||typeof record!=='object')throw Error('Staff record required');
 const [staffId,nameNepali,nameEnglish,permanentAddress,levelCategory,appointmentDateBs,appointmentType,qualification,subject,phone,status]=v46StaffExcelRow(record).map(v=>String(v??''));
 const emails=[record.email,record.emailId].map(v=>String(v??'').trim().toLowerCase()).filter(Boolean);
 if(new Set(emails).size>1)throw Error('Staff email conflict; review existing account');
 return {staffId,values:{nameEnglish,nameNepali,permanentAddress,levelCategory,appointmentDateBs,appointmentType,qualification,subject,phone,status,email:emails[0]??''},linked:linked(record)};
}
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export async function saveStaffProfile({db,api,actor,schoolId,id,expected,values,confirmed,assertCurrent}){
 if(confirmed!==true||actor?.schoolId!==schoolId||actor.role!=='school_admin'||actor.active!==true||typeof assertCurrent!=='function')throw Error('School Admin confirmation required');
 const uid=actor.uid;
 const check=()=>{assertCurrent();if(actor.uid!==uid||actor.schoolId!==schoolId||actor.role!=='school_admin'||actor.active!==true)throw Error('School session changed')};
 if(!expected||!values||Object.keys(values).sort().join(',')!==[...STAFF_EDIT_FIELDS].sort().join(','))throw Error('Invalid Staff edit fields');
 const v=Object.fromEntries(STAFF_EDIT_FIELDS.map(k=>{if(typeof values[k]!=='string'||values[k].length>(k==='email'?254:300))throw Error('Invalid Staff detail');return [k,values[k].trim()]}));
 v.email=v.email.toLowerCase();
 if(!v.nameEnglish||v.nameEnglish.length>160||v.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email))throw Error('Valid English name and email required');
 const ref=api.doc(db,schoolDocumentPath(schoolId,'staff',id));
 check();
 return api.runTransaction(db,async tx=>{
  check();
  const school=await tx.get(api.doc(db,'schools',schoolId)),member=await tx.get(api.doc(db,schoolDocumentPath(schoolId,'members',uid))),staff=await tx.get(ref);
  check();
  const s=school.exists()?school.data():null,m=member.exists()?member.data():null,r=staff.exists()?staff.data():null;
  if(s?.id!==schoolId||s.active!==true||m?.uid!==uid||m.schoolId!==schoolId||m.role!=='school_admin'||m.active!==true||r?.schoolId!==schoolId)throw Error('School Admin permission changed');
  const current=staffEditSnapshot(r);
  if(!equal(current,expected))throw Error('Staff details changed; reload before editing');
  if(current.linked&&v.email!==current.values.email)throw Error('Linked account email cannot be changed');
  const {email,...profile}=v;
  // Preserve legacy name storage, role, identifiers, Auth link and unknown fields.
  const patch={...profile,nameEn:v.nameEnglish,position:v.levelCategory};
  if(!Object.hasOwn(r,'name')||Object.hasOwn(r,'position')||Object.hasOwn(r,'nameEnglish'))patch.name=v.nameEnglish;
  if(!current.linked&&email!==current.values.email){patch.email=email;if(Object.hasOwn(r,'emailId'))patch.emailId=email;}
  check();tx.update(ref,patch);
  return {schoolId,id};
 });
}
