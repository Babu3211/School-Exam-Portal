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
  {unitCode:'1',unitTitle:'Algebra / बीजगणित',workHours:29,totalMarks:17,objectiveCount:2,wcaQuestionCount:3},
  {unitCode:'2',unitTitle:'Trigonometry / त्रिकोणमिति',workHours:30,totalMarks:17,objectiveCount:3,wcaQuestionCount:3},
  {unitCode:'3',unitTitle:'Geometry / ज्यामिति',workHours:36,totalMarks:20,objectiveCount:3,wcaQuestionCount:3},
  {unitCode:'4',unitTitle:'Vectors / भेक्टर',workHours:11,totalMarks:7,objectiveCount:1,wcaQuestionCount:1},
  {unitCode:'5',unitTitle:'Statistics / तथ्याङ्कशास्त्र',workHours:10,totalMarks:7,objectiveCount:1,wcaQuestionCount:1},
  {unitCode:'6',unitTitle:'Limit and Continuity / सीमान्तमान र निरन्तरता',workHours:12,totalMarks:7,objectiveCount:1,wcaQuestionCount:1}
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
function validate(){
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
  areas:data.areas.map(x=>({...x})),
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
