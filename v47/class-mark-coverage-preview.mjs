// Read-only roster reconciliation. Never use as authorization for marks writes.
export function inspectClassMarkCoverage(rows,{examId,classNo,subject,section=null}={}){
 if(!rows||!Array.isArray(rows.students)||!Array.isArray(rows.marks)||!Array.isArray(rows.exams))throw new Error('Verified school report inputs required');
 if(!rows.exams.some(exam=>exam.id===examId)||!Number.isInteger(classNo)||classNo<1||classNo>12||typeof subject!=='string'||!subject.trim())throw new Error('Verified exam, class and subject required');
 const classOf=value=>{const match=String(value??'').match(/(?:^|\b)(\d{1,2})(?:\b|$)/);return match?Number(match[1]):null};
 const key=value=>String(value??'').trim().toLocaleLowerCase('en-US');
 if(section!==null&&(typeof section!=='string'||!section.trim()))throw new Error('Valid section required');
 const inSection=item=>section===null||key(item.section)===key(section);
 const roster=rows.students.filter(student=>classOf(student.className??student.class)===classNo&&inSection(student));
 const ids=new Set(roster.map(student=>student.id));
 const selected=rows.marks.filter(mark=>mark.examId===examId&&classOf(mark.className??mark.class)===classNo&&key(mark.subject)===key(subject)&&inSection(mark));
 const covered=new Set(),duplicates=[],outsiders=[];
 for(const mark of selected){
  if(!ids.has(mark.studentId)){outsiders.push(mark.id);continue;}
  if(covered.has(mark.studentId))duplicates.push(mark.id);
  covered.add(mark.studentId);
 }
 const missing=roster.filter(student=>!covered.has(student.id)).map(student=>student.id);
 return Object.freeze({examId,classNo,subject,section,rosterCount:roster.length,markCount:selected.length,missing:Object.freeze(missing),duplicates:Object.freeze(duplicates),outsiders:Object.freeze(outsiders),complete:roster.length>0&&!missing.length&&!duplicates.length&&!outsiders.length,publicationAllowed:false});
}
