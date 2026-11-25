import assert from 'node:assert/strict';
import {planGrade9EnglishReferencePaper as plan} from '../cdc-grade9-english-grouped-planner.mjs';
const subject='English',topics=['a','b'];
const rows=[['reading1',5,100,'poem',['true_false'],['literal','literal','literal','reorganization','inference']],['reading2',10,200,'interview',['gap_fill','short_answer'],['literal','literal','literal','literal','reorganization','reorganization','reorganization','inference','inference','evaluation']],['reading3',10,200,'notice',['true_false','short_answer'],['literal','literal','literal','literal','reorganization','reorganization','inference','inference','inference','evaluation']],['reading4',15,300,'science_article',['matching','ordering','short_answer'],['literal','literal','literal','literal','literal','reorganization','reorganization','inference','inference','evaluation','vocabulary','vocabulary','vocabulary','vocabulary','vocabulary']]];
const passage=(n,i,v)=>Array.from({length:n},(_,j)=>'word'+i+'v'+v+'n'+j).join(' ');
const common=(slot,i,v,marks)=>({id:slot+'-'+v,slot,gradeNumber:9,subject,topicId:topics[i%2],marks,text:'Synthetic test prompt '+slot+' variant '+v,status:'active',reviewStatus:'teacher_reviewed',reviewedBy:'fixture-only'});
const bank=[0,1].flatMap(v=>[
 ...rows.map(([slot,marks,n,genre,types,ds],i)=>({...common(slot,i,v,marks),genre,passage:passage(n,i,v),sourceKind:i<2?'textbook':'original_unseen',sourceTitle:'Synthetic fixture not textbook',sourceEdition:'fixture',sourcePage:1,sourceUrl:'https://moecdc.gov.np/',items:ds.map((domain,j)=>({type:types[j%types.length],domain,marks:1,text:'Test item '+j,answer:domain==='vocabulary'?'word'+i+'v'+v+'n'+j:'Test answer'}))})),
 ...[['paragraph',5,100],['biography',5,100],['dialogue',6,150],['essay',8,200]].map(([genre,marks,targetWords],i)=>({...common('writing'+(i+1),i,v,marks),genre,targetWords,answer:'Synthetic rubric'})),
 {...common('transformation',0,v,6),items:['tense','question_tag','reported_speech','voice','wh_question','negation'].map(grammar=>({grammar,marks:1,text:'Test '+grammar,answer:'Test answer'}))},
 {...common('contextual_mcq',1,v,5),passage:Array.from({length:10},(_,j)=>'Text {'+(j+1)+'}').join(' '),items:Array.from({length:10},(_,j)=>({grammar:'tense',marks:.5,text:'Blank '+j,options:['is','are','was','were'],correctOption:'A',answer:'is'}))}
]);
const args={grade:9,subject,selectedTopicIds:topics,questions:bank,rng:()=>.41};
const p=plan(args);assert.equal(p.ready,true,p.reason);assert.equal(p.paper.groups.length,10);assert.equal(p.paper.groups.reduce((n,q)=>n+q.marks,0),75);assert.equal(p.currentCdcExactApproved,false);
const next=plan({...args,previousSignature:p.signature,rng:()=>.61});assert.equal(next.ready,true,next.reason);assert.notEqual(next.signature,p.signature);
for(const slot of ['reading1','reading4','writing3','transformation','contextual_mcq']){const q=plan({...args,questions:bank.filter(x=>x.slot!==slot)});assert.equal(q.ready,false);assert.ok(q.shortages.includes(slot));}
const bad=fn=>plan({...args,questions:structuredClone(bank).map(fn)}).ready;
assert.equal(bad(q=>q.slot==='reading1'?{...q,sourcePage:0}:q),false);
assert.equal(bad(q=>q.slot==='reading3'?{...q,sourceKind:'textbook'}:q),false);
assert.equal(bad(q=>q.slot==='reading2'?{...q,items:q.items.map((x,j)=>({...x,type:j%2?'short_answer':'true_false'}))}:q),false);
assert.equal(bad(q=>q.slot==='reading1'?{...q,items:q.items.map(x=>({...x,domain:'literal'}))}:q),false);
assert.equal(bad(q=>q.slot==='reading2'?{...q,items:q.items.map((x,j)=>({...x,type:j<4?'gap_fill':'short_answer'}))}:q),false,'Reject a 4+6 reading group instead of a 5+5 model group');
assert.equal(bad(q=>q.slot==='writing2'?{...q,genre:'news_story',targetWords:150}:q),false);
assert.equal(bad(q=>q.slot==='contextual_mcq'?{...q,items:q.items.map(x=>({...x,marks:1}))}:q),false);
assert.equal(bad(q=>q.slot==='contextual_mcq'?{...q,items:q.items.map(x=>({...x,options:['is','are','was']}))}:q),false);
assert.equal(bad(q=>({...q,reviewStatus:'draft'})),false);
assert.throws(()=>plan({...args,fullMarks:50}),/75-mark/);
console.log('PASS Grade9 English official skill-chart reference planner: 40 reading,24 writing,11 grammar; passage, domain, choice, marks, review and no-repeat gates');

assert.equal(bad(q=>q.slot==='reading4'?{...q,items:q.items.map(x=>x.domain==='vocabulary'?{...x,answer:'absentword'}:x)}:q),false);
console.log('PASS reject vocabulary answers absent from reading passage');
