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
 const subjectNames=new Set(data.subjects.flatMap(s=>[s.name,s.subjectName].filter(Boolean).map(String)));
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
 const subjectById=new Map(data.subjects.map(s=>[s.id,s]));
 const subjectByName=new Map();
 for(const subject of data.subjects){
  for(const name of [subject.name,subject.subjectName].filter(Boolean)){
   const key=String(name).trim().toLowerCase();
   if(!subjectByName.has(key))subjectByName.set(key,new Set());
   subjectByName.get(key).add(subject.id);
  }
 }
 const resolveSubject=mark=>{
  if(mark.subjectId)return String(mark.subjectId);
  const name=String(mark.subject??"").trim().toLowerCase();
  const matches=subjectByName.get(name);
  return matches?.size===1?[...matches][0]:"name:"+name;
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
 const unknownSubjects=data.marks.filter(m=>(m.subjectId||m.subject)&&!subjectIds.has(m.subjectId||m.subject)&&!subjectNames.has(String(m.subjectId||m.subject))).length;
 if(unknownSubjects)blockers.push(unknownSubjects+" marks reference unknown school subjects.");
 blockers.push("Verify class-specific subject credits, applicability, exam term and assessment component mappings before official rendering.");
 return Object.freeze({counts,blockers:Object.freeze(blockers),readyForOfficialLedger:false});
}
