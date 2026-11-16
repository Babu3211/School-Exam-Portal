export function schoolReadiness({school,member,securityVerified=false}){
 const issues=[];
 if(!school||school.active!==true)issues.push('school_inactive');
 if(!member||member.active!==true)issues.push('membership_inactive');
 if(member?.role!=='super_admin'&&member?.schoolId!==school?.id)issues.push('school_mismatch');
 if(securityVerified!==true)issues.push('security_unverified');
 return Object.freeze({ready:issues.length===0,issues});
}
