const ROLES=new Set(['super_admin','school_admin','teacher','viewer']);
export function canAccessSchool(member,schoolId,operation='read'){
 if(!member||member.active!==true||typeof schoolId!=='string')return false;
 if(member.role==='super_admin')return true;
 if(member.schoolId!==schoolId||!ROLES.has(member.role))return false;
 if(operation==='read')return true;
 if(operation==='write')return member.role==='school_admin'||(member.role==='teacher'&&member.assignedWrite===true);
 return false;
}
export function canManageSchools(member){return member?.active===true&&member.role==='super_admin';}
