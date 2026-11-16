/** Pure, read-only compatibility audit for a verified V47 school dataset. */
export function auditV47LedgerReadiness(data,{schoolId}={}){
 const kinds=["students","subjects","exams","marks"];
 if(!data||kinds.some(k=>!Array.isArray(data[k])))throw new TypeError("Complete verified school dataset required");
 const counts=Object.freeze(Object.fromEntries(kinds.map(k=>[k,data[k].length])));
 const blockers=[];
 for(const kind of kinds)if(!counts[kind])blockers.push("No "+kind+" records available.");
 for(const kind of kinds){
  const ids=new Set();
  let invalid=0,duplicate=0;
  for(const record of data[kind]){
   if(!record||typeof record!=="object"||typeof record.id!=="string"||!record.id){invalid++;continue;}
   if(ids.has(record.id))duplicate++;
   ids.add(record.id);
  }
  if(invalid)throw new Error("Invalid "+kind+" source document identities: "+invalid);
  if(duplicate)blockers.push(duplicate+" "+kind+" records have duplicate document identities.");
 }
 const studentIds=new Set(data.students.map(s=>s.id));
 const examIds=new Set(data.exams.map(e=>e.id));
 const subjectIds=new Set(data.subjects.map(s=>s.id));
 const subjectNames=new Set(data.subjects.flatMap(s=>[s.name,s.subjectName].filter(Boolean).map(v=>String(v).trim().toLowerCase())));
 if(schoolId){
  for(const kind of kinds){
   const mismatches=data[kind].filter(record=>record.schoolId!=null&&record.schoolId!==schoolId).length;
   if(mismatches)blockers.push(mismatches+" "+kind+" records claim a different school ID.");
  }
 }
 const studentClass=new Map(data.students.map(s=>[s.id,String(s.classNo??s.classId??"")]));
 const examClass=new Map(data.exams.map(e=>[e.id,String(e.classNo??e.classId??"")]));
 const classMismatches=data.marks.filter(m=>{
  const markClass=String(m.classNo??m.classId??"");
  const stClass=studentClass.get(m.studentId)||"";
  const exClass=examClass.get(m.examId)||"";
  return Boolean((markClass&&stClass&&markClass!==stClass)||(markClass&&exClass&&markClass!==exClass)||(stClass&&exClass&&stClass!==exClass));
 }).length;
 if(classMismatches)blockers.push(classMismatches+" marks have inconsistent student, exam or mark classes.");
 const subjectIdentity=new Map();
 let duplicateSubjects=0;
 for(const subject of data.subjects){
  const classKey=String(subject.classNo??subject.classId??"");
  for(const name of new Set([subject.name,subject.subjectName].filter(Boolean).map(v=>String(v).trim().toLowerCase()))){
   const key=JSON.stringify([classKey,name]);
   if(subjectIdentity.has(key)&&subjectIdentity.get(key)!==subject.id)duplicateSubjects++;
   else subjectIdentity.set(key,subject.id);
  }
 }
 if(duplicateSubjects)blockers.push(duplicateSubjects+" subjects share a name in the same class.");
 const subjectByName=new Map();
 for(const subject of data.subjects){
  for(const name of [subject.name,subject.subjectName].filter(Boolean)){
   const key=String(name).trim().toLowerCase();
   const classKey=String(subject.classNo??subject.classId??"");
   const composite=JSON.stringify([classKey,key]);
   if(!subjectByName.has(composite))subjectByName.set(composite,new Set());
   subjectByName.get(composite).add(subject.id);
  }
 }
 const resolveSubject=mark=>{
  if(mark.subjectId)return String(mark.subjectId);
  const name=String(mark.subject??"").trim().toLowerCase();
  const classKey=String(mark.classNo??mark.classId??(studentClass.get(mark.studentId)||examClass.get(mark.examId))??"");
  const exact=subjectByName.get(JSON.stringify([classKey,name]));
  const generic=subjectByName.get(JSON.stringify(["",name]));
  const matches=exact?.size===1?exact:(!exact&&generic?.size===1?generic:null);
  return matches?.size===1?[...matches][0]:"name:"+JSON.stringify([classKey,name]);
 };
 const markPairs=new Set();
 let duplicatePairs=0;
 for(const mark of data.marks){
  if(!mark.studentId||!mark.examId||!(mark.subjectId||mark.subject))continue;
  const key=JSON.stringify([mark.examId,mark.studentId,resolveSubject(mark)]);
  if(markPairs.has(key))duplicatePairs++;
  markPairs.add(key);
 }
 if(duplicatePairs)blockers.push(duplicatePairs+" marks duplicate an exam, student and subject combination.");
 const percentageOnly=data.marks.filter(m=>!Array.isArray(m.scores)||!m.scores.length).length;
 if(percentageOnly)blockers.push(percentageOnly+" marks have no V46-compatible assessment components.");
 const missingIdentity=data.marks.filter(m=>!m.examId||!m.studentId||!(m.subject||m.subjectId)).length;
 if(missingIdentity)blockers.push(missingIdentity+" marks lack exam, student or subject identity.");
 const unknownStudents=data.marks.filter(m=>m.studentId&&!studentIds.has(m.studentId)).length;
 if(unknownStudents)blockers.push(unknownStudents+" marks reference unknown school students.");
 const unknownExams=data.marks.filter(m=>m.examId&&!examIds.has(m.examId)).length;
 if(unknownExams)blockers.push(unknownExams+" marks reference unknown school exams.");
 const unknownSubjects=data.marks.filter(m=>{const ref=m.subjectId||m.subject;return ref&&!subjectIds.has(ref)&&!subjectNames.has(String(ref).trim().toLowerCase());}).length;
 if(unknownSubjects)blockers.push(unknownSubjects+" marks reference unknown school subjects.");
 const subjectById=new Map(data.subjects.map(s=>[s.id,s]));
 const conflictingSubjectLabels=data.marks.filter(m=>{
  if(!m.subjectId||!m.subject||!subjectById.has(m.subjectId))return false;
  const subject=subjectById.get(m.subjectId);
  const supplied=String(m.subject).trim().toLowerCase();
  const aliases=[subject.name,subject.subjectName].filter(Boolean).map(v=>String(v).trim().toLowerCase());
  return aliases.length>0&&!aliases.includes(supplied);
 }).length;
 if(conflictingSubjectLabels)blockers.push(conflictingSubjectLabels+" marks have conflicting subject ID and subject name.");
 const subjectClassById=new Map(data.subjects.map(s=>[s.id,String(s.classNo??s.classId??"")]));
 const subjectClassMismatches=data.marks.filter(m=>{
  if(!m.subjectId||!subjectClassById.has(m.subjectId))return false;
  const subClass=subjectClassById.get(m.subjectId);
  const markClass=String(m.classNo??m.classId??(studentClass.get(m.studentId)||examClass.get(m.examId))??"");
  return Boolean(subClass&&markClass&&subClass!==markClass);
 }).length;
 if(subjectClassMismatches)blockers.push(subjectClassMismatches+" marks reference subjects from another class.");
 const nameOnlyClassMismatches=data.marks.filter(m=>{
  if(m.subjectId||!m.subject)return false;
  const name=String(m.subject).trim().toLowerCase();
  const markClass=String(m.classNo??m.classId??(studentClass.get(m.studentId)||examClass.get(m.examId))??"");
  if(!markClass)return false;
  const sameClass=subjectByName.get(JSON.stringify([markClass,name]));
  const generic=subjectByName.get(JSON.stringify(["",name]));
  if(sameClass?.size||generic?.size)return false;
  return data.subjects.some(s=>String(s.classNo??s.classId??"")!==markClass&&
   [s.name,s.subjectName].filter(Boolean).some(v=>String(v).trim().toLowerCase()===name));
 }).length;
 if(nameOnlyClassMismatches)blockers.push(nameOnlyClassMismatches+" marks reference subject names assigned only to another class.");


 blockers.push("Verify class-specific subject credits, applicability, exam term and assessment component mappings before official rendering.");
 return Object.freeze({counts,blockers:Object.freeze(blockers),readyForOfficialLedger:false});
}
