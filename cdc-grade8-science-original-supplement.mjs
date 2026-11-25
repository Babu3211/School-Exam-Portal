/**
 * Original SMSS Grade-8 Science 1/2/4-mark classroom PRACTICE supplement.
 * These 40 items were authored for school review, not copied from a CDC
 * textbook, government model question, exercise book, or answer key.
 *
 * Grade 8 CDC 2082 exact unit grid is not verified: NEVER publish these as a
 * CDC-approved examination or claim that this collection covers every topic.
 * The supplement never writes to Firestore; teachers can generate/read/print
 * drafts after reviewing the actual academic appropriateness and key.
 */
const ORIGINAL=[
 // VSQ: 16 one-mark responses
 [1,'very_short','knowledge','परिकल्पना भनेको के हो?','What is a hypothesis?','परीक्षण गर्न सकिने सम्भावित व्याख्या।','A tentative explanation that can be tested.'],
 [1,'very_short','understanding','वैज्ञानिक प्रयोगमा नियन्त्रण चर किन राखिन्छ?','Why is a controlled variable kept constant in an experiment?','निष्पक्ष तुलना गर्न।','To make a fair comparison.'],
 [2,'very_short','knowledge','ICT को पूरा रूप लेख्नुहोस्।','Write the full form of ICT.','Information and Communication Technology.','Information and Communication Technology.'],
 [2,'very_short','application','डिजिटल फाइल सुरक्षित राख्ने एउटा तरिका लेख्नुहोस्।','State one way to protect a digital file.','बलियो पासवर्ड राख्ने।','Use a strong password.'],
 [3,'very_short','knowledge','कोशिकाको नियन्त्रण केन्द्र कुन भाग हो?','Which part is the control centre of a cell?','केन्द्रक।','Nucleus.'],
 [3,'very_short','understanding','वनस्पति कोशिकामा पाइने तर जनावर कोशिकामा नपाइने एउटा संरचना लेख्नुहोस्।','Name one structure found in plant cells but not animal cells.','कोशिका भित्ता।','Cell wall.'],
 [4,'very_short','knowledge','जैविक विविधता भन्नाले के बुझिन्छ?','What is biodiversity?','जीवहरूको प्रजाति तथा जीवनरूपमा पाइने विविधता।','The variety of living organisms.'],
 [4,'very_short','application','स्थानीय वन संरक्षण गर्ने एउटा उपाय लेख्नुहोस्।','State one way to conserve a local forest.','अनियन्त्रित रूख कटान रोक्ने।','Prevent uncontrolled tree cutting.'],
 [5,'very_short','knowledge','मानव शरीरमा अक्सिजन बोकेर लैजाने रक्तकोष कुन हो?','Which blood cell carries oxygen in humans?','रातो रक्तकोष।','Red blood cell.'],
 [5,'very_short','understanding','श्वासप्रश्वासमा फोक्सोको मुख्य काम के हो?','What is the main role of the lungs in breathing?','अक्सिजन र कार्बन डाइअक्साइडको आदानप्रदान।','Exchange of oxygen and carbon dioxide.'],
 [6,'very_short','knowledge','बलको SI एकाइ के हो?','What is the SI unit of force?','न्युटन (N)।','Newton (N).'],
 [6,'very_short','application','२० m दूरी ४ s मा तय गरे औसत चाल कति हुन्छ?','A body covers 20 m in 4 s. Find average speed.','५ m/s।','5 m/s.'],
 [7,'very_short','knowledge','कार्यको SI एकाइ लेख्नुहोस्।','Write the SI unit of work.','जुल (J)।','Joule (J).'],
 [7,'very_short','application','१० N बलले वस्तु बलकै दिशामा २ m सार्दा कार्य कति हुन्छ?','A 10 N force moves a body 2 m along the force. Find work done.','२० J।','20 J.'],
 [8,'very_short','knowledge','विद्युत् धाराको SI एकाइ लेख्नुहोस्।','Write the SI unit of electric current.','एम्पियर (A)।','Ampere (A).'],
 [9,'very_short','knowledge','तत्त्वको सबैभन्दा सानो रासायनिक एकाइ के हो?','What is the smallest chemical unit of an element?','परमाणु।','Atom.'],
 // Short questions: exactly two distinct assessable points, 2 marks each
 [1,'short','understanding','अवलोकन र अनुमानबीच दुई भिन्नता लेख्नुहोस्।','Give two differences between observation and inference.','अवलोकन इन्द्रिय/उपकरणले तथ्य सङ्कलन गर्छ; अनुमान तथ्यको सम्भावित व्याख्या हो।','Observation gathers evidence through senses or tools; inference interprets the evidence.'],
 [2,'short','application','इन्टरनेटमा व्यक्तिगत जानकारी सुरक्षित राख्ने दुई तरिका लेख्नुहोस्।','State two ways to protect personal information online.','बलियो छुट्टाछुट्टै पासवर्ड राख्ने; दुई चरणको प्रमाणीकरण प्रयोग गर्ने।','Use strong unique passwords; enable two-factor authentication.'],
 [3,'short','understanding','वनस्पति र जनावर कोशिकाका दुई फरक लेख्नुहोस्।','Give two differences between plant and animal cells.','वनस्पति कोशिकामा कोशिका भित्ता हुन्छ, जनावरमा हुँदैन; सामान्यतया वनस्पतिमा हरितकण हुन्छ, जनावरमा हुँदैन।','Plant cells have a cell wall whereas animal cells do not; photosynthetic plant cells contain chloroplasts whereas animal cells do not.'],
 [4,'short','application','जैविक विविधता संरक्षण गर्ने दुई स्थानीय कार्य लेख्नुहोस्।','Suggest two local actions to conserve biodiversity.','स्थानीय वनस्पतिको संरक्षण गर्ने; वन्यजन्तुको अवैध सिकार रोक्ने।','Protect native plants; prevent illegal wildlife hunting.'],
 [5,'short','understanding','श्वासप्रश्वास र प्रकाश संश्लेषणका दुई भिन्नता लेख्नुहोस्।','State two differences between respiration and photosynthesis.','प्रकाश संश्लेषणले प्रकाश ऊर्जा र CO₂ प्रयोग गरी खाना बनाउँछ; कोशिकीय श्वासप्रश्वासले खानाबाट प्रयोगयोग्य ऊर्जा निकाल्छ।','Photosynthesis uses light energy and carbon dioxide to make food; cellular respiration releases usable energy from food.'],
 [6,'short','application','एउटा वस्तु ४० m दूरी ५ s मा जान्छ। औसत चाल निकाल्नुहोस् र सूत्र लेख्नुहोस्।','A body travels 40 m in 5 s. State the formula and calculate average speed.','औसत चाल = दूरी/समय; ४०/५ = ८ m/s।','Average speed = distance/time; 40/5 = 8 m/s.'],
 [7,'short','application','२० N बलले वस्तु बलकै दिशामा ३ m सारेको छ। कार्यको सूत्र र मान लेख्नुहोस्।','A 20 N force moves a body 3 m in its direction. Give the formula and work done.','कार्य = बल × विस्थापन; २०×३ = ६० J।','Work = force × displacement; 20 × 3 = 60 J.'],
 [8,'short','understanding','श्रृङ्खला र समानान्तर विद्युत् परिपथका दुई भिन्नता लेख्नुहोस्।','Give two differences between series and parallel electric circuits.','श्रृङ्खलामा एउटै धारा मार्ग हुन्छ, समानान्तरमा धेरै शाखा हुन्छन्; श्रृङ्खलामा एउटा अवयव बिग्रँदा परिपथ टुट्छ, समानान्तरका अरू शाखा चल्न सक्छन्।','Series circuits have one current path whereas parallel circuits have branches; failure of one series component breaks the circuit while other parallel branches may still work.'],
 [9,'short','knowledge','तत्त्व र यौगिकबीच दुई भिन्नता लेख्नुहोस्।','Give two differences between an element and a compound.','तत्त्व एउटै किसिमका परमाणुबाट बनेको हुन्छ; यौगिक दुई वा बढी तत्त्वको निश्चित अनुपातमा रासायनिक संयोजन हो।','An element consists of one type of atom; a compound chemically combines two or more elements in fixed proportions.'],
 [10,'short','application','घरेलु रसायन सुरक्षित प्रयोग गर्ने दुई उपाय लेख्नुहोस्।','Give two ways to use household chemicals safely.','लेबलका निर्देशन पढ्ने; सफा गर्ने रसायनहरू जथाभावी नमिसाउने।','Read product-label instructions; do not mix household cleaning chemicals indiscriminately.'],
 [11,'short','knowledge','दिन र रात हुनाका दुई आधारभूत तथ्य लेख्नुहोस्।','State two basic facts explaining day and night.','पृथ्वी आफ्नै अक्षमा घुम्छ; सूर्यतर्फ फर्केको भागमा दिन र विपरीत भागमा रात हुन्छ।','Earth rotates on its axis; the side facing the Sun has daylight while the opposite side experiences night.'],
 [6,'short','understanding','चाल र वेगबीच दुई भिन्नता लेख्नुहोस्।','Give two differences between speed and velocity.','चाल अदिश राशि हो, वेग सदिश हो; चाल दूरी/समय हो, औसत वेग विस्थापन/समय हो।','Speed is scalar while velocity is vector; average speed uses distance/time while average velocity uses displacement/time.'],
 [7,'short','understanding','गतिज र स्थितिज ऊर्जाको दुई फरक उदाहरणसहित लेख्नुहोस्।','Differentiate kinetic and potential energy with examples.','चलिरहेको साइकलमा गतिज ऊर्जा हुन्छ; उचाइमा राखिएको वस्तुमा गुरुत्वीय स्थितिज ऊर्जा हुन्छ।','A moving bicycle has kinetic energy; an elevated object stores gravitational potential energy.'],
 [8,'short','application','५ Ω प्रतिरोधमा २ A धारा बग्छ। ओमको नियम र विभवान्तर लेख्नुहोस्।','A 5 Ω resistor carries 2 A. State Ohm’s law and find voltage.','V = IR; V = २×५ = १० V।','V = IR; V = 2 × 5 = 10 V.'],
 [9,'short','understanding','भौतिक र रासायनिक परिवर्तनका दुई उदाहरण दिनुहोस्।','Give one example each of a physical and chemical change.','बरफ पग्लनु भौतिक परिवर्तन हो; फलाममा खिया लाग्नु रासायनिक परिवर्तन हो।','Melting ice is a physical change; rusting iron is a chemical change.'],
 [10,'short','application','औषधि र सरसफाइका रसायन राख्दा अपनाउनुपर्ने दुई सावधानी लेख्नुहोस्।','State two precautions when storing medicine and cleaning chemicals.','बालबालिकाको पहुँचभन्दा टाढा राख्ने; मूल लेबल भएको बन्द भाँडामा राख्ने।','Keep out of reach of children; store in closed original labelled containers.'],
 // Long questions: exactly four independently checkable points, 4 marks each
 [2,'long','higher','डिजिटल नागरिकका चार जिम्मेवार व्यवहार उदाहरणसहित उल्लेख गर्नुहोस्।','Explain four responsible digital-citizenship practices with examples.','व्यक्तिगत डाटा गोप्य राख्ने; अरूको अनुमति लिएर फोटो साझा गर्ने; स्रोत जाँचेर समाचार साझा गर्ने; अनलाइन दुर्व्यवहारको रिपोर्ट गर्ने।','Keep personal data private; seek consent before sharing others’ photos; verify sources before reposting news; report online harassment.'],
 [4,'long','application','स्थानीय जैविक विविधता संरक्षणका चार उपाय लेख्नुहोस्।','Describe four ways to conserve biodiversity locally.','स्थानीय वन संरक्षण गर्ने; सिमसार जोगाउने; अवैध सिकार रोक्ने; फोहर तथा प्रदूषण घटाउने।','Protect native forests; preserve wetlands; prevent illegal hunting; reduce waste and pollution.'],
 [5,'long','understanding','प्रकाश संश्लेषणका चार आवश्यक पक्ष वा परिणाम लेख्नुहोस्।','State four requirements or outcomes of photosynthesis.','सूर्यको प्रकाश चाहिन्छ; हरितकणमा हरितलवक चाहिन्छ; पानी र CO₂ प्रयोग हुन्छ; ग्लुकोज तयार हुन्छ र अक्सिजन निस्कन्छ।','Light is required; chlorophyll in chloroplasts absorbs light; water and carbon dioxide are used; glucose is produced and oxygen released.'],
 [6,'long','application','स्थिर अवस्थाबाट २ m/s² को स्थिर प्रवेगले ५ s चलेको वस्तुको अन्तिम वेग र दूरी सूत्रसहित निकाल्नुहोस्। चार चरण देखाउनुहोस्।','A body starts at rest and accelerates uniformly at 2 m/s² for 5 s. Calculate its final velocity and displacement, showing four steps.','u = ०, a = २ m/s², t = ५ s; v = u+at; v = १० m/s; s = ut+½at² = २५ m।','u = 0, a = 2 m/s², t = 5 s; v = u+at; v = 10 m/s; s = ut+½at² = 25 m.'],
 [7,'long','application','५० N बलले वस्तु ४ m बलकै दिशामा सार्दा गरिएको कार्य निकाल्नुहोस्। कार्यका चार मुख्य चरण लेख्नुहोस्।','A 50 N force moves an object 4 m along the force. Find the work done with four steps.','दिइएको बल ५० N; विस्थापन ४ m; सूत्र W = F×s; कार्य २०० J।','Given F = 50 N; displacement s = 4 m; formula W = F×s; work done = 200 J.'],
 [8,'long','application','१२ V को स्रोतमा ४ Ω प्रतिरोध जोडिएको छ। धारा र २ मिनेटमा खपत ऊर्जा सूत्रसहित चार चरणमा निकाल्नुहोस्।','A 4 Ω resistor is connected to 12 V. Find current and energy used in two minutes, showing four steps.','I = V/R; I = १२/४ = ३ A; t = १२० s, P = VI = ३६ W; E = Pt = ४३२० J।','I = V/R; I = 12/4 = 3 A; t = 120 s and P = VI = 36 W; E = Pt = 4320 J.'],
 [9,'long','understanding','मिश्रण र यौगिकका चार फरक उल्लेख गर्नुहोस्।','State four differences between mixtures and compounds.','मिश्रणमा घटक अनुपात परिवर्तनशील हुन्छ, यौगिकमा निश्चित; मिश्रणमा घटकका गुण रहन सक्छन्, यौगिकको नयाँ गुण हुन्छ; मिश्रण भौतिक विधिले छुट्याउन सकिन्छ, यौगिक रासायनिक विधिले छुट्याउनुपर्छ; मिश्रणको निश्चित रासायनिक सूत्र हुँदैन, यौगिकको हुन्छ।','Mixtures have variable proportions while compounds have fixed ratios; mixture components may retain their properties while compounds have new properties; mixtures can often be separated physically while compounds require chemical methods; mixtures lack a fixed formula while compounds have one.'],
 [11,'long','higher','पृथ्वीमा ऋतु परिवर्तन हुने चार वैज्ञानिक कारण वा पक्ष उल्लेख गर्नुहोस्।','Explain four scientific facts related to seasons on Earth.','पृथ्वीको अक्ष कक्षीय तलसँग ढल्किएको हुन्छ; पृथ्वीले सूर्यको परिक्रमा गर्छ; वर्षभर सूर्यको किरणको कोण बदलिन्छ; गोलार्द्धअनुसार दिनको अवधि र प्राप्त सौर्य ऊर्जा बदलिन्छ।','Earth’s axis is tilted relative to its orbital plane; Earth revolves around the Sun; the sunlight angle varies through the year; daylight duration and received solar energy vary by hemisphere.']
];
const TYPE_MARKS={very_short:1,short:2,long:4};
export function grade8ScienceOriginalSupplement({subject,units}={}){
 const s=String(subject||'').trim().toLowerCase().replace(/\s+/g,' ');
 if(!/^(science|science and technology|science & technology|general science|विज्ञान|विज्ञान तथा प्रविधि|अनिवार्य विज्ञान(?: तथा प्रविधि)?)$/.test(s))
  return {questions:[],originalPractice:true,teacherReviewRequired:true};
 if(!Array.isArray(units)||units.length!==11)return {questions:[],originalPractice:true,teacherReviewRequired:true};
 const byCode=new Map(units.map(unit=>[String(unit.unitCode),unit]));
 if(byCode.size!==11)return {questions:[],originalPractice:true,teacherReviewRequired:true};
 const questions=ORIGINAL.map(([code,questionType,cognitiveLevel,questionText,questionTextEn,answer,answerEn],i)=>{
  const unit=byCode.get(String(code));
  if(!unit||!Array.isArray(unit.topics)||!unit.topics.length)
   throw Error('Original Grade8 supplement unit is missing '+code);
  return {id:'smss_g8_science_original_'+i,gradeNumber:8,subject,
   unitCode:String(code),unitId:unit.id,unitTitle:unit.unitTitle,
   topicId:unit.id+'_0',topicName:String(unit.topics[0]),
   questionType,marks:TYPE_MARKS[questionType],cognitiveLevel,
   questionText,questionTextEn,answer,answerEn,
   options:[],optionsEn:[],correctOption:'',
   status:'active',bundled:true,
   sourceStatus:'SMSS_original_teacher_review_required',
   teacherReviewRequired:true,officialCdcQuestion:false};
 });
 if(questions.length!==40||questions.filter(q=>q.questionType==='very_short').length!==16||
   questions.filter(q=>q.questionType==='short').length!==16||
   questions.filter(q=>q.questionType==='long').length!==8||
   new Set(questions.map(q=>q.id)).size!==40||
   new Set(questions.map(q=>q.questionText)).size!==40||
   questions.some(q=>!q.answer||!q.answerEn||!q.questionTextEn||!q.questionText))
  throw Error('Original Grade8 supplement count/translation/answer validation failed');
 return {questions,originalPractice:true,teacherReviewRequired:true,officialCdcQuestions:false,
  sourceStatus:'original_SMSS_practice_not_CDC_model'};
}
