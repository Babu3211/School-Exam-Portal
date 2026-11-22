import {iemisSummary,iemisGpa} from './v46-iemis-ledger.js';
// Read-only adapter: preserve V46 calculations, never save or publish results.
// Callers must supply verified Examination Settings components and school-scoped records.
export function previewV46SubjectResult({components,obtained,annual=false,primary=false}){
 if(!Array.isArray(components)||!components.length||!obtained||typeof obtained!=='object')throw new Error('Configured components and obtained marks required');
 const seen=new Set();
 const scores=components.map(component=>{
  const {key,name,fullMarks}=component??{};
  if(typeof key!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(key)||seen.has(key))throw new Error('Invalid or duplicate component key');
  seen.add(key);
  if(typeof name!=='string'||!name.trim())throw new Error('Component name required');
  if(typeof fullMarks!=='number'||!Number.isFinite(fullMarks)||fullMarks<0)throw new Error('Invalid configured component full marks');
  const value=obtained[key];
  if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>fullMarks)throw new Error('Invalid or over-limit obtained component marks');
  return {name,fullMarks,obtained:value};
 });
 const summary=iemisSummary({scores},{annual,primary});
 if(!summary.complete)throw new Error('V46 IEMIS summary incomplete for configured components');
 return summary;
}
export function previewV46Gpa({subjects,annual=false,primary=false}){
 if(!Array.isArray(subjects)||!subjects.length)throw new Error('Complete subject results required');
 return iemisGpa(subjects,{annual,primary});
}
