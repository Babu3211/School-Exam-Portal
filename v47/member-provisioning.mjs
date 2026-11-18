import {validateMembership} from './school-membership.mjs';
export function prepareSubordinateMembership({schoolId,uid,role,actorUid}){
 if(role!=='teacher'&&role!=='viewer')throw new Error('Only teacher/viewer can be provisioned by school admin');
 if(uid===actorUid)throw new Error('Self provisioning denied');
 const data=validateMembership({schoolId,uid,role,active:false});
 return {path:'schools/'+schoolId+'/members/'+uid,data,requiresSchoolAdmin:true};
}
export function prepareSubordinateActivation({schoolId,uid,role,actorUid,confirmed}){
 if(confirmed!==true)throw new Error('Approval required');
 const plan=prepareSubordinateMembership({schoolId,uid,role,actorUid});
 return {...plan,patch:{active:true},requiresExistingMembership:true};
}
