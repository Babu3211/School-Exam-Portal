const ROLES=new Set(['super_admin','school_admin','teacher','viewer']);
export function canAccessSchool(member,schoolId,operation='read'){
 if(!member||member.active!==true||typeof member.uid!=='string'||!member.uid.trim()||typeof schoolId!=='string'||!/^[0-9]{5,20}$/.test(schoolId)||!['read','write'].includes(operation))return false;
 if(member.role==='super_admin')return true;
 if(member.schoolId!==schoolId||!ROLES.has(member.role))return false;
 if(operation==='read')return true;
 if(operation==='write')return member.role==='school_admin'; // teacher writes require server-enforced assignment rules not yet implemented
 return false;
}
export function canManageSchools(member){return member?.active===true&&member.role==='super_admin'&&typeof member.uid==='string'&&!!member.uid.trim();}
