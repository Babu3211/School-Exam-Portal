// Pure read-only bridge for a complete, already-authorized tenant class snapshot.
// Never queries Firebase, writes marks, or synthesizes component scores from raw theory/practical.
import {inspectV46IemisRecord} from './iemis-record-compatibility.mjs';
import {renderCompleteV46TenantGradeLedger} from './iemis-v46-ledger-adapter.mjs';
import {iemisSubjectKey} from './iemis-ledger.js';
export function renderAuthorizedV46ClassGradeLedger({schoolId,schoolName,schoolCode='',classNo,term,examId,students,subjects,records}){
 if(!Array.isArray(students)||!Array.isArray(subjects)||!Array.isArray(records))throw Error('Authorized complete class snapshot required');
 if(!students.length||!subjects.length)throw Error('Class roster and subjects required');
 const names=subjects.map(s=>typeof s==='string'?s:s?.name);
 if(names.some(n=>typeof n!=='string'||!n.trim())||new Set(names.map(iemisSubjectKey)).size!==names.length)throw Error('Invalid or duplicate subject roster');
 if(records.length!==students.length*subjects.length)throw Error('Complete class component marks required');
 const ids=new Set(students.map(s=>s.id));
 if(ids.size!==students.length||students.some(s=>s.schoolId!==schoolId||!s.id))throw Error('Invalid or cross-school student roster');
 const expected=new Set(students.flatMap(student=>names.map(subject=>JSON.stringify([student.id,iemisSubjectKey(subject)]))));
 const seen=new Set();
 for(const record of records){
  const key=JSON.stringify([record?.studentId,iemisSubjectKey(record?.subject)]);
  if(!expected.has(key)||seen.has(key))throw Error('Unexpected or duplicate class component record');
  seen.add(key);
  const subject=names.find(name=>iemisSubjectKey(name)===iemisSubjectKey(record.subject));
  const check=inspectV46IemisRecord(record,{schoolId,classNo,term,subject,examId});
  if(!check.compatible)throw Error('V46 IEMIS record not compatible: '+check.reason);
 }
 return renderCompleteV46TenantGradeLedger({schoolId,schoolName,schoolCode,classNo,term,examId,students,subjects,records});
}
