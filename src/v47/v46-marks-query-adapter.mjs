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
