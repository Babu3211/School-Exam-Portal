import assert from 'node:assert/strict';
import {getScience2078Reference,assertScience2078ReferencePaper,planScience2078ReferencePaper as plan} from '../cdc-grade9-science-reference-planner.mjs';
const grade=9,subject='Science and Technology',r=getScience2078Reference({grade,subject});
assert.equal(r.mirrorChecklistPrintedTotal,75);
assert.deepEqual(r.contentGroups.map(g=>g.marks),[10,19,26,20]);
assert.deepEqual(r.cognitiveMarks,[12,22,22,19]);
assert.equal(r.currentCdcExactApproved,false);
// Construct test-only unit assignments by partitioning the nominal question
// sizes into exact historical unit marks. No synthetic item enters school data.
const levels=['knowledge','understanding','application','higher'];
const slots=r.groups.flatMap(g=>g.levelCounts.flatMap((n,i)=>Array.from({length:n},()=>({type:g.code,marks:g.marksEach,level:levels[i]})))).sort((a,b)=>b.marks-a.marks);
const remaining=r.units.map(u=>u.marks),assignment=[];
function partition(i){
 if(i===slots.length)return remaining.every(n=>n===0);
 const seen=new Set(),m=slots[i].marks;
 for(let u=0;u<19;u++){const n=remaining[u];if(n<m||seen.has(n))continue;seen.add(n);remaining[u]-=m;assignment[i]=u;if(partition(i+1))return true;remaining[u]+=m;}
 return false;
}
assert.ok(partition(0));
const bank=slots.flatMap((s,i)=>[0,1].map(v=>({id:i+'-'+v,gradeNumber:9,subject,topicId:'unit-'+(assignment[i]+1),unitCode:String(assignment[i]+1),referenceUnitTitle:r.units[assignment[i]].title,sourceYearBS:2078,status:'active',reviewStatus:'teacher_reviewed',reviewedBy:'fixture-only',questionType:s.type,marks:s.marks,cognitiveLevel:s.level,questionText:'परीक्षण प्रश्न '+i+' '+v,questionTextEn:'Synthetic prompt '+i+' '+v,answer:'उत्तर',answerEn:'Answer',options:['उत्तर','ख','ग','घ'],optionsEn:['Answer','B','C','D'],correctOption:'A',elements:Array.from({length:s.marks},()=>({marks:1,cognitiveLevel:s.level,answerNe:'उत्तर',answerEn:'Answer'}))})));
const topics=r.units.map(u=>'unit-'+u.unitCode);
const args={grade,subject,questions:bank,selectedTopicIds:topics,rng:()=>.42,maxVisits:200000};
const a=plan(args);assert.equal(a.ready,true,a.reason);assert.equal(a.paper.questions.length,40);assert.deepEqual(a.contentMarks,[10,19,26,20]);assert.deepEqual(a.cognitiveMarks,[12,22,22,19]);
const b=plan({...args,previousSignature:a.signature,rng:()=>.61});assert.equal(b.ready,true,b.reason);assert.notEqual(b.signature,a.signature);
for(const mutate of [p=>p.questions.pop(),p=>p.questions[0].marks++,p=>p.questions[0].referenceUnitTitle='Mushroom',p=>p.questions[0].elements.pop(),p=>p.questions[0].reviewStatus='draft',p=>p.fullMarks=74,p=>p.questions.find(q=>q.questionType==='mcq').correctOption='B']){
 const bad=structuredClone(a.paper);mutate(bad);assert.throws(()=>assertScience2078ReferencePaper(bad),/reference mismatch/);
}
// Mixed cognitive response elements are permitted if the total level marks
// are conserved across questions and nominal question counts remain intact.
const mixed=structuredClone(a.paper);const x=mixed.questions.find(q=>q.marks>1&&q.cognitiveLevel==='knowledge');const y=mixed.questions.find(q=>q.marks>1&&q.cognitiveLevel==='understanding');
[x.elements[0].cognitiveLevel,y.elements[0].cognitiveLevel]=[y.elements[0].cognitiveLevel,x.elements[0].cognitiveLevel];
assert.equal(assertScience2078ReferencePaper(mixed).referenceStructureMatched,true);
assert.equal(plan({...args,questions:bank.filter(q=>q.unitCode!=='3')}).ready,false);
assert.equal(plan({...args,questions:bank.map(q=>q.unitCode==='19'?{...q,referenceUnitTitle:'Materials used in Agriculture'}:q)}).ready,false);
console.log('PASS historical science 40 questions,75 marks,19 units, four content-group totals, mixed cognitive elements, no repeat and old/new unit isolation');
