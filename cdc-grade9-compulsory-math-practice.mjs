/** Original Grade 9 compulsory mathematics practice, not CDC model questions.
 * Seven historical areas from CDC 2078 specification chart; current applicability
 * and grouped paper structure remain unverified. Do not treat as exact grid.
 */
import {cdcSubjectKey} from './cdc-grid-source-index.mjs';
export const MATH_ARCHIVE_URL='https://moecdc.gov.np/storage/gallery/1689228983.pdf';
const areaRows=[
 ['समूह','Sets',6,4,1,[1,1,3,1]],
 ['अङ्कगणित','Arithmetic',13,9,3,[2,3,5,3]],
 ['क्षेत्रमिति','Mensuration',13,8,3,[2,3,5,3]],
 ['बीजगणित','Algebra',15,8,3,[2,4,7,2]],
 ['ज्यामिति','Geometry',13,8,3,[2,3,5,3]],
 ['तथ्याङ्कशास्त्र र सम्भाव्यता','Statistics and Probability',11,8,2,[2,3,4,2]],
 ['त्रिकोणमिति','Trigonometry',4,4,1,[1,1,1,1]]
];
const sum=a=>a.reduce((x,y)=>x+y,0);
export function auditCompulsoryMathArchive({grade,subject}={}){
 if(grade!==9||cdcSubjectKey(subject)!=='math')return null;
 const areas=areaRows.map(([nameNe,nameEn,marks,items,groups,levels],i)=>({unitCode:String(i+1),nameNe,nameEn,marks,items,groups,levels:[...levels]}));
 const cognitiveMarks=[0,1,2,3].map(i=>sum(areas.map(a=>a.levels[i])));
 if(sum(areas.map(a=>a.marks))!==75||sum(areas.map(a=>a.items))!==49||sum(areas.map(a=>a.groups))!==16||
    areas.some(a=>sum(a.levels)!==a.marks)||cognitiveMarks.join(',')!=='12,18,30,15')
  throw Error('Historical compulsory math grid totals mismatch');
 return {grade:9,sourceYear:2078,fullMarks:75,durationMinutes:180,groupCount:16,itemCount:49,areas,cognitiveMarks,sourceUrl:MATH_ARCHIVE_URL,currentCdcExactApproved:false,sourceTextChecked:true,teacherReviewRequired:true};
}
// [topic Ne/En, Nepali prompt, English prompt, Nepali answer, English answer, marks, level].
function draftItems(i,n){
 switch(i){
 case 0:{
  const a=12+2*n,b=8+n,c=3+n,t=a+b-c;
  return [
   ['समूहको गणनात्मकता / Cardinality','यदि A मा '+a+' सदस्य छन् भने n(A) लेख्नुहोस्।','If set A has '+a+' elements, state n(A).',String(a),String(a),1,'knowledge'],
   ['प्रतिच्छेदन / Intersection','A र B मा क्रमशः '+a+' र '+b+' सदस्य छन् र '+c+' साझा छन्। n(A∩B) र n(A−B) निकाल्नुहोस्।','Sets A and B contain '+a+' and '+b+' elements, with '+c+' shared. Find n(A∩B) and n(A−B).',c+'; '+a+'−'+c+'='+(a-c),c+'; '+a+'−'+c+'='+(a-c),2,'understanding'],
   ['समूहको सम्मिलन / Union','कक्षामा '+a+' विद्यार्थी फुटबल र '+b+' विद्यार्थी भलिबल खेल्छन्; '+c+' दुवै खेल्छन्। कम्तीमा एउटा खेल्ने र फुटबल मात्र खेल्ने सङ्ख्या निकाल्नुहोस्।','In a class, '+a+' students play football, '+b+' volleyball and '+c+' both. Calculate the number playing at least one and the number playing only football.',a+'+'+b+'−'+c+'='+t+'; '+a+'−'+c+'='+(a-c),a+'+'+b+'−'+c+'='+t+'; '+a+'−'+c+'='+(a-c),3,'application']
  ];}
 case 1:{
  const p=1000*(n+2),r=5*n,disc=p*r/100;
  return [
   ['प्रतिशत / Percentage',r+'% लाई दशमलवमा लेख्नुहोस्।','Express '+r+'% as a decimal.',String(r/100),String(r/100),1,'knowledge'],
   ['छुट / Discount','रु. '+p+' को सामानमा '+r+'% छुट हुँदा छुट रकम निकाल्नुहोस्।','Calculate the discount on Rs '+p+' at '+r+'%.',p+'×'+r+'/100='+disc,p+'×'+r+'/100='+disc,2,'understanding'],
   ['साधारण ब्याज / Simple interest','रु. '+p+' लाई वार्षिक '+r+'% साधारण ब्याजमा २ वर्ष राख्दा ब्याज र कुल रकम निकाल्नुहोस्।','Calculate simple interest and total amount on Rs '+p+' at '+r+'% annually for 2 years.',p+'×'+r+'×2/100='+(2*disc)+'; कुल '+(p+2*disc),p+'×'+r+'×2/100='+(2*disc)+'; total '+(p+2*disc),3,'application']
  ];}
 case 2:{
  const l=8+n,w=4+n,k=3+n;
  return [
   ['आयत / Rectangle','आयतको क्षेत्रफलको सूत्र लेख्नुहोस् (लम्बाइ '+l+' र चौडाइ '+w+' भए)।','State the formula for the area of a rectangle with length '+l+' and width '+w+'.','लम्बाइ × चौडाइ','Length × width',1,'knowledge'],
   ['परिमिति / Perimeter','लम्बाइ '+l+' मि र चौडाइ '+w+' मि भएको आयतको परिमिति निकाल्नुहोस्।','Find the perimeter of a '+l+' m by '+w+' m rectangle.','2×('+l+'+'+w+')='+2*(l+w)+' मि','2×('+l+'+'+w+')='+2*(l+w)+' m',2,'understanding'],
   ['घनाभ / Cuboid','घनाभको लम्बाइ '+l+' सेमि, चौडाइ '+w+' सेमि र उचाइ '+k+' सेमि छ। आयतन र आधार क्षेत्रफल निकाल्नुहोस्।','A cuboid measures '+l+' cm by '+w+' cm by '+k+' cm. Find its volume and base area.',l+'×'+w+'×'+k+'='+l*w*k+' सेमि³; '+l*w+' सेमि²',l+'×'+w+'×'+k+'='+l*w*k+' cm³; '+l*w+' cm²',3,'application']
  ];}
 case 3:{
  const a=n+2,b=n+4,c=a*b;
  return [
   ['घात / Indices','x^'+a+' × x^'+b+' सरल गर्नुहोस्।','Simplify x^'+a+' × x^'+b+'.','x^'+(a+b),'x^'+(a+b),1,'knowledge'],
   ['खण्डीकरण / Factorization','x² + '+(a+b)+'x + '+c+' लाई खण्डीकरण गर्नुहोस्।','Factorize x² + '+(a+b)+'x + '+c+'.','(x+'+a+')(x+'+b+')','(x+'+a+')(x+'+b+')',2,'understanding'],
   ['समीकरण / Equations','दुई सङ्ख्याको योग '+(a+b)+' र अन्तर '+(b-a)+' छ। समीकरण बनाएर दुवै सङ्ख्या निकाल्नुहोस्।','Two numbers have sum '+(a+b)+' and difference '+(b-a)+'. Form equations and find both numbers.','x+y='+(a+b)+'; x−y='+(b-a)+'; x='+b+', y='+a,'x+y='+(a+b)+'; x−y='+(b-a)+'; x='+b+', y='+a,3,'application']
  ];}
 case 4:{
  const a=30+5*n,b=60+5*n;
  return [
   ['कोण / Angles','समतल सरल रेखाको कोण कति हुन्छ? उदाहरणमा एउटा कोण '+a+'° छ।','What is the angle of a straight line? In the example one adjacent angle is '+a+'°.', '180°','180°',1,'knowledge'],
   ['त्रिभुज / Triangle','त्रिभुजका दुई कोण '+a+'° र '+b+'° छन्। तेस्रो कोण निकाल्नुहोस्।','Two angles of a triangle are '+a+'° and '+b+'°. Find the third angle.','180−'+a+'−'+b+'='+(180-a-b)+'°','180−'+a+'−'+b+'='+(180-a-b)+'°',2,'understanding'],
   ['समद्विबाहु त्रिभुज / Isosceles triangle','समद्विबाहु त्रिभुजको शीर्ष कोण '+2*a+'° छ। दुवै आधार कोण र तिनको योग निकाल्नुहोस्।','An isosceles triangle has vertex angle '+2*a+'°. Find both base angles and their sum.','(180−'+2*a+')/2='+(90-a)+'° प्रत्येक; योग '+(180-2*a)+'°','(180−'+2*a+')/2='+(90-a)+'° each; sum '+(180-2*a)+'°',3,'application']
  ];}
 case 5:{
  const a=2*n,b=a+2,c=a+4,d=a+6;
  return [
   ['तथ्याङ्क / Data','तथ्याङ्क '+a+', '+b+', '+b+', '+d+' को बहुलक लेख्नुहोस्।','State the mode of '+a+', '+b+', '+b+', '+d+'.',String(b),String(b),1,'knowledge'],
   ['मध्यमान / Mean',''+a+', '+b+', '+c+', '+d+' को औसत निकाल्नुहोस्।','Find the mean of '+a+', '+b+', '+c+', '+d+'.','('+[a,b,c,d].join('+')+')/4='+(a+3),'('+[a,b,c,d].join('+')+')/4='+(a+3),2,'understanding'],
   ['सम्भाव्यता / Probability','झोलामा '+a+' रातो र '+b+' नीलो समान आकारका बल छन्। अनियमित एउटा बल निकाल्दा रातो र नीलो पर्ने सम्भाव्यता निकाल्नुहोस् र योग जाँच्नुहोस्।','A bag has '+a+' red and '+b+' blue balls of equal size. One is drawn randomly. Find both probabilities and check their sum.',a+'/'+(a+b)+'; '+b+'/'+(a+b)+'; योग 1',a+'/'+(a+b)+'; '+b+'/'+(a+b)+'; sum 1',3,'application']
  ];}
 case 6:{
  const a=3*n,b=4*n,c=5*n;
  return [
   ['त्रिकोणमितीय अनुपात / Trigonometric ratios','समकोण त्रिभुजमा sin θ को सूत्र लेख्नुहोस् (सम्मुख भुजा '+a+', कर्ण '+c+')।','State the formula for sin θ in a right triangle (opposite '+a+', hypotenuse '+c+').','सम्मुख भुजा / कर्ण','Opposite / hypotenuse',1,'knowledge'],
   ['कोसाइन / Cosine','समकोण त्रिभुजमा θ को आसन्न भुजा '+b+' र कर्ण '+c+' छ। cos θ निकाल्नुहोस्।','In a right triangle, the side adjacent to θ is '+b+' and hypotenuse '+c+'. Find cos θ.',b+'/'+c+'=4/5',b+'/'+c+'=4/5',2,'understanding'],
   ['त्रिकोणमिति प्रयोग / Trigonometric application','समकोण त्रिभुजमा θ को सम्मुख भुजा '+a+' र आसन्न भुजा '+b+' छ। कर्ण र tan θ निकाल्नुहोस्।','In a right triangle, the sides opposite and adjacent to θ are '+a+' and '+b+'. Find the hypotenuse and tan θ.','√('+a+'²+'+b+'²)='+c+'; tan θ=3/4','√('+a+'²+'+b+'²)='+c+'; tan θ=3/4',3,'application']
  ];}
 }
 throw Error('Unknown mathematics area');
}
export function grade9CompulsoryMathPracticeBank({grade,subject}={}){
 const base={units:[],questions:[],teacherReviewRequired:true,officialCdcQuestions:false,exactGridVerified:false};
 const audit=auditCompulsoryMathArchive({grade,subject});if(!audit)return base;
 const units=audit.areas.map((a,i)=>({id:'smss_math_g9_u'+(i+1),unitCode:a.unitCode,unitTitle:a.nameNe+' / '+a.nameEn,unitTitleEn:a.nameEn,topics:draftItems(i,1).map(x=>x[0]),sourceTitle:'CDC 2078 historical mathematics specification chart',sourceUrl:MATH_ARCHIVE_URL,provenance:'Historical area; current textbook and grid review pending'}));
 const questions=units.flatMap((u,i)=>[1,2].flatMap(n=>draftItems(i,n).map(([topicName,questionText,questionTextEn,answer,answerEn,marks,cognitiveLevel],j)=>({id:u.id+'_t'+j+'_v'+n,gradeNumber:9,subject,unitCode:u.unitCode,unitId:u.id,unitTitle:u.unitTitle,topicId:u.id+'_'+j,topicName,questionType:marks===1?'very_short':marks===2?'short':'long',marks,cognitiveLevel,questionText,questionTextEn,answer,answerEn,options:[],optionsEn:[],correctOption:'',status:'active',bundled:true,teacherReviewRequired:true,officialCdcQuestion:false,sourceStatus:'SMSS_original_draft_not_CDC_published'}))));
 return {...base,units,questions};
}
