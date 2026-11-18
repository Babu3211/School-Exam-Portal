// V47 development only. Actual Firebase operations; no deploy or privileged bypass.
// Every operation re-reads the signed-in user's school membership.
// Firestore security rules independently enforce authorization.
import {verifyFirebaseSchoolSession} from './verified-school-session.mjs';
import {tenantReadPlan,tenantListPlan,tenantWritePlan} from './tenant-firestore-gateway.mjs';
export async function firebaseTenantOperation({auth,firestore,schoolId,collection,id,operation,data,limit=50,cursorId=null}){
 if(!auth?.currentUser?.uid||!firestore)throw new Error('Authentication required');
 const uid=auth.currentUser.uid;
 const session=await verifyFirebaseSchoolSession({auth,firestore,schoolId});
 if(auth.currentUser?.uid!==uid)throw new Error('Authentication changed');
 const sdk=await import('firebase/firestore');
 if(operation==='get'){
  const plan=tenantReadPlan({session,schoolId,uid,collection,id});
  const snapshot=await sdk.getDoc(sdk.doc(firestore,...plan.path.split('/')));
  if(auth.currentUser?.uid!==uid)throw new Error('Authentication changed');
  return snapshot.exists()?{...snapshot.data(),id:snapshot.id}:null;
 }
 if(operation==='list'){
  if(!Number.isInteger(limit)||limit<1||limit>100)throw new RangeError('Invalid page size');
  const plan=tenantListPlan({session,schoolId,uid,collection});
  if(cursorId!==null&&(typeof cursorId!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(cursorId)))throw new TypeError('Invalid pagination cursor');
  const constraints=[sdk.orderBy(sdk.documentId())];
  if(cursorId!==null)constraints.push(sdk.startAfter(cursorId));
  constraints.push(sdk.limit(limit));
  const q=sdk.query(sdk.collection(firestore,...plan.path.split('/')),...constraints);
  const snapshot=await sdk.getDocs(q);
  if(auth.currentUser?.uid!==uid)throw new Error('Authentication changed');
  const records=snapshot.docs.map(d=>({...d.data(),id:d.id}));
  return {records,nextCursor:snapshot.docs.length===limit?snapshot.docs.at(-1).id:null};
 }
 if(operation==='create'||operation==='update'){
  const plan=tenantWritePlan({session,schoolId,uid,collection,id,operation,data});
  if(auth.currentUser?.uid!==uid)throw new Error('Authentication changed');
  const ref=sdk.doc(firestore,...plan.path.split('/'));
  if(operation==='create'){
   // A transaction prevents overwriting an existing record.
   await sdk.runTransaction(firestore,async tx=>{
    const existing=await tx.get(ref);
    if(existing.exists())throw new Error('Document already exists');
    if(auth.currentUser?.uid!==uid)throw new Error('Authentication changed');
    tx.set(ref,plan.data);
   });
  }else{
   // updateDoc never creates a missing record.
   await sdk.updateDoc(ref,plan.data);
  }
  return {id,schoolId,operation};
 }
 throw new Error('Unsupported operation');
}
