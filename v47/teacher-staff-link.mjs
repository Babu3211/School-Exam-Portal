// Staff linking is descriptive only. Firestore membership remains the authorization source.
import {schoolDocumentPath} from './school-paths.mjs';
import {v46StaffExcelRow} from './v46-staff-excel-schema.mjs';
const nameKey=v=>String(v??'').trim().replace(/\s+/g,' ').normalize('NFC').toLowerCase();
const emailKey=v=>String(v??'').trim().toLowerCase();
const recordName=r=>nameKey(v46StaffExcelRow(r)[2]);
function recordEmail(r){
 const values=[r.email,r.emailId].map(emailKey).filter(Boolean);
 if(new Set(values).size>1)return null;
 return values[0]??'';
}
const linked=r=>[r.authUid,r.firebaseUid,r.userUid,r.uid].some(v=>v!==undefined&&v!==null&&String(v).trim()!=='');
export function matchTeacherStaff(rows,staff,schoolId){
 if(!Array.isArray(rows)||!Array.isArray(staff))throw Error('Staff सूची अमान्य छ।');
 const ids=new Set();
 for(const s of staff){
  if(!s||s.schoolId!==schoolId||typeof s.id!=='string'||ids.has(s.id))throw Error('Staff सूचीको विद्यालय वा ID मिलेन।');
  schoolDocumentPath(schoolId,'staff',s.id);ids.add(s.id);
 }
 const used=new Set();
 return rows.map(row=>{
  const n=nameKey(row.name),e=emailKey(row.email);
  const names=staff.filter(s=>recordName(s)===n);
  const emails=staff.filter(s=>[s.email,s.emailId].some(x=>emailKey(x)===e));
  if(!names.length&&!emails.length)return {row:row.row,status:'unmatched'};
  const candidate=emails.length===1?emails[0]:names.length===1?names[0]:null;
  if(!candidate||emails.length>1||recordName(candidate)!==n||recordEmail(candidate)===null||
     (recordEmail(candidate)&&recordEmail(candidate)!==e)||linked(candidate)||used.has(candidate.id)||
     (!emails.length&&names.length!==1))return {row:row.row,status:'conflict'};
  used.add(candidate.id);
  return {row:row.row,status:'matched',staffId:candidate.id,name:row.name,email:e};
 });
}
export async function readTeacherStaffRoster({store,assertCurrent}){
 if(typeof assertCurrent!=='function')throw Error('Session check required');
 let cursor=null,last=null,staff=[];
 for(let page=0;page<51;page++){
  assertCurrent();const result=await store.listPage('staff',{pageSize:100,cursor});assertCurrent();
  if(!Array.isArray(result.records)||result.records.length>100||typeof result.hasMore!=='boolean')throw Error('Staff सूची अपूर्ण छ।');
  for(const record of result.records){
   if(record.schoolId!==store.schoolId||typeof record.id!=='string'||(last!==null&&record.id<=last))throw Error('Staff सूचीको क्रम मिलेन।');
   last=record.id;staff.push(record);
   if(staff.length>5000)throw Error('Staff सूचीको सीमा नाघ्यो।');
  }
  if(!result.hasMore)return staff;
  if(!result.records.length||result.cursor?.id!==last)throw Error('Staff सूची अपूर्ण छ।');
  cursor=result.cursor;
 }
 throw Error('Staff सूचीको सीमा नाघ्यो।');
}
// Membership creation and descriptive staff link are committed together.
export async function addLinkedTeacherMember({db,api,actor,schoolId,uid,match,assertCurrent}){
 if(actor?.role!=='school_admin'||actor.active!==true||actor.schoolId!==schoolId||uid===actor.uid||
    typeof uid!=='string'||!/^[A-Za-z0-9_-]{6,128}$/.test(uid)||match?.status!=='matched'||typeof assertCurrent!=='function')throw Error('अधिकृत शिक्षक खाता आवश्यक छ।');
 const memberRef=api.doc(db,schoolDocumentPath(schoolId,'members',uid));
 const staffRef=api.doc(db,schoolDocumentPath(schoolId,'staff',match.staffId));
 const membership={uid,schoolId,role:'teacher',active:false};
 assertCurrent();
 await api.runTransaction(db,async tx=>{
  assertCurrent();
  const [member,staff]=await Promise.all([tx.get(memberRef),tx.get(staffRef)]);
  assertCurrent();
  if(member.exists()||!staff.exists())throw Error('सदस्य वा Staff विवरण परिवर्तन भयो।');
  const record=staff.data();
  if(record.schoolId!==schoolId||recordName(record)!==nameKey(match.name)||recordEmail(record)===null||
    (recordEmail(record)&&recordEmail(record)!==emailKey(match.email))||linked(record))throw Error('Staff विवरण परिवर्तन भयो।');
  tx.set(memberRef,membership);
  tx.update(staffRef,{email:emailKey(match.email),authUid:uid});
 });
 return membership;
}
