// V47-only, bounded teacher-account Excel validation. No database writes here.
export const TEACHER_ACCOUNT_HEADERS=Object.freeze(['Name','Email','Password']);
export const MAX_TEACHER_ACCOUNTS=25;
export function validateTeacherAccountRows(table){
 if(!Array.isArray(table)||table.length<2||table.length>MAX_TEACHER_ACCOUNTS+1)throw Error('एक पटकमा १ देखि २५ शिक्षकको विवरण राख्नुहोस्।');
 if(!Array.isArray(table[0])||table[0].length!==3||TEACHER_ACCOUNT_HEADERS.some((h,i)=>String(table[0][i]).trim().toLowerCase()!==h.toLowerCase()))throw Error('Excel शीर्षक Name, Email, Password हुनुपर्छ।');
 const rows=[],seen=new Set();
 for(let i=1;i<table.length;i++){
  const row=table[i],n=i+1;
  if(!Array.isArray(row)||row.length!==3||row.some(v=>typeof v!=='string'))throw Error('पङ्क्ति '+n+': अमान्य विवरण।');
  if(row.every(v=>v.trim()===''))continue;
  const name=row[0].trim(),email=row[1].trim().toLowerCase(),password=row[2];
  if(!name||name.length>160||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||password.length<12||password.length>128||!password.trim())throw Error('पङ्क्ति '+n+': नाम, इमेल वा १२–१२८ अक्षरको पासवर्ड मिलेन।');
  if(seen.has(email))throw Error('पङ्क्ति '+n+': इमेल दोहोरिएको छ।');
  seen.add(email);
  rows.push(Object.freeze({row:n,name,email,password}));
 }
 if(!rows.length)throw Error('शिक्षकको विवरण भेटिएन।');
 return Object.freeze(rows);
}
// No automatic activation, password reset, retry or deletion. Stop on first
// ambiguous failure: Auth and Firestore cannot be one atomic transaction.
export async function provisionTeacherAccountBatch({rows,actor,schoolId,assertCurrent,verifyPrivilege,createAccount,addMember,onResult=()=>{}}){
 if(actor?.role!=='school_admin'||actor.active!==true||actor.schoolId!==schoolId||!/^\d{5,20}$/.test(schoolId)||!actor.uid)throw Error('प्रमाणित विद्यालय प्रशासक आवश्यक छ।');
 if(!Array.isArray(rows)||rows.length<1||rows.length>MAX_TEACHER_ACCOUNTS)throw Error('अमान्य शिक्षक सूची।');
 const validated=validateTeacherAccountRows([TEACHER_ACCOUNT_HEADERS,...rows.map(r=>[r.name,r.email,r.password])]);
 let created=0;
 for(let i=0;i<validated.length;i++){
  const r=validated[i],row=rows[i].row;let uid=null;
  assertCurrent();await verifyPrivilege();assertCurrent();
  try{
   const result=await createAccount({email:r.email,password:r.password,role:'teacher'});
   uid=result?.uid;
   if(result?.accountCreated!==true||result.membershipCreated!==false||typeof uid!=='string'||!/^[A-Za-z0-9_-]{6,128}$/.test(uid)||uid===actor.uid)throw Error('नयाँ खाता पुष्टि भएन।');
   assertCurrent();await verifyPrivilege();assertCurrent();
   const member=await addMember({uid,role:'teacher'});
   if(member?.uid!==uid||member.schoolId!==schoolId||member.role!=='teacher'||member.active!==false)throw Error('निष्क्रिय सदस्यता पुष्टि भएन।');
   created++;assertCurrent();
   onResult({row,name:r.name,email:r.email,uid,status:'inactive'});
  }catch{
   // Never expose SDK errors or passwords in reports.
   assertCurrent();
   onResult({row,name:r.name,email:r.email,uid,status:'check'});
   return {created,stopped:true,remaining:validated.length-i-1};
  }
 }
 return {created,stopped:false,remaining:0};
}
