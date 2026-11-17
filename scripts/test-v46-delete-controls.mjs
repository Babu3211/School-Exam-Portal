import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
for(const token of [
 'function confirmPermanentDeletion(label)',
 'return confirm("अन्तिम पुष्टि:',
 'deleteDoc(doc(db,"exams",id))',
 'deleteDoc(doc(db,"staff",id))',
 'deleteDoc(doc(db,"students",id))',
 'deleteDoc(doc(db,"subjects",id))',
 'deleteDoc(doc(db,"classes",id))',
 'collection(db,"marks")',
 'collection(db,"attendance")',
 'collection(db,"user_roles")',
 'deletedMarks=',
 'linked.slice(offset,offset+400).forEach(d=>batch.delete(d.ref))',
 'शैक्षिक अभिलेख सुरक्षित राख्न Delete रोकियो',
 'data-exam-delete',
 'data-staff-delete',
 'data-student-delete',
 'data-subject-archive',
 'data-class-delete'
])assert.ok(html.includes(token),'Missing deletion safety control: '+token);
for(const fn of ['removeStaff','removeStudent','deleteExam','archiveSubjectCatalog','deleteClass']){
 const start=html.indexOf('async function '+fn+'(');
 assert.ok(start>=0,'Missing '+fn);
 const body=html.slice(start,start+2600);
 if(fn==='deleteExam'){
  assert.ok(body.includes('if(!confirm('),'Exam delete must explicitly confirm twice');
  assert.ok(body.split('if(!confirm(').length>=3,'Exam delete missing second confirmation');
 }else assert.ok(body.includes('confirmPermanentDeletion('),fn+' missing two confirmations');
 assert.ok(body.includes('deleteDoc('),fn+' missing physical deletion');
}
console.log('V46 Delete controls static checks passed (Firebase emulator and browser tests still required)');
