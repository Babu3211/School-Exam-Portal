// Fail-closed gate for V46 bulk import operations in the V47 school context.
// Call this BEFORE parsing Excel or making Firestore reads/writes. The gate does
// not itself write, import, or grant privileges.
import {assertIemisSchoolId} from './iemis-school-identity.mjs';
const issuedContexts=new WeakSet();
export function assertV47ImportContext({session,schoolId,collection}={}){
 assertIemisSchoolId(schoolId);
 if(!session||session.authorization!=='firestore-verified-read')throw new Error('Verified school session required');
 if(session.schoolId!==schoolId)throw new Error('Cross-school import blocked');
 if(typeof session.uid!=='string'||!session.uid)throw new Error('Authenticated user required');
 if(!['school_admin','super_admin'].includes(session.role))throw new Error('Only school administrators can import records');
 if(!['students','staff'].includes(collection))throw new Error('Unreviewed import collection');
 const context=Object.freeze({schoolId,collection,uid:session.uid,role:session.role,path:Object.freeze(['schools',schoolId,collection])});
 issuedContexts.add(context);
 return context;
}
export function attachV47SchoolId(record,context){
 if(!record||typeof record!=='object'||Array.isArray(record))throw new TypeError('Import record required');
 if(!context||typeof context!=='object'||!issuedContexts.has(context))throw new Error('Verified import context required');
 if(Object.hasOwn(record,'schoolId')&&record.schoolId!==context.schoolId)throw new Error('Cross-school record blocked');
 return {...record,schoolId:context.schoolId};
}
