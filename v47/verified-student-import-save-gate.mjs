// V47 verified student import save gate. Pure pre-write validation; NO Firestore writes.
// The caller must recheck live duplicates and authorization inside its Firestore
// transaction before creating students. Never use this as a replacement for rules.
import {isVerifiedCloudPreview,verifiedPreviewOwner} from './verified-student-import-preview.mjs';
import {getReadyV46IemisRows} from './v46-iemis-student-import-preview.mjs';
import {verifyV46ImportPreflight} from './verified-v46-import-preflight.mjs';
const issuedSavePlans=new WeakMap();
const SAVE_PLAN_MAX_AGE_MS=5*60*1000;
export const isVerifiedStudentSavePlan=value=>{
 const issued=value&&typeof value==='object'?issuedSavePlans.get(value):null;
 if(!issued)return false;
 const age=Date.now()-issued.issuedAt;
 return age>=0&&age<=SAVE_PLAN_MAX_AGE_MS;
};

export async function prepareVerifiedStudentSave({auth,schoolId,rows,verifiedPreview,confirmed=false,readDocument}={}){
 if(confirmed!==true)throw new Error('Admin confirmation required before import');
 if(!isVerifiedCloudPreview(verifiedPreview,rows)||verifiedPreview.schoolId!==schoolId||verifiedPreview.cloudChecked!==true)
  throw new Error('Fresh verified cloud preview required before import');
 if(verifiedPreviewOwner(verifiedPreview)!==auth?.currentUser?.uid)throw new Error('Verified preview belongs to another account');
 const context=await verifyV46ImportPreflight({auth,schoolId,collection:'students',readDocument});
 if(auth?.currentUser?.uid!==context.uid)throw new Error('Authentication changed before import');
 if(!isVerifiedCloudPreview(verifiedPreview,rows))throw new Error('Excel rows changed after verification');
 const records=getReadyV46IemisRows(verifiedPreview.preview,{confirmed:true}).map(record=>Object.freeze({...record}));
 if(records.length>400)throw new Error('Import requires smaller chunks (maximum 400 students per reviewed save)');
 if(records.length===0)throw new Error('No new students available to import');
 if(auth?.currentUser?.uid!==context.uid||!isVerifiedCloudPreview(verifiedPreview,rows))throw new Error('Import verification expired');
 const plan=Object.freeze({schoolId,uid:context.uid,path:context.path,records:Object.freeze(records),count:records.length,
  requiresTransactionalDuplicateRecheck:true});
 issuedSavePlans.set(plan,{issuedAt:Date.now()});
 return plan;
}
