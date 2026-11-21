// Read-only V47 diagnostics for V46 report inputs. This is not CDC grading.
const REFERENCES=Object.freeze([['studentId','students'],['subjectId','subjects'],['examId','exams']]);
export function auditV46ReportReferences(rows){
 if(!rows||!Array.isArray(rows.marks)||!Array.isArray(rows.students)||!Array.isArray(rows.subjects)||!Array.isArray(rows.exams))throw new Error('Complete report input arrays required');
 const ids=Object.fromEntries(['students','subjects','exams'].map(key=>[key,new Set(rows[key].map(item=>item.id))]));
 const missing=[];
 const unchecked=[];
 for(const mark of rows.marks){
  if(!mark||typeof mark.id!=='string')throw new Error('Invalid mark record');
  for(const [field,collection] of REFERENCES){
   // Older V46 mark layouts may omit a field; do not assume schema parity.
   if(!Object.hasOwn(mark,field)||mark[field]===null||mark[field]===''){
    unchecked.push(Object.freeze({markId:mark.id,field,collection}));
    continue;
   }
   if(typeof mark[field]!=='string'&&typeof mark[field]!=='number')throw new Error('Invalid mark reference: '+field);
   const target=String(mark[field]);
   if(!ids[collection].has(target))missing.push(Object.freeze({markId:mark.id,field,reference:target,collection}));
  }
 }
 return Object.freeze({checkedMarks:rows.marks.length,missing:Object.freeze(missing),unchecked:Object.freeze(unchecked),valid:missing.length===0&&unchecked.length===0,publicationAllowed:false});
}
