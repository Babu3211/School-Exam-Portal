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
import {getCdcOptionalMathGuide,optionalMathAreaTopics,optionalMathOriginalSlots} from './cdc-optional-math-2082.mjs';
// Original cognitive labels are subject-teacher review targets, not official CDC authorship.
const issuedOfflineDrafts=new WeakSet();
export function isOriginalMathOfflineDraft(row){
 return !!row&&typeof row==='object'&&issuedOfflineDrafts.has(row);
}

const units=['Algebra','Trigonometry','Geometry','Vectors','Statistics','Limit and Continuity'];
const triples=[[3,4,5],[5,12,13],[8,15,17],[7,24,25]];
// Grade 9 learning outcomes, curriculum pp. 2–5 (mirror of CDC publication):
// https://drmathnp.com/wp-content/uploads/2026/07/Optional-Mathematics-Curriculum-Secondary-Level-Grade-9-and-10_afqyz38.pdf
// These are newly authored exercises, not textbook quotations or certified difficulty.
// Higher-level original tasks use a reverse problem, error diagnosis, or
// combined reasoning rather than assigning a higher label to a recall task.
// The numerical MCQ key stays separate from the worked response.
const grade9HigherPart=(unit,seed,marks,objective)=>{
 const a=3+seed%29,b=2+seed%7,c=2+seed%5;
 let ne,en,answer,workNe,workEn,skill;
 if(unit===1){
  const target=a*b+c,wrong=target-b;
  ne='f(x) = '+b+'x + '+c+' मा एक विद्यार्थीले '+target+' को पूर्वप्रतिबिम्ब '+(a-1)+' हो भन्छ। सही पूर्वप्रतिबिम्ब कति हो'+(objective?'?':'? कारणसहित त्रुटि सच्याउनुहोस्।');
  en='For f(x) = '+b+'x + '+c+', a student claims the preimage of '+target+' is '+(a-1)+'. What is the correct preimage'+(objective?'?':'? Correct the error with a reason.');
  answer=String(a);workNe='दिइएको दाबीबाट f('+(a-1)+') = '+wrong+' ≠ '+target+'; '+b+'x = '+(target-c)+', x = '+a+'.';workEn='The claimed input gives f('+(a-1)+') = '+wrong+' ≠ '+target+'; solving '+b+'x = '+(target-c)+' gives x = '+a+'.';skill='function_preimage';
 }else if(unit===2){
  const n=2+seed%9,r=12*a,L=a*n;
  ne='एउटा वृत्तमा '+L+'π cm चापले '+n+'π/12 रेडियन कोण बनाउँछ। उही चापको लागि अर्धव्यास दोब्बर गरे केन्द्रीय कोण कति रेडियन हुन्छ'+(objective?'?':'? सूत्रबाट देखाउनुहोस्।');
  en='An arc of '+L+'π cm subtends '+n+'π/12 radians. If the radius is doubled but the arc length is unchanged, what is the new central angle'+(objective?'?':'? Justify using the arc-length formula.');
  answer=n+'π/24';workNe='s=rθ स्थिर हुँदा θ नयाँ = θ पुरानो/2 = '+answer+' रेडियन; मूल अर्धव्यास '+r+' cm।';workEn='Since s=rθ is fixed, doubling r halves θ, giving '+answer+' radians; original radius '+r+' cm.';skill='arc_length';
 }else if(unit===3){
  const m=2+seed%5,x=a+b,y=c+m*b;
  ne='A('+a+','+c+'), B('+x+','+y+') र C('+(a+2*b)+', t) एउटै सरल रेखामा छन्। t को मान कति हो'+(objective?'?':'? बराबर ढलानबाट प्रमाणित गर्नुहोस्।');
  en='A('+a+','+c+'), B('+x+','+y+') and C('+(a+2*b)+', t) lie on one straight line. What is t'+(objective?'?':'? Justify using equal slopes.');
  answer=String(c+2*m*b);workNe='AB को ढलान = '+m+'; (t − '+y+')/'+b+' = '+m+' ⇒ t = '+answer+'।';workEn='Slope AB = '+m+'; setting slope BC = (t − '+y+')/'+b+' = '+m+' gives t = '+answer+'.';skill='coordinate_slope';
 }else if(unit===4){
  const y=b*c;
  ne='u = ('+a+','+b+') र v = ('+(a*c)+', t) का दिशाहरू समान छन्। एक विद्यार्थीले t = '+(y+1)+' राखेको छ। सही t निकाल्नुहोस्'+(objective?'।':' र दाबी किन गलत छ देखाउनुहोस्।');
  en='Vectors u = ('+a+','+b+') and v = ('+(a*c)+', t) have the same direction. A student proposes t = '+(y+1)+'. Find the correct t'+(objective?'.':' and explain the error.');
  answer=String(y);workNe='v = '+c+'u हुनुपर्छ; t = '+c+' × '+b+' = '+y+'। '+(y+1)+' राख्दा समान अनुपात हुँदैन।';workEn='The first components require v = '+c+'u; hence t = '+c+' × '+b+' = '+y+'. The proposed value breaks proportionality.';skill='parallel_vectors';
 }else if(unit===5){
  const mean=a+b,d=2*b,vals=[mean-d,mean-d,mean+d,mean+d].join(', ');
  ne=vals+' को प्रत्येक मानमा '+c+' थप्दा स्तरीय विचलन कति हुन्छ'+(objective?'?':'? माध्य र विचलनको सम्बन्धबाट कारण दिनुहोस्।');
  en='Each value in '+vals+' is increased by '+c+'. What is the new population standard deviation'+(objective?'?':'? Explain using the mean and deviations.');
  answer=String(d);workNe='नयाँ माध्य '+(mean+c)+' हुन्छ तर माध्यबाट प्रत्येक विचलन ±'+d+' नै रहन्छ; σ = √('+d*d+') = '+d+'।';workEn='The new mean is '+(mean+c)+', but deviations from it remain ±'+d+'; σ = √('+d*d+') = '+d+'.';skill='standard_deviation';
 }else if(unit===6){
  const k=a*b;
  ne='lim (x→'+a+') (x² − '+a*a+')/(x − '+a+') = 0 भनी एक विद्यार्थीले लेख्यो। सही सीमान्तमान कति हो'+(objective?'?':'? 0/0 किन उत्तर होइन भन्ने देखाउनुहोस्।');
  en='A student claims lim(x→'+a+') (x² − '+a*a+')/(x − '+a+') = 0. What is the correct limit'+(objective?'?':'? Explain why 0/0 is not the answer.');
  answer=String(2*a);workNe='प्रत्यक्ष प्रतिस्थापनबाट 0/0 अनिर्धारित रूप आउँछ। x ≠ '+a+' हुँदा (x² − '+a*a+')/(x − '+a+') = x + '+a+'; सीमान्तमान '+answer+'।';workEn='Substitution gives the indeterminate form 0/0. For x ≠ '+a+', factor and cancel to obtain x + '+a+'; the limit is '+answer+'.';skill='algebraic_limit';
 }else throw Error('Unsupported higher-level area');
 return {unitCode:String(unit),marks,cognitiveLevel:'higher',textNe:ne,textEn:en,answerNe:objective?answer:workNe,answerEn:objective?answer:workEn,curriculumSkill:skill,reasoningTask:true};
};
const grade9Part=(unit,seed,marks,level,objective)=>{ 
 if(level==='higher')return grade9HigherPart(unit,seed,marks,objective);
 const a=2+seed%31,b=2+seed%7,c=1+seed%5,mode=seed%4;
 let ne,en,ans,skill;
 if(unit===1){
  const kind=seed%5;
  if(kind===0){
   const d=a+c;
   ne='f(x) = '+b+'x + '+c+' भए f(x) = '+(b*d+c)+' को पूर्वप्रतिबिम्ब निकाल्नुहोस्।';
   en='For f(x) = '+b+'x + '+c+', find the preimage of '+(b*d+c)+'.';ans=String(d);skill='function_preimage';
  }else if(kind===1){
   ne='x² + '+(a+b)+'x + '+(a*b)+' लाई x + '+a+' ले भाग गर्दा भागफल निकाल्नुहोस्।';
   en='Find the quotient when x² + '+(a+b)+'x + '+(a*b)+' is divided by x + '+a+'.';ans='x + '+b;skill='polynomial_division';
  }else if(kind===2){
   ne='A = [['+a+', '+b+'], ['+c+', '+(a+1)+']] र B = [['+c+', '+(b+1)+'], ['+a+', '+b+']] भए A + B को दोस्रो पङ्क्तिको पहिलो अवयव निकाल्नुहोस्।';
   en='Given A = [['+a+', '+b+'], ['+c+', '+(a+1)+']] and B = [['+c+', '+(b+1)+'], ['+a+', '+b+']], find the entry in row 2, column 1 of A + B.';ans=String(c+a);skill='matrix_addition';
  }else if(kind===3){
   const k=a+c;
   ne='वास्तविक सङ्ख्यामा '+b+'x + '+c+' ≤ '+(b*k+c)+' असमानताको समाधान अन्तराल लेख्नुहोस्।';
   en='Over the real numbers, solve '+b+'x + '+c+' ≤ '+(b*k+c)+' and express the solution as an interval.';ans='(−∞, '+k+']';skill='linear_inequality_interval';
  }else{
   ne='√'+(a*a*b)+' लाई सरल रूपमा लेख्नुहोस्; पूर्ण वर्ग गुणनखण्ड निकाल्नुहोस्।';
   en='Simplify √'+(a*a*b)+' by extracting a perfect-square factor.';const factors={2:[1,2],3:[1,3],4:[2,1],5:[1,5],6:[1,6],7:[1,7],8:[2,2]};const [m,n]=factors[b];ans=n===1?String(a*m):(a*m)+'√'+n;skill='surd_simplification';
  }
 }else if(unit===2){
  if(mode===0){
   const n=1+seed%23;
   ne=(n*15)+'° लाई रेडियनमा बदल्नुहोस्।';
   en='Convert '+(n*15)+'° into radians.';ans=n+'π/12';skill='angle_conversion';
  }else if(mode===1){
   const n=1+seed%11,r=12*a;
   ne='अर्धव्यास '+r+' cm र केन्द्रीय कोण '+n+'π/12 रेडियन भएको वृत्तको चापको लम्बाइ निकाल्नुहोस्।';
   en='Find the arc length of a circle with radius '+r+' cm and central angle '+n+'π/12 radians.';ans=(a*n)+'π cm';skill='arc_length';
  }else if(mode===2){
   const op=2*a,hyp=a*a+1;
   ne='θ न्यूनकोण हो र sin θ = '+op+'/'+hyp+' भए cos θ निकाल्नुहोस्।';
   en='If θ is acute and sin θ = '+op+'/'+hyp+', find cos θ using the Pythagorean identity.';ans=(a*a-1)+'/'+hyp;skill='pythagorean_identity';
  }else{
   const ang=1+seed%89;
   ne='sin(90° − θ) = cos θ प्रयोग गरी sin '+(90-ang)+'° लाई θ = '+ang+'° को cosine का रूपमा लेख्नुहोस्।';
   en='Using the complementary-angle identity, express sin '+(90-ang)+'° as the cosine of its complementary angle.';ans='cos '+ang+'°';skill='complementary_angle';
  }
 }else if(unit===3){
  if(mode===0){
   const x=a+b,y=c+2*b;
   ne='A('+a+','+c+') र B('+x+','+y+') जोड्ने रेखाको ढलान पत्ता लगाउनुहोस्।';
   en='Find the slope of the line through A('+a+','+c+') and B('+x+','+y+').';ans='2';skill='coordinate_slope';
  }else if(mode===1){
   ne='बिन्दु P('+a+','+b+') लाई y = x मा परावर्तन गर्दा प्राप्त बिन्दु लेख्नुहोस्।';
   en='Find the image of P('+a+','+b+') under reflection in y = x.';ans='('+b+','+a+')';skill='reflection';
  }else if(mode===2){
   ne='A('+a+','+b+') र B('+(a+2*c)+','+(b+4*c)+') को मध्यबिन्दु पत्ता लगाउनुहोस्।';
   en='Find the midpoint of A('+a+','+b+') and B('+(a+2*c)+','+(b+4*c)+').';ans='('+(a+c)+','+(b+2*c)+')';skill='section_formula';
  }else{
   ne='बिन्दु P('+a+','+b+') लाई मूलबिन्दु केन्द्र मानी घडीको विपरीत दिशामा 90° परिक्रमण गर्दा प्राप्त बिन्दु लेख्नुहोस्।';
   en='Rotate P('+a+','+b+') through 90° anticlockwise about the origin. Find the image.';ans='('+(-b)+','+a+')';skill='rotation';
  }
 }else if(unit===4){
  if(mode===0){
   ne='u = ('+a+','+b+') र v = ('+c+','+(c+1)+') भए u + v निकाल्नुहोस्।';
   en='For u = ('+a+','+b+') and v = ('+c+','+(c+1)+'), find u + v.';ans='('+(a+c)+','+(b+c+1)+')';skill='vector_addition';
  }else if(mode===1){
   ne='u = ('+a+','+b+') र v = ('+(a*c)+', t) समानान्तर भए t निकाल्नुहोस्।';
   en='If u = ('+a+','+b+') and v = ('+(a*c)+', t) are parallel, find t.';ans=String(b*c);skill='parallel_vectors';
  }else if(mode===2){
   ne='भेक्टर v = ('+(3*a)+','+(4*a)+') को परिमाण निकाल्नुहोस्।';
   en='Find the magnitude of vector v = ('+(3*a)+','+(4*a)+').';ans=String(5*a);skill='vector_magnitude';
  }else{
   ne='भेक्टर v = ('+(3*a)+','+(4*a)+') को दिशामा एकाइ भेक्टर लेख्नुहोस्।';
   en='Find the unit vector in the direction of v = ('+(3*a)+','+(4*a)+').';ans='(3/5,4/5)';skill='unit_vector';
  }
 }else if(unit===5){
  const values=[a-b,a-b,a+b,a+b].join(', ');
  if(mode===0){
   ne=values+' को माध्यबाट औसत विचलन निकाल्नुहोस्।';
   en='Find the mean deviation from the arithmetic mean for '+values+'.';ans=String(b);skill='mean_deviation';
  }else if(mode===1){
   ne=values+' को स्तरीय विचलन निकाल्नुहोस् (N ले भाग गर्ने सूत्र प्रयोग गर्नुहोस्)।';
   en='Find the population standard deviation of '+values+'.';ans=String(b);skill='standard_deviation';
  }else if(mode===2){
   const v=[a-b,a,a+b,a+2*b,a+3*b,a+4*b,a+5*b].join(', ');
   ne=v+' को Q₁ र Q₃ बाट चतुर्थांशीय विचलन निकाल्नुहोस्।';
   en='For '+v+', find the quartile deviation using Q₁ and Q₃.';ans=String(2*b);skill='quartile_deviation';
  }else{
   ne=values+' को variance निकाल्नुहोस् (N ले भाग गर्ने सूत्र प्रयोग गर्नुहोस्)।';
   en='Find the population variance of '+values+'.';ans=String(b*b);skill='variance';
  }
 }else if(unit===6){
  if(mode===0){
   ne='lim (x→'+a+') ('+b+'x² + '+c+') निकाल्नुहोस्।';
   en='Evaluate lim(x→'+a+') ('+b+'x² + '+c+').';ans=String(b*a*a+c);skill='polynomial_limit';
  }else if(mode===1){
   ne='lim (x→'+a+') (x² − '+(a*a)+')/(x − '+a+') निकाल्नुहोस्।';
   en='Evaluate lim(x→'+a+') (x² − '+(a*a)+')/(x − '+a+').';ans=String(2*a);skill='algebraic_limit';
  }else if(mode===2){
   ne='f(x) = (x − '+a+')(x + '+b+')/(x − '+a+') को x → '+a+' मा सीमान्त मान निकाल्नुहोस्।';
   en='Find the limit of (x − '+a+')(x + '+b+')/(x − '+a+') as x approaches '+a+'.';ans=String(a+b);skill='cancelled_factor_limit';
  }else{
   ne='lim (x→'+a+') (x³ − '+(a*a*a)+')/(x − '+a+') निकाल्नुहोस्।';
   en='Evaluate lim(x→'+a+') (x³ − '+(a*a*a)+')/(x − '+a+').';ans=String(3*a*a);skill='cubic_limit';
  }
 }else return null;
 return {unitCode:String(unit),marks,cognitiveLevel:level,textNe:ne,textEn:en,answerNe:ans,answerEn:ans,curriculumSkill:skill};
};
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
// Supply four unambiguous numeric/algebraic alternatives for every
// one-mark objective problem. Since these are original mathematical
// exercises, alternatives are calculated locally from the answer string,
// not invented claims about a CDC-published MCQ.
function originalObjectiveChoices(answer,seed){
 const matches=[...String(answer).matchAll(/-?\d+/g)];
 if(!matches.length)throw Error('Objective answer has no numeric component');
 const last=matches[matches.length-1],n=Number(last[0]);
 if(!Number.isSafeInteger(n))throw Error('Objective numerical answer out of range');
 const offset=last.index;
 const wrong=[1,2,3].map(delta=>String(answer).slice(0,offset)+
  String(n+delta)+String(answer).slice(offset+last[0].length));
 const position=seed%4,opts=[...wrong];
 opts.splice(position,0,String(answer));
 if(opts.length!==4||new Set(opts).size!==4)throw Error('Duplicate MCQ options');
 return {optionsNe:opts,optionsEn:[...opts],correctOption:'ABCD'[position]};
}
const slotQuestions=({grade,subject,version})=>{
 const topics=optionalMathAreaTopics(grade,subject);
 const rows=[];
 const add=(group,parts,slot)=>{
  const index=rows.length,seed=grade*37+version*101+index*11;
  const subquestions=parts.map(([unitCode,marks,cognitiveLevel],i)=>({...((grade===9&&grade9Part(unitCode,seed+i*17,marks,cognitiveLevel,group==='objective'))||part(unitCode,seed+i*17,marks)),cognitiveLevel}));
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
   Object.assign(subquestions[0],originalObjectiveChoices(answer,seed));
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
 const guide=getCdcOptionalMathGuide({grade,subject});
 for(const [index,slot] of optionalMathOriginalSlots(guide).entries())add(slot.group,slot.parts,index+1);
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
