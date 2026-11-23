import assert from 'node:assert/strict';
import {getBundledComputerGrid,bundledComputerUnitTopics,isCdcComputerSubject}
 from '../cdc-verified-computer-grids.mjs';
import {validateExactCdcUnitGrid,allocateExactCdcUnitGrid}
 from '../cdc-exact-grid.mjs';
const expectedUnitMarks={9:[11,4,5,8,5,5,12],10:[11,8,8,12,11]};
const expectedUnitNames={
 9:['Computer System','Number System','Block Programming','Web Technology',
    'Internet and Social Media','Digital Citizenship and Cyber Security',
    'Programming Concept (Python)'],
 10:['Computer Network and Communication','Database Management System',
    'Multimedia','Programming in Python','AI and Contemporary Technologies']
};
for(const grade of [9,10]){
 const subject=grade===9?'Optional Computer Science':'ऐच्छिक कम्प्युटर विज्ञान';
 const bp=getBundledComputerGrid({grade,subject,fullMarks:50});
 assert.ok(bp,'Official CDC grid must load without school API or Excel import');
 assert.equal(bp.gradeNumber,grade);
 assert.equal(bp.subject,subject);
 assert.equal(bp.fullMarks,50);
 assert.equal(bp.durationMinutes,120);
 assert.equal(bp.originalGovernmentPdf,true);
 assert.equal(bp.schoolReviewRequired,true);
 assert.match(bp.sourceUrl,/^https:\/\/giwmscdnone\.gov\.np\/media\/pdf_upload\//);
 assert.equal(bp.unitNames.length,expectedUnitMarks[grade].length);
 assert.deepEqual(bp.unitNames,expectedUnitNames[grade]);
 const compiled=validateExactCdcUnitGrid(bp,50,{gradeNumber:grade,subject});
 assert.equal(compiled.slots.length,25);
 assert.deepEqual(bp.pattern.map(x=>[x.type,x.count,x.marks]),
  [['mcq',10,1],['short',10,2],['long',5,4]]);
 assert.deepEqual(Object.values(bp.cognitiveDistribution),[20,30,30,20]);
 const byUnit=bp.unitNames.map((_,i)=>bp.unitGrid.filter(row=>row.unitCode===String(i+1))
  .reduce((sum,row)=>sum+row.marks*row.count,0));
 assert.deepEqual(byUnit,expectedUnitMarks[grade]);
 const topics=bundledComputerUnitTopics(grade,subject);
 assert.equal(topics.length,expectedUnitMarks[grade].length);
 assert.equal(new Set(topics.map(t=>t.id)).size,topics.length);
 assert.deepEqual(topics.map(t=>t.unitTitle),bp.unitNames);
 // Each required CDC slot receives two fully distinct SYNTHETIC question IDs.
 // This checks that the unchanged allocator can generate different exact
 // papers without silently weakening the official unit/mark distribution.
 let index=0;
 const bank=[];
 for(const row of bp.unitGrid){
  for(let k=0;k<row.count;k++){
   for(let alternative=0;alternative<2;alternative++){
    const unitTopic=topics[Number(row.unitCode)-1];
    bank.push({
     id:'synthetic_'+grade+'_'+index+'_'+k+'_'+alternative,
     questionText:'कृत्रिम प्रश्न '+grade+' '+index+' '+k+' '+alternative+'?',
     answer:'कृत्रिम उत्तर',status:'active',
     unitCode:row.unitCode,topicId:unitTopic.id+'_0',
     topicName:unitTopic.unitTitle,unitTitle:unitTopic.unitTitle,
     questionType:row.type,marks:row.marks,cognitiveLevel:row.cognitiveLevel,
     options:row.type==='mcq'?['एक','दुई','तीन','चार']:[],
     correctOption:row.type==='mcq'?'A':''
    });
   }
   index++;
  }
 }
 const topicIds=topics.map(t=>t.id+'_0');
 const paper1=allocateExactCdcUnitGrid({blueprint:bp,fullMarks:50,
  eligible:bank,selectedTopicIds:topicIds,rng:()=>0.241});
 assert.equal(paper1.questions.length,25);
 assert.equal(paper1.questions.reduce((a,q)=>a+q.marks,0),50);
 assert.equal(paper1.slotEvidence.length,25);
 const paper2=allocateExactCdcUnitGrid({blueprint:bp,fullMarks:50,
  eligible:bank,selectedTopicIds:topicIds,
  previousSignature:paper1.signature,rng:()=>0.519});
 assert.notEqual(paper1.signature,paper2.signature);
 for(const wrong of ['Science and Technology','Computer Engineering','Optional Mathematics','']){
  assert.equal(getBundledComputerGrid({grade,subject:wrong,fullMarks:50}),null);
 }
 assert.equal(getBundledComputerGrid({grade,subject,fullMarks:75}),null);
 assert.equal(getBundledComputerGrid({grade:8,subject,fullMarks:50}),null);
 assert.equal(isCdcComputerSubject('Computer Engineering'),false);
 console.log('PASS CDC Grade '+grade+' Computer Science official 50-mark grid:',
  bp.unitNames.length+' units, 25 questions, 20/30/30/20 marks, no repeated set');
}
