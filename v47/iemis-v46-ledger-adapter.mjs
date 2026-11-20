// Offline, read-only bridge to the verified V46 IEMIS ledger renderer.
// The caller must provide a roster and records already authorized and scoped to ONE school.
// No Firebase access, writes, or fallback to global V46 collections.
import {iemisLedger} from '../iemis-ledger.js';
export function renderV46TenantLedger({schoolId,schoolName,schoolCode='',classNo,term,mode='number',subjects,students,records,examId,...options}){
 if(typeof schoolId!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(schoolId))throw Error('Valid school scope required');
 if(typeof schoolName!=='string'||!schoolName.trim())throw Error('School name required');
 if(!['number','grade','entry'].includes(mode))throw Error('Invalid ledger mode');
 if(!['1st','2nd','3rd','final'].includes(term))throw Error('Unsupported V46 IEMIS term');
 if(!Number.isInteger(Number(classNo))||Number(classNo)<1||Number(classNo)>10)throw Error('Unsupported V46 IEMIS class');
 if(!Array.isArray(subjects)||!Array.isArray(students)||!Array.isArray(records))throw Error('Ledger data arrays required');
 if(typeof examId!=='string'||!examId)throw Error('Exam ID required');
 if(typeof schoolCode!=='string'||schoolCode.length>64)throw Error('Invalid school code');
 if(typeof schoolName!=='string'||schoolName.length>160)throw Error('Invalid school name');
 if(subjects.some(sub=>typeof sub!=='string'&&(!sub||typeof sub!=='object')))throw Error('Invalid subject roster');
 for(const item of [...students,...records]){
  if(!item||item.schoolId!==schoolId)throw Error('Cross-school or unscoped ledger data');
 }
 if(students.some(st=>typeof st.id!=='string'||!st.id))throw Error('Student ID required');
 const ids=new Set(students.map(st=>st.id));
 if(ids.size!==students.length)throw Error('Duplicate student ID');
 if(records.some(r=>!ids.has(r.studentId)||r.examId!==examId))throw Error('Foreign student or exam record');
 const allowed=new Set(['creditFor','label','componentsFor','applicable']);
 if(Object.keys(options).some(k=>!allowed.has(k)))throw Error('Unexpected renderer option');
 return iemisLedger({mode,classNo:Number(classNo),annual:term==='final',subjects,students,records,examId,schoolName,schoolCode,...options});
}
