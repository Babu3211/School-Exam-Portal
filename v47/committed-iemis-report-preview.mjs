// Strict bridge from trusted committed subject results to the unchanged V46 IEMIS
// preview. No writes, no raw marks fallback, no official CDC approval. Primary
// learning-achievement records need their own representation and are not guessed.
import {iemisEntrySchema,iemisEntryValues} from './iemis-entry.js';
import {iemisComponentKey} from './iemis-ledger.js';
import {prepareLegacyGradeReport} from './legacy-grade-report-preview.mjs';
const terms=Object.freeze({'1st':'first','2nd':'second','3rd':'third',final:'annual'});
export function prepareCommittedIemisReport({schoolId,school,classNo,term,students,subjects,publications}){
 if(!/^(?:[6-9]|10)$/.test(classNo)||!Object.hasOwn(terms,term))
  throw Error('Committed IEMIS bridge supports Classes 6–10 and IEMIS terms only; primary achievement requires a separate verified format');
 if(!Array.isArray(students)||!students.length||students.length>1500||
    !Array.isArray(subjects)||!subjects.length||subjects.length>30||
    !Array.isArray(publications)||publications.length!==subjects.length)
  throw Error('Complete class and all subject publications required');
 const roster=new Set(students.map(s=>s.id));
 if(roster.size!==students.length)throw Error('Duplicate student in class roster');
 const bySubject=new Map();
 for(const pub of publications){
  if(!pub||pub.published!==true||pub.schoolId!==schoolId||pub.classId!==classNo||
     pub.examId!==term||typeof pub.subjectId!=='string'||bySubject.has(pub.subjectId)||
     !/^[A-Za-z0-9_-]{8,128}$/.test(pub.publicationId??'')||! /^[a-f0-9]{64}$/.test(pub.digest??'')||
     pub.rosterCount!==students.length||!Array.isArray(pub.entries)||pub.entries.length!==students.length)
   throw Error('Unpublished, incomplete, duplicate or foreign subject publication');
  bySubject.set(pub.subjectId,pub);
 }
 const records=[];
 for(const sub of subjects){
  const pub=bySubject.get(sub.id);
  if(!pub)throw Error('Missing committed subject publication');
  const schema=iemisEntrySchema(classNo,terms[term],sub.name);
  if(!Array.isArray(pub.components)||pub.components.length!==schema.length)
   throw Error('Committed assessment components differ from V46 IEMIS');
  const mapping=new Map(),keys=new Set();
  for(const component of pub.components){
   const key=iemisComponentKey(component?.name);
   const expected=schema.find(c=>c.key===key);
   if(!expected||mapping.has(key)||typeof component.key!=='string'||keys.has(component.key)||
      component.fullMarks!==expected.max)
    throw Error('Committed component names or full marks differ from V46 IEMIS');
   mapping.set(key,component.key);keys.add(component.key);
  }
  const seen=new Set();
  for(const row of pub.entries){
   if(!row||!roster.has(row.studentId)||seen.has(row.studentId))
    throw Error('Duplicate or foreign published student');
   seen.add(row.studentId);
   // The existing V46 complete report refuses absent/incomplete marks; retain
   // this safety boundary rather than rendering absence as a zero score.
   if(row.isAbsent!==false||!row.values||Object.keys(row.values).length!==schema.length)
    throw Error('Absent or incomplete publication needs verified IEMIS absence handling');
   const values={};
   for(const component of schema){
    const source=mapping.get(component.key);
    const value=row.values[source];
    if(!Object.hasOwn(row.values,source)||typeof value!=='number'||!Number.isFinite(value)||value<0||value>component.max)
     throw Error('Invalid published component value');
    values[component.key]=value;
   }
   const normalized=iemisEntryValues(schema,{values,isAbsent:false,incompatible:false});
   if(typeof row.totalObtained!=='number'||!Number.isFinite(row.totalObtained)||
      Math.abs(normalized.totalObtained-row.totalObtained)>1e-7)
    throw Error('Published component total mismatch');
   records.push({...normalized,schoolId,class:classNo,term,examId:term,studentId:row.studentId,subjectId:sub.id,subject:sub.name});
  }
 }
 return prepareLegacyGradeReport({schoolId,school,classNo,term,students,subjects,records});
}
