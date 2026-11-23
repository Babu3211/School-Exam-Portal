/**
 * Original SMSS offline mathematics PRACTICE source.
 *
 * Not written or endorsed by CDC. The CDC 2082 specification grid is used
 * solely to arrange 27 objective/WCA/CCA question slots and marks. Every
 * answer below is calculated from known integer parameters; no paid AI/API,
 * Firestore writes, or teacher typing is required for first draft generation.
 *
 * This is not a substitute for genuine textbook examples or human review.
 */
import {getCdcOptionalMathGuide,optionalMathAreaTopics} from './cdc-optional-math-2082.mjs';
const WCA=[[3,3,3],[3,3,4],[4,4,4],[3],[3],[3]];
const CCA=[[[1,3],[2,3]],[[1,3],[3,3]],[[2,1],[3,2],[4,3]],[[5,3],[6,3]]];
const levelTargets={knowledge:12,understanding:18,application:30,higher:15};
const issuedOfflineDrafts=new WeakSet();
export function isOriginalMathOfflineDraft(row){
 return !!row&&typeof row==='object'&&issuedOfflineDrafts.has(row);
}

const units=['Algebra','Trigonometry','Geometry','Vectors','Statistics','Limit and Continuity'];
const triples=[[3,4,5],[5,12,13],[8,15,17],[7,24,25]];
const part=(unit,seed,marks)=>{
 const k=2+(seed%7),p=2+(seed%4),q=1+((seed*3)%5),
  odd=seed%4,t=triples[seed%triples.length];
 let ne,en,answer;
 switch(unit){
  case 1:
   if(odd===0){const c=p*k+q;ne=p+'x + '+q+' = '+c+' भए x को मान निकाल्नुहोस्।';en='Find x if '+p+'x + '+q+' = '+c+'.';answer='x = '+k;}
   else if(odd===1){ne='(x + '+p+')(x + '+q+') को विस्तार गर्नुहोस्।';en='Expand (x + '+p+')(x + '+q+').';answer='x² + '+(p+q)+'x + '+(p*q);}
   else if(odd===2){ne='x² + '+(p+q)+'x + '+(p*q)+' लाई गुणनखण्ड गर्नुहोस्।';en='Factorize x² + '+(p+q)+'x + '+(p*q)+'.';answer='(x + '+p+')(x + '+q+')';}
   else {ne='x = '+k+' हुँदा x² + '+p+'x को मान निकाल्नुहोस्।';en='Evaluate x² + '+p+'x at x = '+k+'.';answer=String(k*k+p*k);}
   break;
  case 2:{
   const [op,adj,hyp]=t;
   if(odd===0){ne='समकोण त्रिभुजमा सम्मुख भुजा '+op+' र कर्ण '+hyp+' हुँदा sin θ निकाल्नुहोस्।';en='In a right triangle, opposite = '+op+' and hypotenuse = '+hyp+'. Find sin θ.';answer=op+'/'+hyp;}
   else if(odd===1){ne='समकोण त्रिभुजमा आधार '+adj+' र कर्ण '+hyp+' हुँदा cos θ निकाल्नुहोस्।';en='In a right triangle, adjacent = '+adj+' and hypotenuse = '+hyp+'. Find cos θ.';answer=adj+'/'+hyp;}
   else if(odd===2){ne='समकोण त्रिभुजमा सम्मुख '+op+' र आधार '+adj+' हुँदा tan θ निकाल्नुहोस्।';en='In a right triangle, opposite = '+op+', adjacent = '+adj+'. Find tan θ.';answer=op+'/'+adj;}
   else {ne='लम्ब '+op+' र आधार '+adj+' भएको समकोण त्रिभुजको कर्ण निकाल्नुहोस्।';en='Find the hypotenuse of a right triangle with legs '+op+' and '+adj+'.';answer=String(hyp);}
   break;}
  case 3:{
   const w=3+(seed%8),h=2+(seed%6);
   if(odd===0){ne='लम्बाइ '+w+' m र चौडाइ '+h+' m भएको आयतको क्षेत्रफल निकाल्नुहोस्।';en='Find the area of a rectangle of length '+w+' m and width '+h+' m.';answer=(w*h)+' m²';}
   else if(odd===1){ne='लम्बाइ '+w+' m र चौडाइ '+h+' m भएको आयतको परिमिति निकाल्नुहोस्।';en='Find the perimeter of a '+w+' m by '+h+' m rectangle.';answer=(2*(w+h))+' m';}
   else if(odd===2){ne='आधार '+(2*w)+' cm र उचाइ '+h+' cm भएको त्रिभुजको क्षेत्रफल निकाल्नुहोस्।';en='Find the area of a triangle of base '+(2*w)+' cm and height '+h+' cm.';answer=(w*h)+' cm²';}
   else {const a=35+(seed%20),b=60+(seed%30);ne='त्रिभुजका दुई कोण '+a+'° र '+b+'° छन्। तेस्रो कोण निकाल्नुहोस्।';en='Two angles of a triangle are '+a+'° and '+b+'°. Find the third angle.';answer=(180-a-b)+'°';}
   break;}
  case 4:{
   const a=seed%6+2,b=seed%5+2,c=seed%4+1,d=seed%3+1;
   if(odd===0){ne='u = ('+a+','+b+') र v = ('+c+','+d+') भए u + v निकाल्नुहोस्।';en='Given u = ('+a+','+b+') and v = ('+c+','+d+'), find u + v.';answer='('+(a+c)+','+(b+d)+')';}
   else if(odd===1){ne='u = ('+a+','+b+') र v = ('+c+','+d+') भए u · v निकाल्नुहोस्।';en='Find u · v for u = ('+a+','+b+') and v = ('+c+','+d+').';answer=String(a*c+b*d);}
   else if(odd===2){ne='u = ('+a+','+b+') भए 2u निकाल्नुहोस्।';en='Find 2u if u = ('+a+','+b+').';answer='('+(2*a)+','+(2*b)+')';}
   else {ne='u = ('+a+','+b+') र v = ('+c+','+d+') भए u − v निकाल्नुहोस्।';en='Find u − v if u = ('+a+','+b+') and v = ('+c+','+d+').';answer='('+(a-c)+','+(b-d)+')';}
   break;}
  case 5:{
   const a=seed%9+2;
   if(odd===0){ne=a+', '+(a+2)+', '+(a+4)+' को औसत निकाल्नुहोस्।';en='Calculate the mean of '+a+', '+(a+2)+', '+(a+4)+'.';answer=String(a+2);}
   else if(odd===1){ne=a+', '+(a+3)+', '+(a+9)+' को मध्यिका निकाल्नुहोस्।';en='Find the median of '+a+', '+(a+3)+', '+(a+9)+'.';answer=String(a+3);}
   else if(odd===2){ne=a+', '+(a+3)+', '+(a+9)+' को विस्तार (Range) निकाल्नुहोस्।';en='Find the range of '+a+', '+(a+3)+', '+(a+9)+'.';answer='9';}
   else {ne=a+', '+(a+2)+', '+a+', '+(a+4)+', '+a+' को बहुलक निकाल्नुहोस्।';en='Find the mode of '+a+', '+(a+2)+', '+a+', '+(a+4)+', '+a+'.';answer=String(a);}
   break;}
  case 6:
   if(odd===0){ne='lim (x→'+k+') x² को मान निकाल्नुहोस्।';en='Evaluate lim(x→'+k+') x².';answer=String(k*k);}
   else if(odd===1){ne='lim (x→'+k+') (x² − '+(k*k)+')/(x − '+k+') को मान निकाल्नुहोस्।';en='Evaluate lim(x→'+k+') (x² − '+(k*k)+')/(x − '+k+').';answer=String(2*k);}
   else if(odd===2){ne='lim (x→'+k+') (2x + 3) को मान निकाल्नुहोस्।';en='Evaluate lim(x→'+k+') (2x + 3).';answer=String(2*k+3);}
   else {ne='f(x)=x²+1 भए x='+k+' मा f(x) को मान निकाल्नुहोस्।';en='Given f(x)=x²+1, find f('+k+').';answer=String(k*k+1);}
   break;
  default: throw Error('Unsupported CDC unit');
 }
 if(!ne||!en||!answer)throw Error('Missing original question and answer');
 return {unitCode:String(unit),marks,cognitiveLevel:'knowledge',
  textNe:ne,textEn:en,answerNe:answer,answerEn:answer};
};
const slotQuestions=({grade,subject,version})=>{
 const topics=optionalMathAreaTopics(grade,subject);
 const rows=[];
 const add=(group,parts,slot)=>{
  const index=rows.length,seed=grade*37+version*101+index*11;
  const subquestions=parts.map(([unitCode,marks],i)=>part(unitCode,seed+i*17,marks));
  let contextNe='',contextEn='';
  if(group!=='objective'){
   const names=[...new Set(parts.map(x=>units[x[0]-1]))].join(' and ');
   contextNe='विषयक्षेत्र '+names+' का निम्न प्रश्नहरूको उत्तर दिनुहोस्।';
   contextEn='Answer the following exercises from '+names+'.';
  }
  if(group==='objective'){
   const answer=subquestions[0].answerNe;
   // An objective here is an exact one-mark short-answer task; no fabricated
   // distractors are presented as legitimate CDC multiple-choice items.
   if(!answer)throw Error('Empty one-mark answer');
  }
  rows.push({id:'smss-optional-math-'+grade+'-'+slot+'-v'+version,
   variantFamily:'smss-optional-math-'+grade+'-'+slot,
   gradeNumber:grade,subject,group,
   topicId:topics[parts[0][0]-1].id+'_0',
   contextNe,contextEn,subquestions,
   reviewStatus:'formula_verified_draft',
   provenance:'smss_offline_original_maths_v1',
   sourceUrl:'',status:'active',
   teacherReviewRequired:true});
 };
 let slot=0;
 for(const [unit,area]of [2,3,3,1,1,1].entries())
  for(let j=0;j<area;j++)add('objective',[[unit+1,1]],++slot);
 for(const [unit,marks]of WCA.entries())
  for(const mark of marks)
   add('WCA',mark===3?[[unit+1,1],[unit+1,2]]:[[unit+1,2],[unit+1,2]],++slot);
 for(const combo of CCA)add('CCA',combo,++slot);
 const pieces=rows.flatMap(q=>q.subquestions).sort((a,b)=>b.marks-a.marks);
 const used={knowledge:0,understanding:0,application:0,higher:0};
 for(const item of pieces){
  const level=Object.keys(levelTargets).find(k=>used[k]+item.marks<=levelTargets[k]);
  if(!level)throw Error('Unable to allocate exact CDC cognitive distribution');
  item.cognitiveLevel=level;used[level]+=item.marks;
 }
 if(JSON.stringify(used)!==JSON.stringify(levelTargets))throw Error('Incorrect CDC cognitive totals');
 for(const item of rows)issuedOfflineDrafts.add(item);
 return rows;
};
export function originalOptionalMathPracticeBank({grade,subject}){
 const guide=getCdcOptionalMathGuide({grade,subject});
 if(!guide)return {questions:[],sourceStatus:'not_applicable'};
 const questions=[...slotQuestions({grade,subject,version:1}),
  ...slotQuestions({grade,subject,version:2})];
 if(questions.length!==54||new Set(questions.map(q=>q.id)).size!==54)
  throw Error('Original offline Math draft bank has invalid question counts');
 return {grade,subject,questions,sourceStatus:'smss_original_formula_checked_draft_not_cdc_published',
  teacherReviewRequired:true,officialCdcQuestions:false};
}
