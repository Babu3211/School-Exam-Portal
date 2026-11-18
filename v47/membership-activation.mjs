import {validateMembership} from './school-membership.mjs';
export function prepareMembershipActivation({schoolId,uid,role,confirmed}){
 if(confirmed!==true)throw new Error('Explicit membership approval required');
 const m=validateMembership({schoolId,uid,role,active:true});
 return {path:'schools/'+schoolId+'/members/'+uid,data:m,requiresSuperAdmin:true,requiresIndependentApproval:true};
}
