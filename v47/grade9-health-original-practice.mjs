// Original teacher-review exercises based on CDC 2082 curriculum text, pp. 7–13, 20–21.
// Government PDF page images timed out; no official specification grid was obtained.
// Curriculum assessment proportions are reference only, not a marks-entry change.
export const HEALTH_SOURCE="https://giwmscdnone.gov.np/media/pdf_upload/HPE%20grade%209-10-G._af0az3b.pdf";
export const healthCurriculumReference=Object.freeze({edition:2082,grade:9,internalPercent:50,externalPercent:50,externalHealthPercent:80,externalPhysicalPercent:20,sourceUrl:HEALTH_SOURCE,visualReviewComplete:false,exactGridVerified:false});
const rows=[
  [
    "मानव शरीर तथा स्वसमायोजन",
    "Human body and adaptation",
    "श्वासप्रश्वास प्रणालीको एउटा मुख्य काम लेख्नुहोस्।",
    "State one main function of the respiratory system.",
    "अक्सिजन ग्रहण र कार्बन डाइअक्साइड निष्कासन।",
    "Take in oxygen and remove carbon dioxide.",
    "अस्थि र मांसपेशी प्रणालीले शरीर चलाउन कसरी सहयोग गर्छन्?",
    "How do bones and muscles work together to enable movement?",
    "अस्थिले आधार र जोर्नी प्रदान गर्छन्; मांसपेशी खुम्चिँदा अस्थि चल्छन्।",
    "Bones provide support and joints; muscles contract to move bones."
  ],
  [
    "स्वस्थ जीवनशैली",
    "Healthy lifestyle",
    "स्वस्थ जीवनशैलीको एउटा अभ्यास लेख्नुहोस्।",
    "Name one healthy lifestyle habit.",
    "नियमित पर्याप्त निद्रा।",
    "Regular adequate sleep.",
    "डिजिटल उपकरणको सन्तुलित प्रयोगका दुई उपाय लेख्नुहोस्।",
    "Give two ways to maintain balanced digital device use.",
    "प्रयोगको समय तोक्ने; आराम र शारीरिक क्रियाकलापका लागि समय छुट्याउने।",
    "Set time limits; reserve time for rest and physical activity."
  ],
  [
    "पोषण व्यवहार र खाद्य सुरक्षा",
    "Nutrition and food safety",
    "सन्तुलित आहार भनेको के हो?",
    "Define a balanced diet.",
    "आवश्यक पोषक तत्त्व उचित मात्रामा भएको आहार।",
    "A diet that provides essential nutrients in appropriate amounts.",
    "विद्यालयको खाजामा स्थानीय पौष्टिक खाद्यवस्तु समावेश गर्ने दुई उदाहरण दिनुहोस्।",
    "Give two examples of nutritious local foods for school snacks.",
    "भुटेको चना र मौसमी फलफूल।",
    "Roasted chickpeas and seasonal fruit."
  ],
  [
    "स्वास्थ्य साक्षरता र रोगहरू",
    "Health literacy and diseases",
    "सडक पार गर्दा अपनाउनुपर्ने एउटा सुरक्षा उपाय लेख्नुहोस्।",
    "State one safety measure when crossing a road.",
    "सुरक्षित स्थानबाट दुवैतिर हेरेर सडक पार गर्ने।",
    "Cross at a safe place after checking traffic in both directions.",
    "पानीबाट सर्ने रोग रोक्न घरमा अपनाउन सकिने दुई उपाय लेख्नुहोस्।",
    "State two household measures to prevent waterborne diseases.",
    "सुरक्षित पिउने पानी प्रयोग गर्ने; साबुनपानीले हात धुने।",
    "Use safe drinking water; wash hands with soap and water."
  ],
  [
    "पर्यावरणीय तथा सामुदायिक स्वास्थ्य",
    "Environmental and community health",
    "वायु प्रदूषणको एउटा स्रोत लेख्नुहोस्।",
    "Name one source of air pollution.",
    "सवारीसाधनको धुवाँ।",
    "Vehicle exhaust.",
    "मानव, पशु र वातावरणको स्वास्थ्यबीच सम्बन्ध देखाउने एउटा उदाहरण र त्यसको समाधान लेख्नुहोस्।",
    "Give one example connecting human, animal and environmental health and suggest a response.",
    "दूषित पानीले मानिस र पशु दुवैलाई असर गर्न सक्छ; पानीका स्रोत सुरक्षित राख्नुपर्छ।",
    "Contaminated water can harm people and animals; protect water sources."
  ],
  [
    "यौनिक तथा प्रजनन स्वास्थ्य",
    "Sexual and reproductive health",
    "लैङ्गिक पूर्वाग्रह भनेको के हो?",
    "What is gender bias?",
    "लिङ्गका आधारमा अनुचित धारणा वा व्यवहार गर्नु।",
    "Unfair assumptions or treatment based on gender.",
    "किशोरकिशोरीलाई स्वास्थ्यसम्बन्धी सूचित निर्णय गर्न सहयोग गर्ने दुई उपाय लेख्नुहोस्।",
    "Give two ways to help adolescents make informed health decisions.",
    "विश्वसनीय स्वास्थ्य सूचना उपलब्ध गराउने; योग्य स्वास्थ्यकर्मी वा परामर्शदातासँग कुरा गर्न सहयोग गर्ने।",
    "Provide reliable health information; facilitate access to qualified health professionals or counsellors."
  ],
  [
    "खेल विज्ञान",
    "Sports science",
    "खेलकुदमा शारीरिक तन्दुरुस्तीको एउटा घटक लेख्नुहोस्।",
    "Name one component of physical fitness in sport.",
    "सहनशक्ति।",
    "Endurance.",
    "खेल टोलीका नेताले सहकार्य बढाउन अपनाउन सक्ने दुई व्यवहार लेख्नुहोस्।",
    "Give two actions a team leader can take to promote cooperation.",
    "सबै सदस्यको कुरा सुन्ने; भूमिका स्पष्ट गरी सहभागिता बढाउने।",
    "Listen to all members; clarify roles and encourage participation."
  ],
  [
    "एथलेटिक्स",
    "Athletics",
    "दौडअघि शरीर तताउने अभ्यास किन गरिन्छ?",
    "Why is warming up important before running?",
    "शरीरलाई व्यायामका लागि क्रमशः तयार गर्न।",
    "To prepare the body gradually for exercise.",
    "लङजम्पको अभ्यास गर्दा सुरक्षित वातावरण सुनिश्चित गर्ने दुई उपाय लेख्नुहोस्।",
    "State two ways to ensure a safe long-jump practice environment.",
    "अवतरण क्षेत्र उपयुक्त र सफा राख्ने; शिक्षकको निर्देशनमा पालैपालो अभ्यास गर्ने।",
    "Keep the landing area suitable and clear; practise in turn under teacher supervision."
  ],
  [
    "खेलहरू",
    "Games",
    "टोली खेलमा नियम पालन गर्नुको एउटा महत्त्व लेख्नुहोस्।",
    "State one reason to follow rules in team games.",
    "निष्पक्ष र सुरक्षित खेल सुनिश्चित गर्न।",
    "To support fair and safe play.",
    "भलिबल अभ्यासमा सहकार्य र सुरक्षा बढाउने दुई उपाय लेख्नुहोस्।",
    "Give two ways to promote cooperation and safety during volleyball practice.",
    "स्पष्ट सञ्चार गर्ने; खेलक्षेत्र सुरक्षित राखी शिक्षकका निर्देशन पालना गर्ने।",
    "Communicate clearly; keep the court safe and follow teacher instructions."
  ]
];
const supplement=[
  [
    "नियमित व्यायाम गर्दा श्वासप्रश्वास र रक्तसञ्चार प्रणालीमा हुने तत्काल परिवर्तन तथा तिनको कारण व्याख्या गर्नुहोस्।",
    "Explain immediate changes in respiration and circulation during exercise and their reasons.",
    "सास र मुटुको गति बढ्न सक्छ; काम गर्ने मांसपेशीको अक्सिजन र ऊर्जा आवश्यकता बढ्छ; कार्बन डाइअक्साइड हटाउन सहयोग हुन्छ।",
    "Breathing and heart rate may increase; working muscles need more oxygen and energy; carbon dioxide removal increases."
  ],
  [
    "विद्यार्थीका लागि निद्रा, अध्ययन, खेल र डिजिटल उपकरणको सन्तुलित दैनिक योजना बनाउनुहोस्। चार प्राथमिकता स्पष्ट गर्नुहोस्।",
    "Design a balanced daily plan for a student covering sleep, study, play and digital devices. Explain four priorities.",
    "पर्याप्त नियमित निद्रा, केन्द्रित अध्ययन समय, शारीरिक गतिविधि, सीमित र उद्देश्यपूर्ण डिजिटल प्रयोग।",
    "Adequate regular sleep, focused study time, physical activity, limited purposeful digital use."
  ],
  [
    "विद्यालयको खाजा सुरक्षित र पौष्टिक बनाउन चार उपाय र तिनको कारण लेख्नुहोस्।",
    "Explain four measures to make school snacks nutritious and safe.",
    "विविध पोषक खाद्य, सफा हात, सुरक्षित पानी, उचित भण्डारण; पोषण र संक्रमण रोकथामसँग सम्बन्ध।",
    "Varied nutritious foods, clean hands, safe water, proper storage; link to nutrition and infection prevention."
  ],
  [
    "विद्यालयमा संक्रामक रोग फैलिने जोखिम घटाउन चार सामूहिक उपाय कारणसहित लेख्नुहोस्।",
    "Explain four collective measures to reduce the risk of infectious disease spreading at school.",
    "हात धुने सुविधा, हावापास, बिरामीलाई उचित आराम र स्वास्थ्य सल्लाह, स्वास्थ्य सचेतना।",
    "Handwashing facilities, ventilation, appropriate rest and health advice for sick students, health education."
  ],
  [
    "विद्यालय वरिपरि फोहोर र दूषित पानीको समस्या समाधान गर्न चार चरणको सामुदायिक स्वास्थ्य योजना बनाउनुहोस्।",
    "Prepare a four-step community health plan for waste and polluted water around a school.",
    "समस्या पहिचान, सुरक्षित फोहोर व्यवस्थापन, पानीको स्रोत संरक्षण, स्थानीय निकाय र समुदायसँग नियमित अनुगमन।",
    "Identify problems, manage waste safely, protect water sources, monitor with local authorities and community."
  ],
  [
    "किशोरकिशोरीको स्वास्थ्य निर्णयमा सम्मान, गोपनीयता, विश्वसनीय सूचना र सहयोगको भूमिका उदाहरणसहित लेख्नुहोस्।",
    "Explain the roles of respect, privacy, reliable information and support in adolescent health decisions, with examples.",
    "भेदभाव नगर्ने, निजी सूचना सुरक्षित राख्ने, विश्वसनीय स्वास्थ्य स्रोत प्रयोग गर्ने, आवश्यकता अनुसार योग्य स्वास्थ्यकर्मी वा विश्वस्त वयस्कको सहयोग लिने।",
    "Avoid discrimination, protect private information, use reliable health sources, seek qualified professional or trusted adult support when needed."
  ],
  [
    "खेल अभ्यासमा तन्दुरुस्ती, आराम, पानी र सुरक्षित प्राविधिक अभ्यासको महत्त्व चार बुँदामा लेख्नुहोस्।",
    "Explain four reasons why fitness, rest, hydration and safe technique matter in sports training.",
    "तन्दुरुस्तीले कार्यक्षमता, आरामले पुनःस्थापना, पानीले तरल सन्तुलन, सुरक्षित प्रविधिले चोटको जोखिम घटाउन सहयोग।",
    "Fitness supports performance, rest supports recovery, hydration supports fluid balance, safe technique helps reduce injury risk."
  ],
  [
    "विद्यालयको दौड प्रतियोगितामा तयारी, दौड क्षेत्र, नियम र चोट परेपछि सहयोगको व्यवस्था कसरी गर्ने?",
    "Explain arrangements for preparation, track safety, rules and help in case of injury at a school race.",
    "शिक्षकको निगरानीमा तयारी, अवरोधरहित मार्ग, स्पष्ट नियम र पालो, चोटमा गतिविधि रोक्ने र उपयुक्त प्राथमिक सहायता वा स्वास्थ्य सहायता लिने।",
    "Supervised preparation, unobstructed track, clear rules and turns, stop activity if injured and seek appropriate first aid or medical assistance."
  ],
  [
    "टोली खेलमा नियमको पालना, निष्पक्षता, सञ्चार र सहकार्यले खेलको गुणस्तर कसरी सुधार गर्छ?",
    "Explain how rules, fairness, communication and cooperation improve team games.",
    "नियमले सुरक्षा र क्रम, निष्पक्षताले समान अवसर, सञ्चारले समन्वय, सहकार्यले साझा लक्ष्य पूरा गर्न सहयोग।",
    "Rules support safety and order, fairness supports equal opportunity, communication supports coordination, cooperation helps achieve shared goals."
  ]
];
export function grade9HealthPracticeBank({grade,subject}){
 if(grade!==9||subject!=='Health and Physical Education')throw Error('Wrong Health practice scope');
 const units=rows.map(([ne,en],i)=>({id:'smss_g9_health_u'+(i+1),unitCode:String(i+1),unitTitle:ne+' / '+en,unitTitleEn:en,topics:[ne+' / '+en],sourceUrl:HEALTH_SOURCE,provenance:'CDC 2082 curriculum text; original practice, teacher review pending'}));
 const questions=rows.flatMap((row,i)=>[1,2].map((marks,j)=>{const u=units[i],p=2+j*4;return {id:u.id+'_q'+j,gradeNumber:9,subject,unitCode:u.unitCode,unitId:u.id,unitTitle:u.unitTitle,topicId:u.id+'_0',topicName:u.topics[0],questionType:j?'short':'very_short',marks,cognitiveLevel:j?'understanding':'knowledge',questionText:row[p],questionTextEn:row[p+1],answer:row[p+2],answerEn:row[p+3],options:[],optionsEn:[],correctOption:'',status:'active',bundled:true,teacherReviewRequired:true,officialCdcQuestion:false,sourceStatus:'SMSS_original_draft_not_CDC_published'};}));
 if(supplement.length!==units.length)throw Error('Health supplement unit mismatch');
 for(const [i,row] of supplement.entries())questions.push({...questions[i*2],id:units[i].id+'_extra1',marks:4,questionType:'long',cognitiveLevel:'application',questionText:row[0],questionTextEn:row[1],answer:row[2],answerEn:row[3]});
 return {units,questions,teacherReviewRequired:true,officialCdcQuestions:false,exactGridVerified:false};
}
