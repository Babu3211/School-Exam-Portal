// Pure completeness gate for school-scoped result previews. No writes or GPA calculation.
const id=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(value);
export function verifyClassMarksCoverage({students,subjects,records,schoolClass,term,hasMore=false}){
 if(hasMore)throw new Error('All marks pages must be loaded');
 if(!Array.isArray(students)||!Array.isArray(subjects)||!Array.isArray(records)||!students.length||!subjects.length)throw new Error('Student and subject rosters required');
 if(!schoolClass||!term)throw new Error('Class and term required');
 const studentIds=new Set(),subjectIds=new Set(),seen=new Set();
 for(const student of students){
  if(!id(student?.id)||student.class!==schoolClass||student.active!==true||studentIds.has(student.id))throw new Error('Invalid or duplicate active student roster');
  studentIds.add(student.id);
 }
 for(const subject of subjects){
  if(!id(subject?.id)||subject.class!==schoolClass||subject.active!==true||subjectIds.has(subject.id))throw new Error('Invalid or duplicate active subject roster');
  subjectIds.add(subject.id);
 }
 for(const record of records){
  if(!id(record?.studentId)||!id(record?.subjectId)||record.class!==schoolClass||record.term!==term)throw new Error('Invalid marks class or term');
  if(!studentIds.has(record.studentId)||!subjectIds.has(record.subjectId))throw new Error('Marks reference student or subject outside roster');
  const key=JSON.stringify([record.studentId,record.subjectId]);
  if(seen.has(key))throw new Error('Duplicate marks for student and subject');
  seen.add(key);
 }
 const expected=studentIds.size*subjectIds.size;
 if(seen.size!==expected)throw new Error('Incomplete class marks: '+seen.size+'/'+expected);
 return {complete:true,studentCount:studentIds.size,subjectCount:subjectIds.size,recordCount:seen.size};
}
