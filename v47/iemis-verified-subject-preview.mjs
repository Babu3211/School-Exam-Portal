import {iemisEntrySchema,iemisEntryValues} from './iemis-entry.js';
import {iemisComponentKey} from './iemis-ledger.js';
import {prepareLegacyGradeReport} from './legacy-grade-report-preview.mjs';
const terms=Object.freeze({'1st':'first','2nd':'second','3rd':'third',final:'annual'});
// Source-neutral conversion only. Callers must authenticate and verify records.
export function convertVerifiedSubjectPreview({schoolId,school,classNo,term,students,subjects,bySubject}){
 const primary=Number(classNo)<=5,roster=new Set(students.map(s=>s.id));
 const records=[];
 for(const sub of subjects){
  const pub=bySubject.get(sub.id);
  if(!pub)throw Error('Missing verified subject marks');
  const schema=iemisEntrySchema(classNo,terms[term],sub.name);
  const editable=schema.filter(c=>!c.readonly);
  if(!Array.isArray(pub.components)||pub.components.length!==editable.length)
   throw Error('Assessment components differ from V46 IEMIS');
  const mapping=new Map(),keys=new Set();
  for(const component of pub.components){
   const key=iemisComponentKey(component?.name);
   const expected=editable.find(c=>c.key===key);
   if(!expected||mapping.has(key)||typeof component.key!=='string'||keys.has(component.key)||
      (primary?(!Number.isSafeInteger(component.fullMarks)||component.fullMarks<=0):component.fullMarks!==expected.max))
    throw Error('Assessment component names or full marks differ from V46 IEMIS');
   mapping.set(key,component.key);keys.add(component.key);
  }
  const limits=new Map(pub.components.map(c=>[c.key,c.fullMarks]));
  if(primary){
   const countMax=limits.get(mapping.get('count')),obtainedMax=limits.get(mapping.get('obtained'));
   if(countMax>5000||obtainedMax!==countMax*4)
    throw Error('Primary learning achievement maximum must be count × 4');
  }
  const seen=new Set();
  for(const row of pub.entries){
   if(!row||!roster.has(row.studentId)||seen.has(row.studentId))
    throw Error('Duplicate or foreign assessment student');
   seen.add(row.studentId);
   // The existing V46 complete report refuses absent/incomplete marks; retain
   // this safety boundary rather than rendering absence as a zero score.
   if(row.isAbsent!==false||!row.values||typeof row.values!=='object'||Array.isArray(row.values)||Object.keys(row.values).length!==editable.length)
    throw Error('Absent or incomplete assessment needs verified IEMIS absence handling');
   const values={};
   for(const component of editable){
    const source=mapping.get(component.key);
    const value=row.values[source];
    if(!Object.hasOwn(row.values,source)||typeof value!=='number'||!Number.isFinite(value)||value<0||value>limits.get(source))
     throw Error('Invalid assessment component value');
    values[component.key]=value;
   }
   if(primary&&(!Number.isSafeInteger(values.count)||values.count<1||!Number.isSafeInteger(values.obtained)||values.obtained>values.count*4))
    throw Error('Primary learning achievement requires whole count and obtained marks within count × 4');
   const normalized=iemisEntryValues(schema,{values,isAbsent:false,incompatible:false});
   // Generic staging checksums sum stored fields, including the primary count.
   // Only the actual obtained achievement is forwarded to IEMIS calculation.
   const storedSum=Object.values(values).reduce((sum,value)=>sum+value,0);
   if(typeof row.totalObtained!=='number'||!Number.isFinite(row.totalObtained)||
      Math.abs(storedSum-row.totalObtained)>1e-7)
    throw Error('Assessment component total mismatch');
   records.push({...normalized,schoolId,class:classNo,term,examId:term,studentId:row.studentId,subjectId:sub.id,subject:sub.name});
  }
 }
 return prepareLegacyGradeReport({schoolId,school,classNo,term,students,subjects,records});
}
