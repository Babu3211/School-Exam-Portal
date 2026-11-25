import assert from 'node:assert/strict';
import {grade9PracticeTopics,grade9PracticeCapacity,generateGrade9CurriculumPractice,assertGrade9CurriculumPractice} from './grade9-curriculum-practice.mjs';
import {printReadOnlyPracticePaper} from './question-paper-cdc-preview.mjs';
for(const [key,languages] of [['science',['ne','en','both']],['social',['ne']],['math',['ne','en','both']],['environment',['ne','en','both']],['nepali',['ne']],['english',['en']],['economics',['ne','en','both']],['accounting',['ne','en','both']],['health',['ne','en','both']]]){
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
console.log('PASS V47 Grade 9 nine-subject original curriculum practice, language restrictions and no current grid claim');

const health=grade9PracticeTopics('health','both').flatMap(u=>u.topics.map(t=>t.id));
const capacity=grade9PracticeCapacity({key:'health',language:'both',topicIds:health,fullMarks:50});
assert.equal(capacity.questionCount,27);assert.equal(capacity.availableMarks,63);assert.equal(capacity.canGenerate,true);
assert.deepEqual(capacity.possible,Array.from({length:42},(_,i)=>i+9));
assert.equal(grade9PracticeCapacity({key:'health',language:'both',topicIds:health,fullMarks:25}).canGenerate,true);
assert.equal(grade9PracticeCapacity({key:'health',language:'both',topicIds:[],fullMarks:1}).canGenerate,false);
assert.throws(()=>grade9PracticeCapacity({key:'health',language:'both',topicIds:[health[0],health[0]],fullMarks:1}));
console.log('PASS Grade 9 topic coverage and available exact full-marks preflight');

for(const [key,fullMarks,availableMarks] of [['economics',75,96],['accounting',75,120],['health',50,63]]){
 for(const language of ['ne','en','both']){
  const topicIds=grade9PracticeTopics(key,language).flatMap(u=>u.topics.map(t=>t.id));
  const capacity=grade9PracticeCapacity({key,language,topicIds,fullMarks});
  assert.equal(capacity.availableMarks,availableMarks);assert.equal(capacity.canGenerate,true);
  let state=117;const rng=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
  const args={schoolId:'12345',schoolName:'Synthetic School',key,language,topicIds,fullMarks,rng};
  const first=generateGrade9CurriculumPractice(args),second=generateGrade9CurriculumPractice({...args,avoidSignatures:[first.signature]});
  assert.equal(first.totalMarks,fullMarks);assert.equal(first.questions.reduce((n,q)=>n+q.marks,0),fullMarks);
  assert.equal(new Set(first.questions.map(q=>q.topicId)).size,topicIds.length);
  assert.notEqual(first.signature,second.signature);assert.equal(first.exactGridMatched,false);
 }
}
console.log('PASS full-mark original practice and distinct paper generation for expanded Economics, Accounting and Health banks');
