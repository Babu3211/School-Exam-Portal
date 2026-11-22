// Single canonical tenant-safe assignment writer. The former implementation generated
// incompatible underscore IDs and omitted school scope from persisted records.
export {createSubjectAssignment} from './assignment-create-service.mjs';
