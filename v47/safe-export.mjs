import {validateSchoolId} from './school-paths.mjs';
export function buildSchoolExport({schoolId,records,collection}){
 validateSchoolId(schoolId);
 if(!['students','staff','classes','subjects','exams','marks','attendance'].includes(collection))throw new Error('Unsupported export collection');
 if(!Array.isArray(records)||records.length>500)throw new RangeError('Export must be paginated');
 return {schoolId,collection,count:records.length,records:structuredClone(records)};
}
