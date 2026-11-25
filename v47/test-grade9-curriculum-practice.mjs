import assert from 'node:assert/strict';
import {grade9PracticeTopics,generateGrade9CurriculumPractice,assertGrade9CurriculumPractice} from './grade9-curriculum-practice.mjs';
import {printReadOnlyPracticePaper} from './question-paper-cdc-preview.mjs';
for(const [key,languages] of [['science',['ne','en','both']],['social',['ne']],['math',['ne','en','both']],['environment',['ne','en','both']],['nepali',['ne']],['english',['en']],['economics',['ne','en','both']],['accounting',['ne','en','both']]]){
 for(const language of languages){
  const units=grade9PracticeTopics(key,language);
  assert.ok(units.length>=5);
  const selected=units.slice(0,3).map(u=>u.topics.find(t=>t.available).id);
  const paper=generateGrade9CurriculumPractice({schoolId:'12345',schoolName:'Synthetic School',key,language,topicIds:selected,fullMarks:3,rng:()=>.4});
  assert.equal(paper.totalMarks,3);assert.equal(paper.questions.length,3);
  assert.equal(paper.exactGridMatched,false);
  assert.equal(assertGrade9CurriculumPractice(paper),true);
  assert.match(printReadOnlyPracticePaper({paper}),/NOT AN OFFICIAL CDC QUESTION PAPER/);
  assert.throws(()=>assertGrade9CurriculumPractice({...paper}),/Unchanged/);
  if(language==='en')assert.ok(paper.questions.every(q=>!/[\u0900-\u097f]/.test(q.questionText)));
 }
}
assert.throws(()=>grade9PracticeTopics('social','both'),/Invalid subject or language/);
assert.throws(()=>grade9PracticeTopics('nepali','en'),/Invalid subject or language/);
assert.throws(()=>grade9PracticeTopics('english','both'),/Invalid subject or language/);
console.log('PASS V47 Grade 9 eight-subject original curriculum practice, language restrictions and no current grid claim');
