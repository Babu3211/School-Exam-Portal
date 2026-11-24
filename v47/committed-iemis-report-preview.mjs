// Strict bridge from trusted committed subject results to the unchanged V46 IEMIS
// preview. No writes, no raw marks fallback, no official CDC approval.
// Primary uses an explicit count/obtained pair; full marks are derived, never stored as an obtained score.
import {convertVerifiedSubjectPreview} from './iemis-verified-subject-preview.mjs';
const terms=Object.freeze({'1st':'first','2nd':'second','3rd':'third',final:'annual'});
export function prepareCommittedIemisReport({schoolId,school,classNo,term,students,subjects,publications}){
 if(typeof classNo!=='string'||!/^(?:[1-9]|10)$/.test(classNo)||!Object.hasOwn(terms,term))
  throw Error('Committed IEMIS bridge supports Classes 1–10 and IEMIS terms only');
 const primary=Number(classNo)<=5;
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
 return convertVerifiedSubjectPreview({schoolId,school,classNo,term,students,subjects,bySubject});
}
