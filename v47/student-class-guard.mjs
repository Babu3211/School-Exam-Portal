import {requireTenantRecord} from './tenant-school-filter.mjs';
export function assertStudentClass(schoolId,student,expectedClass,expectedSection=null){
 requireTenantRecord(schoolId,student);
 if(typeof expectedClass!=='string'||!expectedClass.trim())throw new TypeError('Class required');
 if(student.className!==expectedClass)throw new Error('Student class mismatch');
 if(expectedSection!==null&&student.section!==expectedSection)throw new Error('Student section mismatch');
 return student;
}
