// V47 integration entry point for the existing V46 Excel parser/prepared rows.
// This adapter does NOT alter V46 parsing, headers or duplicate detection.
// The caller must supply V46-prepared records, a live Firestore document reader,
// and a Firestore writer; all authorization is rechecked before any write.
import {verifyV46ImportPreflight} from './verified-v46-import-preflight.mjs';
import {attachV47SchoolId} from './v46-import-school-gate.mjs';
export async function importV46PreparedRowsToSchool({auth,schoolId,collection,prepared,readDocument,writeRecords}){
 if(!Array.isArray(prepared)||prepared.length===0)throw new Error('Prepared V46 rows required');
 if(prepared.length>5000)throw new Error('Import exceeds reviewed row limit');
 if(typeof writeRecords!=='function')throw new TypeError('Firestore writer required');
 // Verify BEFORE handing any data to the writer. No partial authorization.
 const context=await verifyV46ImportPreflight({auth,schoolId,collection,readDocument});
 const records=prepared.map(row=>attachV47SchoolId(row,context));
 if(auth.currentUser?.uid!==context.uid)throw new Error('Authentication changed before import');
 // A writer must enforce Firestore transaction/batch size and must never write
 // outside the provided path. The Firestore rules independently enforce schoolId.
 await writeRecords({path:[...context.path],records,schoolId:context.schoolId,uid:context.uid});
 return Object.freeze({schoolId:context.schoolId,collection:context.collection,count:records.length});
}
