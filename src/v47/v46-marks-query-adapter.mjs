/**
 * V46 marks query compatibility: preserve existing className/subject/section
 * semantics while changing only the tenant collection path. No database I/O.
 */
import {schoolResourcePath} from "./school-data-paths.mjs";
function nonempty(value,label) {
 if(typeof value!=="string" || !value.trim()) throw new TypeError(label+" required");
 return value;
}
export function planV46MarksQuery({schoolId,className,subject,section=""}) {
 nonempty(className,"Class name");
 nonempty(subject,"Subject");
 if(typeof section!=="string") throw new TypeError("Invalid section");
 const filters=[Object.freeze(["className","==",className]),Object.freeze(["subject","==",subject])];
 if(section.trim())filters.push(Object.freeze(["section","==",section.trim()]));
 return Object.freeze({
  collectionPath:schoolResourcePath(schoolId,"marks"),
  filters:Object.freeze(filters),
  readOnlyPlan:true,
  preservesV46Fields:true
 });
}

/**
 * Execute the planned read with an injected, read-only Firestore gateway.
 * The caller must supply a server-verified schoolId; this function does not
 * authenticate users or grant permission to read.
 */
export async function readV46MarksForSchool({schoolId,className,subject,section="",gateway}) {
 if(!gateway || typeof gateway.queryCollection!=="function")
   throw new TypeError("Read-only tenant query gateway required");
 const plan=planV46MarksQuery({schoolId,className,subject,section});
 const rows=await gateway.queryCollection(plan.collectionPath,plan.filters);
 if(!Array.isArray(rows)) throw new TypeError("Invalid marks query response");
 if(rows.some(row=>!row || typeof row!=="object" || Array.isArray(row) ||
   (Object.hasOwn(row,"schoolId") && row.schoolId!==schoolId)))
  throw new Error("Marks tenant mismatch");
 return rows;
}
