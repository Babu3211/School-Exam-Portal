import {assertSchoolId} from "./tenant-domain.mjs";
/** The rules compare the new membership to the immutable invitation. */
export async function acceptSparkSchoolInvitation({auth,firestore,doc,getDoc,setDoc,projectId,schoolId}) {
 if(projectId!=="smss-exam-portal-v47")throw new Error("V47 staging project required");
 const uid=auth?.currentUser?.uid;
 if(!uid || auth.currentUser.isAnonymous)throw new Error("Authentication required");
 assertSchoolId(schoolId);
 if([doc,getDoc,setDoc].some(fn=>typeof fn!=="function"))throw new TypeError("Firestore Web SDK adapters required");
 const invitation=await getDoc(doc(firestore,"schools",schoolId,"invitations",uid));
 if(!invitation.exists())throw new Error("Invitation not found");
 const data=invitation.data();
 if(data.uid!==uid || data.schoolId!==schoolId || data.active!==true ||
    !Array.isArray(data.roles) || data.roles.length!==1 ||
    !["viewer","subject_teacher","class_teacher"].includes(data.roles[0]))throw new Error("Invalid invitation");
 if(auth.currentUser?.uid!==uid)throw new Error("Session changed");
 if(auth.currentUser?.uid!==uid)throw new Error("Session changed");
 await setDoc(doc(firestore,"schools",schoolId,"members",uid),{uid,schoolId,roles:[data.roles[0]],active:true});
 return Object.freeze({schoolId,uid,role:data.roles[0]});
}
