/** Original, formula-derived Grade 9 compulsory mathematics grouped drafts.
 * Six numerical variants of each of 16 groups; allocation matches the historical
 * 2078 area/cognitive totals, not a verified current 2083 specification.
 * No teacher approval or CDC publication is claimed.
 */
import {getGrade9MathReference} from './cdc-grade9-compulsory-math-grouped.mjs';
import {grade9CompulsoryMathPracticeBank} from './cdc-grade9-compulsory-math-practice.mjs';
const K='knowledge',U='understanding',A='application',H='higher';
const p=(cognitiveLevel,marks,textNe,textEn,answerNe,answerEn=answerNe)=>({cognitiveLevel,marks,textNe,textEn,answerNe:String(answerNe),answerEn:String(answerEn)});
const g=(unit,topic,contextNe,contextEn,...subquestions)=>({unit,topic,contextNe,contextEn,subquestions});
// These are explicit grouped-exercise labels, not the topic labels of the
// unrelated standalone three-item bank. Preserve standalone topic IDs.
const groupTopics=[
 ['समूहका गणना र सम्मिलन / Set cardinality and union'],
 ['छुट र बिक्री मूल्य / Discount and selling price','साधारण ब्याज / Simple interest (grouped)','कामदार र समय / Inverse proportion'],
 ['आयतको क्षेत्रफल र लागत / Rectangle area and cost','वृत्तको परिधि र क्षेत्रफल / Circle circumference and area','घनाभको आयतन / Cuboid volume'],
 ['बहुपदी र खण्डीकरण / Polynomials and factorization','युगपत समीकरण / Simultaneous equations','क्षेत्रफल र द्विघात समीकरण / Area and quadratic equations'],
 ['त्रिभुजका भित्री र बाहिरी कोण / Triangle interior and exterior angles','पाइथागोरस प्रमेय / Pythagoras theorem','समानान्तर रेखा र कोण / Parallel lines and angles'],
 ['माध्य, मध्यक र विस्तार / Mean, median and range','बल छान्ने सम्भाव्यता / Probability of drawing balls'],
 ['समकोण त्रिभुजका अनुपात / Right-triangle trigonometric ratios']
];
function groups(n){
 const x=10+n,y=8+n,z=3+n,t=x+y-z;
 const price=1000+200*n,discount=10*n,net=price*(100-discount)/100;
 const capital=5000*n,rate=8,years=2,interest=capital*rate*years/100;
 const workers=4*n,days=6;
 const l=8+n,w=4+n,h=3;
 const r=7*n,pi='22/7',circ=44*n,area=154*n*n;
 const a=2+n,b=4+n,c=3*n;
 const base=3*n,height=4*n,hyp=5*n;
 const angles=40+5*n,other=60-n,third=180-angles-other;
 const data=[2*n,3*n,4*n,5*n,6*n];
 return [
 g(1,0,'एउटा कक्षामा गणित मन पराउने '+x+' र विज्ञान मन पराउने '+y+' जना छन्; दुवै मन पराउने '+z+' जना छन्।','In a class '+x+' students like mathematics, '+y+' like science and '+z+' like both.',
 p(K,1,'n(M∩S) को अर्थ लेख्नुहोस्।','State the meaning of n(M∩S).','दुवै विषय मन पराउने विद्यार्थी सङ्ख्या।','Number of students who like both subjects.'),
 p(U,1,'गणित मात्र मन पराउने कति?','How many like only mathematics?',x+'−'+z+' = '+(x-z)),
 p(A,3,'कम्तीमा एक विषय मन पराउने र विज्ञान मात्र मन पराउने सङ्ख्या सूत्रसहित निकाल्नुहोस्।','Using a set formula, find the number liking at least one subject and the number liking only science.','n(M∪S) = '+x+'+'+y+'−'+z+' = '+t+'; n(S−M) = '+y+'−'+z+' = '+(y-z)),
 p(H,1,'कुल विद्यार्थी '+(t-1)+' भनिएमा सम्भव छ? कारण दिनुहोस्।','Could the class have only '+(t-1)+' students? Justify.','हुँदैन, कम्तीमा '+t+' जना चाहिन्छ।','No; at least '+t+' students are needed.')),
 g(2,0,'एउटा पसलमा सामानको अङ्कित मूल्य रु '+price+' छ र '+discount+'% छुट दिइन्छ।','An item is marked Rs '+price+' and has a '+discount+'% discount.',
 p(K,1,'छुट रकम निकाल्ने सूत्र लेख्नुहोस्।','Write the discount formula.','अङ्कित मूल्य × छुट दर / 100','Marked price × discount rate / 100'),
 p(U,2,'छुट रकम निकाल्नुहोस्।','Calculate the discount amount.',price+' × '+discount+'/100 = Rs '+(price-net)),
 p(A,2,'छुटपछि बिक्री मूल्य निकाल्नुहोस्।','Calculate the sale price after discount.',price+' − '+(price-net)+' = Rs '+net)),
 g(2,1,'बैंकमा रु '+capital+' वार्षिक '+rate+'% साधारण ब्याजमा '+years+' वर्षका लागि राखियो।','Rs '+capital+' is deposited for '+years+' years at '+rate+'% annual simple interest.',
 p(K,1,'साधारण ब्याजको सूत्र लेख्नुहोस्।','Write the simple interest formula.','I = PTR/100'),
 p(A,2,'दुई वर्षको ब्याज निकाल्नुहोस्।','Calculate the interest.',capital+' × '+years+' × '+rate+'/100 = Rs '+interest),
 p(H,2,'ब्याजदर '+(rate+2)+'% भए कुल प्राप्त रकम कति बढ्छ?','How much would the maturity amount increase if the rate were '+(rate+2)+'%?',capital+' × '+years+' × 2/100 = Rs '+(capital*years*2/100))),
 g(2,2,workers+' जना कामदारले एउटा काम '+days+' दिनमा सक्छन्। सबैको काम गर्ने दर समान छ।',workers+' workers finish a job in '+days+' days at the same individual rate.',
 p(U,1,'कामदार सङ्ख्या र समय कस्तो अनुपातमा छन्?','What is the proportional relation between worker count and time?','व्युत्क्रमानुपात।','Inverse proportion.'),
 p(A,1,'कामदार दोब्बर भए कति दिन लाग्छ?','How many days if the workers double?',String(days/2)),
 p(H,1,'कामदार आधा भए ९ दिनमै सकिन्छ भन्ने दाबी सही छ?','Is the claim that half the workers can finish in nine days correct?','होइन, '+days*2+' दिन लाग्छ।','No; it takes '+days*2+' days.')),
 g(3,0,'आयताकार बगैँचाको लम्बाइ '+l+' m र चौडाइ '+w+' m छ।','A rectangular garden is '+l+' m long and '+w+' m wide.',
 p(K,1,'आयतको क्षेत्रफलको सूत्र लेख्नुहोस्।','Write the area formula for a rectangle.','A = l × w'),
 p(U,2,'परिमिति निकाल्नुहोस्।','Find the perimeter.','2('+l+'+'+w+') = '+2*(l+w)+' m'),
 p(A,3,'प्रति वर्गमिटर रु '+(50*n)+' मा घाँस लगाउने कुल लागत निकाल्नुहोस्।','Calculate the cost of turfing at Rs '+(50*n)+' per square metre.',l+' × '+w+' = '+l*w+' m²; '+l*w+' × '+50*n+' = Rs '+l*w*50*n)),
 g(3,1,'एउटा वृत्ताकार पोखरीको त्रिज्या '+r+' m छ। π = '+pi+' लिनुहोस्।','A circular pond has radius '+r+' m. Use π = '+pi+'.',
 p(K,1,'वृत्तको परिधिको सूत्र लेख्नुहोस्।','Write the circumference formula.','C = 2πr'),
 p(A,2,'पोखरीको क्षेत्रफल निकाल्नुहोस्।','Calculate the area.','22/7 × '+r+'² = '+area+' m²'),
 p(H,2,'त्रिज्या दोब्बर गर्दा परिधि र क्षेत्रफल कति गुणा हुन्छ? कारण दिनुहोस्।','If the radius doubles, how many times do circumference and area become? Explain.','C ∝ r, 2 गुणा; A ∝ r², 4 गुणा।','C ∝ r, twice; A ∝ r², four times.')),
 g(3,2,'एउटा घनाभको लम्बाइ '+l+' cm, चौडाइ '+w+' cm र उचाइ '+h+' cm छ।','A cuboid measures '+l+' cm by '+w+' cm by '+h+' cm.',
 p(U,1,'आयतन निकाल्नुहोस्।','Find its volume.',l+' × '+w+' × '+h+' = '+l*w*h+' cm³'),
 p(H,1,'उचाइ आधा र लम्बाइ दोब्बर भए आयतन बदलिन्छ?','Does its volume change if height halves and length doubles?','बदलिँदैन: 2l × w × h/2 = lwh।','No: 2l × w × h/2 = lwh.')),
 g(4,0,'दिइएको बहुपदी p(x)=x²−'+(a+b)+'x+'+a*b+' हो।','Given p(x)=x²−'+(a+b)+'x+'+a*b+'.',
 p(K,1,'बहुपदीको घात लेख्नुहोस्।','State the degree of the polynomial.','2'),
 p(U,2,'p('+a+') को मान निकाल्नुहोस्।','Evaluate p('+a+').',a+'²−'+(a+b)+'×'+a+'+'+a*b+' = 0'),
 p(A,3,'बहुपदीलाई खण्डीकरण गरी p(x)=0 का मूलहरू निकाल्नुहोस्।','Factorize the polynomial and find the roots of p(x)=0.','(x−'+a+')(x−'+b+')=0; x='+a+' वा '+b,'(x−'+a+')(x−'+b+')=0; x='+a+' or '+b)),
 g(4,1,'दुई समीकरण x+y='+(a+b)+' र x−y='+(a-b)+' छन्।','The equations are x+y='+(a+b)+' and x−y='+(a-b)+'.',
 p(K,1,'दुवै समीकरणमा चरहरूको नाम लेख्नुहोस्।','Name the variables in both equations.','x, y'),
 p(U,2,'दुई समीकरण जोडेर प्राप्त समीकरण लेख्नुहोस्।','Add the equations and state the resulting equation.','2x = '+2*a),
 p(A,2,'x र y को मान निकाल्नुहोस्।','Solve for x and y.','x='+a+', y='+b)),
 g(4,2,'एक आयतको चौडाइ x र लम्बाइ x+'+c+' छ। यसको क्षेत्रफल '+a*(a+c)+' m² छ।','A rectangle has width x and length x+'+c+'. Its area is '+a*(a+c)+' m².',
 p(A,2,'क्षेत्रफलको द्विघात समीकरण बनाउनुहोस्।','Form the quadratic equation for the area.','x²+'+c+'x−'+a*(a+c)+'=0'),
 p(H,2,'समीकरणका मूलमध्ये कुनले वास्तविक चौडाइ दिन्छ? कारणसहित देखाउनुहोस्।','Which root represents the physical width? Show why.','(x−'+a+')(x+'+(a+c)+')=0; x='+a+' m, ऋणात्मक मूल अमान्य।','(x−'+a+')(x+'+(a+c)+')=0; x='+a+' m, the negative root is invalid.')),
 g(5,0,'त्रिभुज ABC मा ∠A='+angles+'° र ∠B='+other+'° छन्।','In triangle ABC, angle A='+angles+'° and B='+other+'°.',
 p(K,1,'त्रिभुजका भित्री कोणको योग लेख्नुहोस्।','State the sum of interior angles of a triangle.','180°'),
 p(U,2,'∠C निकाल्नुहोस्।','Find angle C.','180−'+angles+'−'+other+' = '+third+'°'),
 p(A,3,'C मा बाहिरी कोण निकालेर दुई टाढाका भित्री कोणको योगसँग तुलना गर्नुहोस्।','Calculate the exterior angle at C and compare it with the sum of the two remote interior angles.','180−'+third+' = '+(angles+other)+'°; A+B = '+(angles+other)+'°')),
 g(5,1,'समकोण त्रिभुजका लम्ब भुजाहरू '+base+' cm र '+height+' cm छन्।','The perpendicular sides of a right triangle are '+base+' cm and '+height+' cm.',
 p(K,1,'पाइथागोरस प्रमेय लेख्नुहोस्।','State Pythagoras’ theorem.','कर्ण² = लम्ब² + आधार²','Hypotenuse² = leg₁² + leg₂²'),
 p(A,2,'कर्ण निकाल्नुहोस्।','Find the hypotenuse.','√('+base+'²+'+height+'²) = '+hyp+' cm'),
 p(H,2,'तीनै भुजा दोब्बर गर्दा त्रिभुजको क्षेत्रफल कति गुणा हुन्छ?','How does the area change when all three sides double?','आधार र उचाइ 2 गुणा हुँदा क्षेत्रफल 4 गुणा हुन्छ।','Both base and height double, so area is four times as large.')),
 g(5,2,'AB र CD समानान्तर छन्। तिनलाई काट्ने रेखाले एउटा भित्री कोण '+angles+'° बनाउँछ।','AB and CD are parallel; a transversal forms an interior angle of '+angles+'°.',
 p(U,1,'एकान्तर भित्री कोण कति?','Find the alternate interior angle.',angles+'°'),
 p(H,1,'उही पक्षको भित्री कोण पनि '+angles+'° हुन्छ भन्ने दाबी सही छ?','Is the claim that the same-side interior angle is also '+angles+'° correct?','होइन, योग 180° हुनुपर्छ; '+(180-angles)+'°।','No; their sum must be 180°, so '+(180-angles)+'°.')),
 g(6,0,'पाँच विद्यार्थीको तथ्याङ्क: '+data.join(', ')+'.','Data from five students: '+data.join(', ')+'.',
 p(K,1,'मध्यकको अर्थ लेख्नुहोस्।','Define median.','क्रमबद्ध तथ्याङ्कको बीचको मान।','Middle value of ordered data.'),
 p(U,2,'मध्यक र विस्तार निकाल्नुहोस्।','Find the median and range.','Median='+4*n+'; Range='+6*n+'−'+2*n+'='+4*n),
 p(A,2,'अङ्कगणितीय माध्य निकाल्नुहोस्।','Calculate the arithmetic mean.',data.join('+')+' = '+20*n+'; '+20*n+'/5='+4*n),
 p(H,1,'प्रत्येक मानमा 3 थप्दा माध्य कति बदलिन्छ?','How does the mean change if 3 is added to every value?','3 ले बढ्छ।','Increases by 3.')),
 g(6,1,'एउटा झोलामा '+base+' राता र '+height+' नीला समान आकारका बल छन्। एउटा बल अनियमित रूपमा निकालिन्छ।','A bag contains '+base+' red and '+height+' blue balls of equal size. One ball is drawn at random.',
 p(K,1,'सम्भाव्यताको सूत्र लेख्नुहोस्।','State the probability formula for equally likely outcomes.','अनुकूल परिणाम / कुल सम्भावित परिणाम','Favourable outcomes / total possible outcomes'),
 p(U,1,'कुल बल कति छन्?','How many balls are there?',base+height),
 p(A,2,'रातो र नीलो बल आउने सम्भाव्यता निकाल्नुहोस्।','Find the probabilities of drawing red and blue.','P(R)='+base+'/'+(base+height)+'=3/7; P(B)='+height+'/'+(base+height)+'=4/7'),
 p(H,1,'हरियो बल आउने सम्भाव्यता कति? कारण दिनुहोस्।','What is the probability of drawing green? Justify.','0, हरियो बल छैन।','0; there are no green balls.')),
 g(7,0,'समकोण त्रिभुजमा θ को सम्मुख भुजा '+base+', आसन्न '+height+' र कर्ण '+hyp+' छ।','In a right triangle, opposite to θ is '+base+', adjacent is '+height+' and hypotenuse is '+hyp+'.',
 p(K,1,'sin θ को सूत्र लेख्नुहोस्।','Write the formula for sin θ.','opposite/hypotenuse'),
 p(U,1,'cos θ निकाल्नुहोस्।','Find cos θ.','4/5'),
 p(A,1,'tan θ निकाल्नुहोस्।','Find tan θ.','3/4'),
 p(H,1,'भुजाहरू दोब्बर हुँदा tan θ बदलिन्छ?','Does tan θ change if both legs double?','बदलिँदैन, अनुपात समान हुन्छ।','No; the ratio remains the same.'))
 ];
}
export function grade9CompulsoryMathReferenceBank({grade,subject}={}){
 const ref=getGrade9MathReference({grade,subject});if(!ref)return {units:[],questions:[]};
 const standalone=grade9CompulsoryMathPracticeBank({grade,subject}).units;
 const units=standalone.map((u,i)=>({...u,topics:[...u.topics,...groupTopics[i]]}));
 const questions=[1,2,3,4,5,6].flatMap(n=>groups(n).map((row,i)=>{
  const u=units[row.unit-1],topicIndex=standalone[row.unit-1].topics.length+row.topic;
  if(!groupTopics[row.unit-1]?.[row.topic])throw Error('Unknown grouped math topic');
  return {id:'smss_math_ref9_'+i+'_v'+n,variantFamily:'smss_math_ref9_'+i,gradeNumber:9,subject,unitCode:u.unitCode,unitId:u.id,unitTitle:u.unitTitle,topicId:u.id+'_'+topicIndex,topicName:u.topics[topicIndex],
  contextNe:row.contextNe,contextEn:row.contextEn,subquestions:row.subquestions,questionText:row.contextNe,questionTextEn:row.contextEn,answer:row.subquestions.map(x=>x.answerNe).join('; '),answerEn:row.subquestions.map(x=>x.answerEn).join('; '),marks:row.subquestions.reduce((s,x)=>s+x.marks,0),questionType:'long',cognitiveLevel:'application',status:'active',bundled:true,teacherReviewRequired:true,reviewStatus:'draft',officialCdcQuestion:false,sourceStatus:'SMSS_original_reference_draft'};
 }));
 return {units,questions,teacherReviewRequired:true,exactGridVerified:false};
}
