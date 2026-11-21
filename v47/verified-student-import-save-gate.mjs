// V47 verified student import save gate. Pure pre-write validation; NO Firestore writes.
// The caller must recheck live duplicates and authorization inside its Firestore
// transaction before creating students. Never use this as a replacement for rules.
import {isVerifiedCloudPreview} from './verified-student-import-preview.mjs';
import {getReadyV46IemisRows} from './v46-iemis-student-import-preview.mjs';
import {verifyV46ImportPreflight} from './verified-v46-import-preflight.mjs';
const issuedSavePlans=new WeakSet();
export const isVerifiedStudentSavePlan=value=>!!value&&typeof value==='object'&&issuedSavePlans.has(value);

export async function prepareVerifiedStudentSave({auth,schoolId,rows,verifiedPreview,confirmed=false,readDocument}={}){
 if(confirmed!==true)throw new Error('Admin confirmation required before import');
 if(!isVerifiedCloudPreview(verifiedPreview,rows)||verifiedPreview.schoolId!==schoolId||verifiedPreview.cloudChecked!==true)
  throw new Error('Fresh verified cloud preview required before import');
 const context=await verifyV46ImportPreflight({auth,schoolId,collection:'students',readDocument});
 if(auth?.currentUser?.uid!==context.uid)throw new Error('Authentication changed before import');
 if(!isVerifiedCloudPreview(verifiedPreview,rows))throw new Error('Excel rows changed after verification');
 const records=getReadyV46IemisRows(verifiedPreview.preview,{confirmed:true}).map(record=>Object.freeze({...record}));
 if(records.length>400)throw new Error('Import requires smaller chunks (maximum 400 students per reviewed save)');
 if(records.length===0)throw new Error('No new students available to import');
 if(auth?.currentUser?.uid!==context.uid||!isVerifiedCloudPreview(verifiedPreview,rows))throw new Error('Import verification expired');
 const plan=Object.freeze({schoolId,uid:context.uid,path:context.path,records:Object.freeze(records),count:records.length,
  requiresTransactionalDuplicateRecheck:true});
 issuedSavePlans.add(plan);
 return plan;
}
