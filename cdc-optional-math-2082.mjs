/**
 * Official CDC 2082 Optional Mathematics (Grades 9 and 10)
 * Source: first page of the CDC published Specification Grid and Model Question.
 *
 * IMPORTANT: This is a COMPOSITE question specification, not a flat
 * MCQ/short/long unitGrid. It must NOT be fed into the old exact allocator,
 * which lacks within-content-area/cross-content-area grouped questions and
 * multi-cognitive subquestion support.
 * See https://giwmscdnone.gov.np/media/pdf_upload/Specification%20Grid%20and%20Model%20Question-G9-Opt.%20Math-web_nrbp00y.pdf
 */
const data={
 sourceUrl:'https://giwmscdnone.gov.np/media/pdf_upload/Specification%20Grid%20and%20Model%20Question-G9-Opt.%20Math-web_nrbp00y.pdf',
 sourceVersion:'2082',subject:'Optional Mathematics',grades:[9,10],
 fullMarks:75,durationMinutes:180,
 questionGroups:[
  {code:'objective',questionCount:11,totalMarks:11,marksEach:1},
  {code:'WCA',questionCount:12,totalMarks:40},
  {code:'CCA',questionCount:4,totalMarks:24}
 ],
 // These are the six full content-domain totals printed in the CDC grid.
 areas:[
  {unitCode:'1',unitTitle:'Algebra / बीजगणित',workHours:29,totalMarks:17,objectiveCount:2,wcaQuestionCount:3,marksByGroup:{"objective":[1,0,1,0],"WCA":[2,2,4,2],"CCA":[0,2,2,1]}},
  {unitCode:'2',unitTitle:'Trigonometry / त्रिकोणमिति',workHours:30,totalMarks:17,objectiveCount:3,wcaQuestionCount:3,marksByGroup:{"objective":[1,0,1,1],"WCA":[2,2,4,1],"CCA":[0,2,2,1]}},
  {unitCode:'3',unitTitle:'Geometry / ज्यामिति',workHours:36,totalMarks:20,objectiveCount:3,wcaQuestionCount:3,marksByGroup:{"objective":[1,0,1,1],"WCA":[2,3,6,0],"CCA":[0,2,1,3]}},
  {unitCode:'4',unitTitle:'Vectors / भेक्टर',workHours:11,totalMarks:7,objectiveCount:1,wcaQuestionCount:1,marksByGroup:{"objective":[0,1,0,0],"WCA":[1,0,1,1],"CCA":[0,0,2,1]}},
  {unitCode:'5',unitTitle:'Statistics / तथ्याङ्कशास्त्र',workHours:10,totalMarks:7,objectiveCount:1,wcaQuestionCount:1,marksByGroup:{"objective":[0,1,0,0],"WCA":[1,1,0,1],"CCA":[0,0,3,0]}},
  {unitCode:'6',unitTitle:'Limit and Continuity / सीमान्तमान र निरन्तरता',workHours:12,totalMarks:7,objectiveCount:1,wcaQuestionCount:1,marksByGroup:{"objective":[0,1,0,0],"WCA":[1,1,1,1],"CCA":[0,0,1,1]}}
 ],
 cognitiveDistribution:{knowledge:16,understanding:24,application:40,higher:20},
 compositeRules:{
  minSubquestionsPerQuestion:2,maxSubquestionsPerQuestion:4,
  requiresContext:true,requiresCrossAreaQuestions:true,
  requiresWithinAreaQuestions:true,cognitiveMarksTolerance:2,
  alternateDiagramQuestionsForBlindStudents:true
 },
 gridOrigin:'official_cdc_pdf_2082_optional_math',
 requiresCompositeQuestionEngine:true,
 automaticExactGenerationReady:false,
 teachingReviewRequired:true
};
// Original government CDC PDF page 1, visually checked. K,U,A,HA marks.
// Exact cells are the conservative SMSS target; CDC allows cognitive variation.
const cellGroups=['objective','WCA','CCA'], cellLevels=['knowledge','understanding','application','higher'];
export function optionalMathCellTargets(guide){
 const result={};
 for(const area of guide.areas)for(const group of cellGroups)for(const [i,level] of cellLevels.entries()){
  const marks=area.marksByGroup?.[group]?.[i];
  if(!Number.isSafeInteger(marks)||marks<0)throw Error('Invalid CDC area/group cognitive cell');
  result[[area.unitCode,group,level].join('|')]=marks;
 }
 return result;
}
export function optionalMathCellAudit(guide,questions){
 const expected=optionalMathCellTargets(guide),actual=Object.fromEntries(Object.keys(expected).map(key=>[key,0]));
 for(const q of questions)for(const s of q.subquestions){
  const key=[s.unitCode,q.group,s.cognitiveLevel].join('|');
  if(!Object.hasOwn(actual,key)||!Number.isSafeInteger(s.marks)||s.marks<1)throw Error('Invalid optional math cell evidence');
  actual[key]+=s.marks;
 }
 const mismatches=Object.keys(expected).filter(key=>actual[key]!==expected[key]).map(key=>({key,expected:expected[key],actual:actual[key]}));
 return {matches:!mismatches.length,expected,actual,mismatches};
}
function validate(){
 const cells=optionalMathCellTargets(data);
 const sum=rows=>rows.reduce((s,n)=>s+n,0);
 for(const a of data.areas)if(sum(cellGroups.flatMap(group=>a.marksByGroup[group]))!==a.totalMarks||sum(a.marksByGroup.objective)!==a.objectiveCount)throw Error('CDC area cell total mismatch');
 for(const group of data.questionGroups)if(sum(Object.keys(cells).filter(k=>k.split('|')[1]===group.code).map(k=>cells[k]))!==group.totalMarks)throw Error('CDC group cell total mismatch');
 for(const level of cellLevels)if(sum(Object.keys(cells).filter(k=>k.endsWith('|'+level)).map(k=>cells[k]))!==data.cognitiveDistribution[level]*.75)throw Error('CDC cognitive cell total mismatch');
 const total=data.areas.reduce((sum,x)=>sum+x.totalMarks,0);
 const totalHours=data.areas.reduce((sum,x)=>sum+x.workHours,0);
 const totals=data.questionGroups.reduce((sum,x)=>sum+x.totalMarks,0);
 const count=data.questionGroups.reduce((sum,x)=>sum+x.questionCount,0);
 if(total!==75||totals!==75||totalHours!==128||count!==27||
  data.areas.reduce((sum,x)=>sum+x.objectiveCount,0)!==11||
  data.areas.reduce((sum,x)=>sum+x.wcaQuestionCount,0)!==12||
  Object.values(data.cognitiveDistribution).reduce((sum,x)=>sum+x,0)!==100)
  throw Error('Published CDC Optional Mathematics Grid total mismatch');
}
validate();
export function isOptionalMathSubject(subject){
 const s=String(subject||'').trim().toLowerCase().normalize('NFKC');
 if(!s)return false;
 const optional=/(optional|elective|ऐच्छिक|इच्छाधीन|option)/i.test(s);
 const mathematics=/(math|गणित)/i.test(s);
 return optional&&mathematics;
}
export function getCdcOptionalMathGuide({grade,subject}){
 if(![9,10].includes(grade)||!isOptionalMathSubject(subject))return null;
 // Safe copies prevent a consumer from mutating the verified source snapshot.
 return {...data,gradeNumber:grade,subject,
  grades:[...data.grades],
  areas:data.areas.map(x=>({...x,marksByGroup:Object.fromEntries(cellGroups.map(group=>[group,[...x.marksByGroup[group]]]))})),
  questionGroups:data.questionGroups.map(x=>({...x})),
  cognitiveDistribution:{...data.cognitiveDistribution},
  compositeRules:{...data.compositeRules}};
}
export function optionalMathAreaTopics(grade,subject){
 const guide=getCdcOptionalMathGuide({grade,subject});
 if(!guide)return [];
 return guide.areas.map(area=>({
  id:'cdc_optional_math_2082_g'+grade+'_u'+area.unitCode,
  unitCode:area.unitCode,unitTitle:area.unitTitle,
  topics:[area.unitTitle],sourceTitle:'CDC 2082 Optional Mathematics Specification Grid',
  sourceUrl:guide.sourceUrl,sourceStatus:'verified_area_totals_grouped_generator_pending'
 }));
}

// Original practice slot arrangement, not a reproduction of published model questions.
// The marks and level labels come from the grid; question difficulty still needs teacher review.
export function optionalMathOriginalSlots(guide){
 const K='knowledge',U='understanding',A='application',H='higher';
 const within=[
  [[1,K,1],[1,U,1],[1,A,2]],[[1,K,1],[1,U,1],[1,H,1]],[[1,A,2],[1,H,1]],
  [[2,K,1],[2,U,1],[2,A,1]],[[2,K,1],[2,A,2]],[[2,U,1],[2,A,1],[2,H,1]],
  [[3,K,1],[3,U,1],[3,A,2]],[[3,K,1],[3,U,1],[3,A,2]],[[3,U,1],[3,A,2]],
  [[4,K,1],[4,A,1],[4,H,1]],[[5,K,1],[5,U,1],[5,H,1]],[[6,K,1],[6,U,1],[6,A,1],[6,H,1]]
 ];
 const cross=[
  [[1,U,2],[2,A,2],[3,H,2]],
  [[1,A,2],[1,H,1],[2,U,2],[2,H,1]],
  [[3,U,2],[3,A,1],[4,A,2],[4,H,1]],
  [[3,H,1],[5,A,3],[6,A,1],[6,H,1]]
 ];
 const order=(rows,group)=>rows.map(row=>({group,parts:row.map(([unit,level,marks])=>[unit,marks,level])}));
 const objective=guide.areas.flatMap(a=>a.marksByGroup.objective.flatMap((marks,i)=>Array.from({length:marks},()=>({group:'objective',parts:[[Number(a.unitCode),1,cellLevels[i]]]}))));
 const slots=[...objective,...order(within,'WCA'),...order(cross,'CCA')];
 if(slots.length!==27||!optionalMathCellAudit(guide,slots.map(q=>({group:q.group,subquestions:q.parts.map(([unitCode,marks,cognitiveLevel])=>({unitCode:String(unitCode),marks,cognitiveLevel}))}))).matches)throw Error('Original math slots do not match CDC cells');
 return slots;
}
