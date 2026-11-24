/**
 * ORIGINAL SMSS teacher-review practice material for Grade 9 Optional
 * Computer Science only. Not quoted from, authored by, or approved by CDC.
 * The OFFICIAL CDC PDF supplies only the Unit/Cognitive/Type/Marks slots:
 * https://giwmscdnone.gov.np/media/pdf_upload/2082-04-29%20Specification%20grid%20and%20Model%20Questions-Computer%20Science%20Grade%209_khtkxrc.pdf
 *
 * Each of the 25 exact slots has 2 DIFFERENT original bilingual questions.
 * All questions need teacher textbook/answer review before Save/Print.
 * The bank is read-only, bundled in the PWA, and never writes Firestore.
 */
import {getBundledComputerGrid,bundledComputerUnitTopics} from './cdc-verified-computer-grids.mjs';
// [Nepali question, English question, Nepali answer, English answer,
//  optional 4 answer choices and correct index (0..3)].
// For short answers provide two points; for long answers four markable points.
const items=[
 // Unit 1 Computer System: knowledge MCQ
 [
 ['CPU को पूरा रूप के हो?','What does CPU stand for?','Central Processing Unit','Central Processing Unit',
  ['Central Processing Unit','Computer Program Unit','Central Power Utility','Control Processing Utility'],0],
 ['RAM को मुख्य विशेषता कुन हो?','Which is a key property of RAM?','विद्युत् बन्द हुँदा सामान्य RAM को डाटा हराउँछ।','RAM normally loses its contents when power is off.',
  ['स्थायी भण्डारण','अस्थायी (volatile) स्मृति','मुद्रण उपकरण','नेटवर्क केबल'],1,
  ['Permanent storage','Volatile memory','Printing device','Network cable']]
 ],
 // Unit 1 knowledge long
 [
 ['कम्प्युटर प्रणालीका चार मुख्य भाग लेखी प्रत्येकको काम एक-एक वाक्यमा स्पष्ट पार्नुहोस्।',
  'Identify four main functional parts of a computer system and describe one function of each.',
  'इनपुट: डाटा प्रविष्टि; प्रोसेसिङ (CPU): निर्देशन प्रशोधन; मेमोरी/स्टोरेज: डाटा राख्ने; आउटपुट: नतिजा प्रस्तुत गर्ने।',
  'Input accepts data; the CPU processes instructions; memory/storage holds data; output presents results.'],
 ['कम्प्युटरमा प्रयोग हुने चार हार्डवेयर उपकरणको नाम र काम लेख्नुहोस्।',
  'Name four computer hardware devices and state the function of each.',
  'किबोर्ड: अक्षर प्रविष्टि; माउस: पोइन्टर चलाउने; मोनिटर: दृश्य परिणाम; प्रिन्टर: कागजमा नतिजा।',
  'Keyboard enters text; mouse controls pointer; monitor displays output; printer produces hard copies.']
 ],
 // Unit1 understanding short
 [
 ['हार्डवेयर र सफ्टवेयरका दुई भिन्नता लेख्नुहोस्।','Give two differences between hardware and software.',
  'हार्डवेयर छुन सकिने भौतिक भाग हो, सफ्टवेयर निर्देशन/प्रोग्राम हो; हार्डवेयर उपकरणमा चल्छ, सफ्टवेयर हार्डवेयरको सहायताले चल्छ।',
  'Hardware is physical equipment, software is instructions/programs; software executes using hardware.'],
 ['RAM र ROM का दुई भिन्नता लेख्नुहोस्।','State two differences between RAM and ROM.',
  'RAM सामान्यतः volatile र पढ्न/लेख्न मिल्ने कार्यस्मृति हो; ROM सामान्यतः non-volatile र स्थायी निर्देशनका लागि प्रयोग हुन्छ।',
  'RAM is normally volatile, read/write working memory; ROM is normally non-volatile and stores persistent instructions.']
 ],
 // Unit1 application MCQ
 [
 ['टाइप गरेको निबन्ध कागजमा निकाल्न कुन उपकरण छान्नुहुन्छ?','Which device produces a typed essay on paper?',
  'प्रिन्टर','Printer',['स्क्यानर','प्रिन्टर','माउस','माइक्रोफोन'],1,
  ['Scanner','Printer','Mouse','Microphone']],
 ['विद्यालयको प्रस्तुति ठूलो पर्दामा देखाउन कुन उपकरण उपयोगी छ?','Which device can display a school presentation on a large screen?',
  'प्रोजेक्टर','Projector',['जॉयस्टिक','स्क्यानर','प्रोजेक्टर','वेबक्याम'],2,
  ['Joystick','Scanner','Projector','Webcam']]
 ],
 // Unit1 application short
 [
 ['विद्यालयको फाइल हराउन नदिन दुई व्यावहारिक उपाय सुझाउनुहोस्।',
  'Suggest two practical ways to prevent losing school computer files.',
  'नियमित backup राख्ने; फाइललाई अर्थपूर्ण नाम र सुरक्षित ठाउँमा व्यवस्थित गर्ने।',
  'Keep regular backups; organize files with meaningful names in a secure location.'],
 ['कम्प्युटर ढिलो चल्दा दुई सुरक्षित प्राथमिक जाँच लेख्नुहोस्।',
  'State two safe initial checks when a computer runs slowly.',
  'नचाहिने अनुप्रयोग बन्द गर्ने; उपलब्ध storage र running programs जाँच्ने।',
  'Close unused applications; check free storage and running programs.']
 ],
 // Unit1 higher MCQ
 [
 ['सिस्टम अपडेट गर्नुअघि महत्वपूर्ण फाइल बचाउन उत्तम कार्य के हो?',
  'What is the safest first step before a major system update?',
  'महत्वपूर्ण फाइलको backup बनाउने।','Back up important files.',
  ['पासवर्ड हटाउने','बिना जाँच फाइल मेट्ने','महत्वपूर्ण फाइलको backup बनाउने','सबै फाइल सार्वजनिक गर्ने'],2,
  ['Remove passwords','Delete files without checking','Back up important files','Make all files public']],
 ['अज्ञात USB खोलेपछि सुरक्षा चेतावनी आए कुन कार्य उपयुक्त हुन्छ?',
  'A security alert appears after an unknown USB device is connected. What is a safer response?',
  'USB प्रयोग रोकी विद्यालयका IT जिम्मेवार व्यक्तिलाई जानकारी दिने।',
  'Stop using the USB device and notify the responsible IT person.',
  ['चेतावनी बेवास्ता गर्ने','अज्ञात फाइल चलाउने','USB सबैलाई बाँड्ने','USB प्रयोग रोकी IT जिम्मेवारलाई बताउने'],3,
  ['Ignore the alert','Run unknown files','Share the USB with everyone','Stop and tell IT staff']]
 ],
 // Unit2 Number system: understanding short
 [
 ['दशमलव र द्विआधारी सङ्ख्या प्रणालीको आधार र प्रयोग हुने अंक लेख्नुहोस्।',
  'State the base and digits used in decimal and binary number systems.',
  'दशमलव आधार १०, अंक ०–९; द्विआधारी आधार २, अंक ० र १।',
  'Decimal has base 10 with digits 0–9; binary has base 2 with digits 0 and 1.'],
 ['बाइनरी 1010₂ को दशमलव मान दुई चरणमा निकाल्नुहोस्।',
  'Convert binary 1010₂ to decimal, showing the place values.',
  '1×8 + 0×4 + 1×2 + 0×1 = 10₁₀।',
  '1×8 + 0×4 + 1×2 + 0×1 = 10₁₀.']
 ],
 // Unit2 application short
 [
 ['दशमलव १३ लाई द्विआधारीमा रूपान्तरण गरी जाँच गर्नुहोस्।',
  'Convert decimal 13 to binary and verify the result.',
  '13₁₀ = 1101₂; 8+4+1=13।',
  '13₁₀ = 1101₂; 8+4+1=13.'],
 ['बाइनरी 1100₂ लाई दशमलवमा बदल्नुहोस् र स्थानमान देखाउनुहोस्।',
  'Convert 1100₂ to decimal and show its place values.',
  '1×8+1×4+0×2+0×1 = 12₁₀।',
  '1×8+1×4+0×2+0×1 = 12₁₀.']
 ],
 // Unit3 Block programming: knowledge MCQ
 [
 ['Block programming मा iteration का लागि कुन संरचना प्रयोग हुन्छ?',
  'Which block structure repeats instructions in block programming?',
  'Repeat/Loop','Repeat/Loop',['Repeat/Loop','Print only','Stop only','Comment'],0],
 ['Block programming मा अवस्थाअनुसार निर्णय गर्न कुन संरचना प्रयोग हुन्छ?',
  'Which block structure is used for conditional decisions?',
  'If/Else','If/Else',['Wait','If/Else','Move','Sound'],1]
 ],
 // Unit3 understanding long
 [
 ['ब्लक प्रोग्रामले १ देखि ४ सम्मका सङ्ख्या देखाउने क्रम चार चरणमा लेख्नुहोस्।',
  'Describe four logical steps for a block program that displays numbers 1 through 4.',
  'सङ्ख्या चर १ राख्ने; ४ पटक दोहोर्याउने; प्रत्येक पटक संख्या देखाउने; प्रत्येक चक्रपछि १ बढाउने।',
  'Set a number variable to 1; repeat 4 times; display the number each time; increment by 1.'],
 ['प्रयोगकर्ताबाट उमेर लिएर १८ वा बढी भए “Adult” अन्यथा “Minor” देखाउने ब्लक कार्यक्रम चार चरणमा वर्णन गर्नुहोस्।',
  'Describe four logical block-program steps to display Adult for age 18 or more and Minor otherwise.',
  'उमेर input लिने; if age≥18 जाँच्ने; सत्य भए Adult देखाउने; अन्यथा Minor देखाउने।',
  'Read age input; test if age ≥18; display Adult if true; otherwise display Minor.']
 ],
 // Unit4 Web technology understanding MCQ
 [
 ['वेबपेजको मुख्य संरचना बनाउन कुन भाषा प्रयोग हुन्छ?',
  'Which language structures the content of a web page?',
  'HTML','HTML',['HTML','SQL','Python only','Binary code'],0],
 ['CSS को मुख्य उपयोग के हो?','What is CSS mainly used for?',
  'वेबपेजको प्रस्तुति/शैली नियन्त्रण गर्न।','To control the appearance of a web page.',
  ['डेटाबेस मेट्न','वेबपेजको शैली मिलाउन','CPU बदल्न','भिडियो सङ्कुचन गर्न'],1,
  ['Delete databases','Style web pages','Replace the CPU','Compress video files']]
 ],
 // Unit4 application MCQ
 [
 ['HTML मा सबैभन्दा ठूलो शीर्षकको लागि कुन tag प्रयोग हुन्छ?',
  'Which HTML element represents a top-level heading?',
  '<h1>','<h1>', ['<p>','<img>','<h1>','<ol>'],2],
 ['HTML मा अर्को वेबसाइटसँग hyperlink बनाउन कुन element उपयोगी हुन्छ?',
  'Which HTML element creates a hyperlink to another website?',
  '<a>','<a>',['<table>','<span>','<section>','<a>'],3]
 ],
 // Unit4 application short
 [
 ['HTML को एउटा heading र paragraph देखाउने दुई साधारण tag लेख्नुहोस्।',
  'Write two HTML tags used for a heading and a paragraph.',
  'Heading: <h1>...</h1>; Paragraph: <p>...</p>।',
  'Heading: <h1>...</h1>; Paragraph: <p>...</p>.'],
 ['वेबपेजमा तस्बिर र अर्को पेजको link राख्ने दुई HTML element लेख्नुहोस्।',
  'Name two HTML elements used for an image and a link.',
  'तस्बिर: <img>; लिंक: <a>।','Image: <img>; hyperlink: <a>.']
 ],
 // Unit4 higher long
 [
 ['विद्यालयको सूचना वेबपेज बनाउँदा सामग्री र सुरक्षा सम्बन्धी चार निर्णय स्पष्ट पार्नुहोस्।',
  'Explain four content and safety decisions when publishing a school information web page.',
  'स्पष्ट शीर्षक राख्ने; सही र अद्यावधिक सूचना दिने; विद्यार्थीको निजी डाटा नदेखाउने; मोबाइलमै पढ्न मिल्ने स्वरूप बनाउने।',
  'Use clear headings; publish accurate, current information; avoid exposing students’ private data; make the layout readable on mobile.'],
 ['सार्वजनिक विद्यालय वेबपेज मूल्याङ्कन गर्ने चार आधार लेख्नुहोस्।',
  'List four criteria for evaluating a public school website.',
  'सामग्रीको शुद्धता; स्रोत/मिति स्पष्टता; पहुँचयोग्य डिजाइन; सम्पर्क/गोपनीयताको सुरक्षा।',
  'Content accuracy; clear publication dates and sources; accessible design; contact and privacy protection.']
 ],
 // Unit5 Internet/Social media knowledge MCQ
 [
 ['Email पठाउँदा प्राप्तकर्ताको ठेगाना सामान्यतः कुन क्षेत्रमा हुन्छ?',
  'Which field normally contains the main recipient address when sending an email?',
  'To','To',['To','Subject','Attachment','Draft'],0],
 ['वेबसाइट खोल्न प्रयोग हुने अनुप्रयोग कुन हो?',
  'Which type of application is used to open websites?',
  'Web browser','Web browser',['Spreadsheet','Web browser','Text editor only','Calculator'],1]
 ],
 // Unit5 understanding short
 [
 ['सार्वजनिक post र निजी message बीच दुई भिन्नता लेख्नुहोस्।',
  'Give two differences between a public post and a private message.',
  'Public post व्यापक दर्शकले देख्न सक्छन्; private message चुनेका सहभागीलाई लक्षित हुन्छ (तर पूर्ण गोपनीयता सुनिश्चित हुँदैन)।',
  'A public post may reach a wide audience; a private message targets selected participants (without guaranteeing perfect privacy).'],
 ['Email मा Subject र Attachment को काम लेख्नुहोस्।',
  'Explain the purpose of an email subject and attachment.',
  'Subject ले सन्देशको विषय जनाउँछ; Attachment ले सन्देशसँग फाइल पठाउँछ।',
  'Subject summarizes the message topic; attachment sends a file with the message.']
 ],
 // Unit5 higher short
 [
 ['सामाजिक सञ्जालमा आएको शङ्कास्पद समाचार जाँच्ने दुई तरिका लेख्नुहोस्।',
  'Give two ways to check a doubtful social-media claim.',
  'विश्वसनीय स्वतन्त्र स्रोतसँग तुलना गर्ने; मूल स्रोत र प्रकाशन मिति जाँच्ने।',
  'Compare independent reliable sources; inspect the original source and date.'],
 ['अनलाइन ठगी भएको आशङ्का भए गर्नुपर्ने दुई सुरक्षित काम लेख्नुहोस्।',
  'State two safe steps if an online scam is suspected.',
  'सन्दिग्ध link/सन्देश नखोल्ने; सम्बन्धित आधिकारिक निकाय वा विश्वसनीय वयस्कलाई रिपोर्ट गर्ने।',
  'Do not open suspicious links; report to the relevant official service or a trusted adult.']
 ],
 // Unit6 Digital citizenship: understanding long
 [
 ['सुरक्षित डिजिटल नागरिकका चार व्यवहार उदाहरणसहित लेख्नुहोस्।',
  'Describe four habits of responsible digital citizenship, giving examples.',
  'बलियो पासवर्ड प्रयोग; अरूको निजी डाटा सम्मान; स्रोत जाँचेर मात्र सूचना साझा; दुर्व्यवहार रिपोर्ट।',
  'Use strong passwords; respect others’ private data; verify information before sharing; report abuse.'],
 ['साइबर सुरक्षाका चार आधारभूत सावधानीहरू बताउनुहोस्।',
  'Explain four basic cyber-security precautions.',
  'नियमित सुरक्षा update; दुई चरणको प्रमाणीकरण; शङ्कास्पद attachment नखोल्ने; महत्त्वपूर्ण डाटाको backup।',
  'Install security updates; use two-factor authentication; avoid suspicious attachments; back up important data.']
 ],
 // Unit6 higher MCQ
 [
 ['अज्ञात व्यक्तिले पासवर्ड मागे उत्तम प्रतिक्रिया कुन हो?',
  'A stranger asks for your password. What is the best response?',
  'पासवर्ड नदिई रिपोर्ट गर्ने।','Do not share the password; report the request.',
  ['पासवर्ड पठाउने','पासवर्ड नदिई रिपोर्ट गर्ने','OTP पनि पठाउने','सार्वजनिक post गर्ने'],1,
  ['Send password','Do not share; report','Also share OTP','Post it publicly']],
 ['साथीको निजी फोटो अनुमतिबिना post भएको देख्दा कुन कदम उचित हुन्छ?',
  'You see a friend’s private photo posted without consent. Which action is appropriate?',
  'पोस्ट रिपोर्ट गर्ने र फोटो हटाउन अनुरोध गर्ने।',
  'Report the post and request its removal.',
  ['अझ फैलाउने','फोटो डाउनलोड गरेर बाँड्ने','रिपोर्ट गरी हटाउन अनुरोध गर्ने','हासो उडाउने'],2,
  ['Share it further','Download and redistribute','Report and request removal','Mock the friend']]
 ],
 // Unit7 Python knowledge MCQ
 [
 ['Python मा पाठ्य डाटा सामान्यतः कुन प्रकारले प्रतिनिधित्व हुन्छ?',
  'Which Python type commonly represents text data?',
  'str','str',['str','int only','bool only','float only'],0],
 ['Python मा सूची (list) लेख्ने सामान्य चिन्ह कुन हो?',
  'Which brackets are used in a Python list literal?',
  '[ ]','[ ]',['{ }','[ ]','( )','< >'],1]
 ],
 // Unit7 knowledge short
 [
 ['Python मा variable र value को अर्थ एक-एक वाक्यमा लेख्नुहोस्।',
  'Define a variable and a value in Python.',
  'Variable डाटासँग सम्बन्धित नाम हो; value त्यस नाममा रहेको डाटा हो।',
  'A variable is a name bound to data; a value is the data associated with it.'],
 ['Python मा int र str बीचका दुई फरक उदाहरणसहित दिनुहोस्।',
  'Give the difference between int and str with examples.',
  'int पूर्णाङ्कका लागि, जस्तै 5; str पाठ्यका लागि, जस्तै "5"।',
  'int represents an integer such as 5; str represents text such as "5".']
 ],
 // Unit7 application MCQ
 [
 ['Python मा print(2 + 3) को output के हुन्छ?',
  'What is the output of Python print(2 + 3)?',
  '5','5',['23','4','5','Error'],2],
 ['Python मा x = 4; print(x * 2) को output के हुन्छ?',
  'What is the output of x = 4; print(x * 2) in Python?',
  '8','8',['2','6','10','8'],3]
 ],
 // Unit7 application short
 [
 ['Python मा x = 6 र y = 3 दिँदा x+y र x*y का मान लेख्नुहोस्।',
  'For x = 6 and y = 3, find x+y and x*y in Python.',
  'x+y = 9; x*y = 18।','x+y = 9; x*y = 18.'],
 ['Python मा a = 10 र b = 4 दिँदा a-b र a//b का मान लेख्नुहोस्।',
  'For a = 10 and b = 4, find a-b and a//b in Python.',
  'a-b = 6; a//b = 2।','a-b = 6; a//b = 2.']
 ],
 // Unit7 application long
 [
 ['दुई सङ्ख्याको योगफल देखाउने साधारण Python कार्यक्रमका चार मुख्य लाइन/चरण लेख्नुहोस्।',
  'Write four logical lines/steps of a simple Python program that displays the sum of two numbers.',
  'a = int(input("First: ")); b = int(input("Second: ")); total = a + b; print(total)।',
  'a = int(input("First: ")); b = int(input("Second: ")); total = a + b; print(total).'],
 ['कुनै पूर्णाङ्क सम वा बिजोर हो भनेर जाँच्ने Python कार्यक्रम चार चरणमा लेख्नुहोस्।',
  'Write four logical steps of a Python program that tests whether an integer is even or odd.',
  'n = int(input("Number: "))\nr = n % 2\nif r == 0:\n    print("Even")\nelse:\n    print("Odd")',
  'n = int(input("Number: "))\nr = n % 2\nif r == 0:\n    print("Even")\nelse:\n    print("Odd")']
 ],
 // Unit7 higher short
 [
 ['Python मा 0 बाट भाग गर्दा आउने त्रुटि रोक्न दुई उपाय बताउनुहोस्।',
  'State two ways to avoid a division-by-zero error in Python.',
  'भागफल निकाल्नुअघि divisor शून्य छ कि जाँच्ने; zero भए वैकल्पिक सूचना/ह्यान्डलिङ गर्ने।',
  'Check whether the divisor is zero before dividing; handle zero with an alternate message or branch.'],
 ['Python को input ले पाठ्य मान दिएको अवस्थामा संख्यात्मक गणना अघि गर्नुपर्ने दुई काम लेख्नुहोस्।',
  'If Python input returns text, state two steps before numeric calculation.',
  'उचित संख्यात्मक प्रकारमा रूपान्तरण गर्ने; अमान्य input लाई जाँचेर सुरक्षित व्यवहार गर्ने।',
  'Convert input to the appropriate numeric type; validate or safely handle invalid values.']
 ]
];
const clean=s=>String(s||'').trim();
const marksFor={mcq:1,short:2,long:4};
export function grade9ComputerOriginalBank({subject}={}){
 const blueprint=getBundledComputerGrid({grade:9,subject,fullMarks:50});
 if(!blueprint)return {questions:[],units:[],teacherReviewRequired:true,officialCdcQuestions:false};
 const units=bundledComputerUnitTopics(9,subject);
 const slots=blueprint.unitGrid.flatMap(row=>Array.from({length:row.count},()=>row));
 if(slots.length!==25||items.length!==slots.length)
  throw Error('Grade9 original computer bank slots mismatch with official CDC grid');
 const questions=[];
 for(let index=0;index<slots.length;index++){
  const row=slots[index],variants=items[index],unit=units[Number(row.unitCode)-1];
  if(!Array.isArray(variants)||variants.length!==2||!unit)
   throw Error('Missing computer unit or question alternatives for slot '+index);
  for(const [version,variant] of variants.entries()){
   const [textNe,textEn,answerNe,answerEn,optsNe,correct,optsEn]=variant;
   if(![textNe,textEn,answerNe,answerEn].every(clean))
    throw Error('Incomplete computer bilingual questions at '+index+'-'+version);
   if(row.type==='mcq'&&(!Array.isArray(optsNe)||optsNe.length!==4||
    !Number.isSafeInteger(correct)||correct<0||correct>3))throw Error('Invalid Grade9 original MCQ');
   const options=optsNe||[];
   const optionsEn=optsEn||optsNe||[];
   questions.push({
    id:'smss_g9_computer_'+index+'_v'+version,gradeNumber:9,subject,
    unitCode:String(row.unitCode),unitId:unit.id,unitTitle:unit.unitTitle,
    topicId:unit.id+'_0',topicName:unit.unitTitle,
    questionType:row.type,marks:marksFor[row.type],
    cognitiveLevel:row.cognitiveLevel,questionText:textNe,questionTextEn:textEn,
    answer:answerNe,answerEn,options:[...options],optionsEn:[...optionsEn],
    correctOption:row.type==='mcq'?'ABCD'[correct]:'',
    status:'active',bundled:true,teacherReviewRequired:true,
    officialCdcQuestion:false,sourceStatus:'SMSS_original_draft_not_CDC_published'
   });
  }
 }
 if(questions.length!==50||new Set(questions.map(q=>q.id)).size!==50||
  new Set(questions.map(q=>q.questionText)).size!==50)
  throw Error('Grade9 computer original practice bank failed deduplication');
 return {questions,units,teacherReviewRequired:true,officialCdcQuestions:false,
  sourceStatus:'SMSS original 25×2 school practice, teacher review required'};
}
