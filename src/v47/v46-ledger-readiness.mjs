/** Pure, read-only compatibility audit for a verified V47 school dataset. */
export function auditV47LedgerReadiness(data,{schoolId}={}){
 const kinds=["students","subjects","exams","marks"];
 if(!data||kinds.some(k=>!Array.isArray(data[k])))throw new TypeError("Complete verified school dataset required");
 const counts=Object.freeze(Object.fromEntries(kinds.map(k=>[k,data[k].length])));
 const blockers=[];
 for(const kind of kinds)if(!counts[kind])blockers.push("No "+kind+" records available.");
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
