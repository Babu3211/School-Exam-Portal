// V46 compatibility: retain the original student document field names when reading V47.
// This is a read-only projection; it does not authorize importing or overwriting students.
export const V46_STUDENT_FIELDS=Object.freeze([
 'studentName','studentNameNepali','gender','fatherName','motherName','class','section',
 'iemisCode','school','studentIemisNo','iemisStudentNo','sourceYear','sourceClass',
 'permanentAddress','temporaryAddress','dob','dobAD','isTransferred','motherTongue',
 'disabilityType','age','guardianName','phone','admissionNo','symbolNo','symbolNumber',
 'birthRegistrationNo','birthRegistrationNumber','nebRegNo','nebRegistrationNo',
 'rollNo','sourceSerialNo','studentPortalCode','active'
]);
export function projectV46StudentRecord(record,{schoolId}={}){
 if(!record||typeof record!=='object'||Array.isArray(record))throw new TypeError('Student record required');
 if(typeof schoolId!=='string'||!/^[a-zA-Z0-9_-]{3,64}$/.test(schoolId))throw new Error('Valid school ID required');
 if(record.schoolId!==schoolId)throw new Error('Cross-school student record rejected');
 const result={schoolId};
 for(const key of V46_STUDENT_FIELDS)if(Object.prototype.hasOwnProperty.call(record,key))result[key]=record[key];
 // Preserve unknown V46 fields in the source database; never delete them on export.
 return Object.freeze(result);
}
