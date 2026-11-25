// Original teacher-review practice, NOT CDC model questions or exact Grid.
// Area labels match the pinned Grade 9 source-register text extraction.
// No claim that practice marks, translations or difficulty have CDC approval.
export const ECONOMICS_SOURCE="https://giwmscdnone.gov.np/media/pdf_upload/RS11136_%E0%A4%85%E0%A4%B0%E0%A5%8D%E0%A4%A5%E0%A4%B6%E0%A4%BE%E0%A4%B8%E0%A5%8D%E0%A4%A4%E0%A5%8D%E0%A4%B0%20%E0%A4%95%E0%A4%95%E0%A5%8D%E0%A4%B7%E0%A4%BE-%20%E0%A5%AF%20%E0%A4%B5%E0%A4%BF%E0%A4%B6%E0%A4%BF%E0%A4%B7%E0%A5%8D%E0%A4%9F%E0%A5%80%E0%A4%95%E0%A4%B0%E0%A4%A3%20%E0%A4%A4%E0%A4%BE%E0%A4%B2%E0%A4%BF%E0%A4%95%E0%A4%BE%20%E0%A4%B0%20%E0%A4%A8%E0%A4%AE%E0%A5%81%E0%A4%A8%E0%A4%BE%20%E0%A4%AA%E0%A5%8D%E0%A4%B0%E0%A4%B6%E0%A5%8D%E0%A4%A8%E0%A4%B9%E0%A4%B0%E0%A5%81%20%E0%A5%A8%E0%A5%A6%E0%A5%AE%E0%A5%A8_3ew2awb.pdf";
export const ACCOUNTING_SOURCE="https://giwmscdntwo.gov.np/media/pdf_upload/%E0%A4%B5%E0%A4%BF%E0%A4%B6%E0%A4%BF%E0%A4%B7%E0%A5%8D%E0%A4%9F%E0%A5%80%E0%A4%95%E0%A4%B0%E0%A4%A3%20%E0%A4%A4%E0%A4%BE%E0%A4%B2%E0%A4%BF%E0%A4%95%E0%A4%BE%20%E0%A5%A8%E0%A5%A6%E0%A5%AE%E0%A5%A7%20%E0%A4%95%E0%A4%BE%E0%A4%B0%E0%A5%8D%E0%A4%AF%20%E0%A4%B8%E0%A4%9E%E0%A5%8D%E0%A4%9A%E0%A4%BE%E0%A4%B2%E0%A4%A8%20%E0%A4%B0%20%E0%A4%B2%E0%A5%87%E0%A4%96%E0%A4%BE%20%E0%A4%95%E0%A4%95%E0%A5%8D%E0%A4%B7%E0%A4%BE%20%E0%A5%AF_fwmookm.pdf";
const economics=[
  [
    "अर्थशास्त्रको आधारभूत अवधारणा र साधनको बाँडफाँट",
    "Basic economic concepts and resource allocation",
    "अवसर लागत भनेको के हो?",
    "What is opportunity cost?",
    "त्यागिएको अर्को सर्वोत्तम विकल्पको मूल्य।",
    "The value of the next best alternative forgone.",
    "कुनै परिवारको सीमित बजेटमा शिक्षा र मनोरञ्जनमध्ये छनोट गर्दा अवसर लागत कसरी देखिन्छ?",
    "How does opportunity cost arise when a household with a limited budget chooses between education and recreation?",
    "शिक्षामा रकम खर्च गर्दा त्यागिएको मनोरञ्जनको लाभ अवसर लागत हुन्छ; स्रोत सीमित भएकाले प्राथमिकता निर्धारण गर्नुपर्छ।",
    "Spending on education sacrifices the benefit of recreation; scarce resources require prioritization."
  ],
  [
    "व्यक्ति अर्थशास्त्र",
    "Microeconomics",
    "मागको नियम लेख्नुहोस्।",
    "State the law of demand.",
    "अन्य अवस्था समान हुँदा मूल्य बढे माग परिमाण घट्छ र मूल्य घटे बढ्छ।",
    "Other things equal, quantity demanded decreases as price increases and increases as price falls.",
    "मूल्य रु. १० हुँदा माग २० एकाइ र रु. १५ हुँदा माग १५ एकाइ छ। मूल्य र मागको सम्बन्ध स्पष्ट पार्नुहोस्।",
    "Quantity demanded is 20 units at Rs 10 and 15 units at Rs 15. Explain the relationship.",
    "मूल्य ५ रुपैयाँ बढ्दा माग ५ एकाइ घट्यो। उदाहरणमा मूल्य र मागको विपरीत सम्बन्ध छ।",
    "A price increase of Rs 5 corresponds to a decrease of 5 units demanded, illustrating an inverse relationship."
  ],
  [
    "समष्टि अर्थशास्त्र",
    "Macroeconomics",
    "मुद्रास्फीति भनेको के हो?",
    "Define inflation.",
    "सामान्य मूल्यस्तरमा निरन्तर वृद्धि।",
    "A sustained increase in the general price level.",
    "सामान्य मूल्यस्तर बढ्दा निश्चित आम्दानी भएको परिवारको क्रयशक्तिमा के प्रभाव पर्छ? कारण दिनुहोस्।",
    "Explain how a rise in the general price level affects a fixed-income household's purchasing power.",
    "एउटै आम्दानीले कम वस्तु तथा सेवा किन्न सकिन्छ; वास्तविक क्रयशक्ति घट्छ।",
    "The same income buys fewer goods and services; real purchasing power falls."
  ],
  [
    "विकास अर्थशास्त्र",
    "Development economics",
    "मानव विकासको एउटा सूचक लेख्नुहोस्।",
    "Name one indicator of human development.",
    "शिक्षा वा अपेक्षित आयु वा प्रतिव्यक्ति आयमध्ये कुनै एक।",
    "Education, life expectancy or per capita income.",
    "आर्थिक वृद्धि र आर्थिक विकासबीच दुई भिन्नता लेख्नुहोस्।",
    "Give two differences between economic growth and economic development.",
    "वृद्धि उत्पादन वा आयको परिमाणमा वृद्धि हो; विकासमा जीवनस्तर तथा शिक्षा, स्वास्थ्य र अवसरमा सुधार पनि पर्छ।",
    "Growth is an increase in output or income; development also includes improvements in living standards, education, health and opportunities."
  ],
  [
    "नेपालको अर्थतन्त्र",
    "Economy of Nepal",
    "नेपालको अर्थतन्त्रमा सेवा क्षेत्रको एउटा उदाहरण दिनुहोस्।",
    "Give an example of a service-sector activity in Nepal.",
    "पर्यटन, यातायात वा बैंकिङमध्ये कुनै एक।",
    "Tourism, transport or banking.",
    "कृषि उत्पादनको स्थानीय मूल्य अभिवृद्धि गर्न दुई उपाय सुझाउनुहोस्।",
    "Suggest two ways to add value to local agricultural produce.",
    "प्रशोधन तथा प्याकेजिङ गर्ने; गुणस्तर सुधार र बजारसँग सम्पर्क बढाउने।",
    "Process and package produce; improve quality and market connections."
  ],
  [
    "अर्थशास्त्रमा परिमाणात्मक पद्धति",
    "Quantitative methods in economics",
    "१०, २० र ३० को औसत निकाल्नुहोस्।",
    "Find the mean of 10, 20 and 30.",
    "२०।",
    "20.",
    "आय रु. २००० बाट रु. २५०० पुग्यो। वृद्धि रकम र प्रतिशत निकाल्नुहोस्।",
    "Income rises from Rs 2,000 to Rs 2,500. Calculate the increase and percentage increase.",
    "वृद्धि रु. ५००; प्रतिशत ५०० ÷ २००० × १०० = २५।",
    "Increase Rs 500; percentage increase = 500 / 2000 × 100 = 25%."
  ]
];
const accounting=[
  [
    "कार्यालय र कर्मचारी",
    "Office and personnel",
    "कार्यालयको एउटा कार्य लेख्नुहोस्।",
    "State one function of an office.",
    "अभिलेख व्यवस्थापन।",
    "Records management.",
    "कार्यालयका कर्मचारीका दुई जिम्मेवारी लेख्नुहोस्।",
    "State two responsibilities of office personnel.",
    "काम समयमै पूरा गर्ने; गोपनीय अभिलेख सुरक्षित राख्ने।",
    "Complete work on time; protect confidential records."
  ],
  [
    "कार्यालय सहायक",
    "Office assistant",
    "कार्यालय सहायकको एउटा काम लेख्नुहोस्।",
    "State one duty of an office assistant.",
    "पत्र दर्ता गर्न सहयोग गर्ने।",
    "Assist with registering correspondence.",
    "कार्यालय सहायकमा आवश्यक दुई गुण लेख्नुहोस्।",
    "State two qualities of an office assistant.",
    "समयपालन र शुद्ध अभिलेख राख्ने क्षमता।",
    "Punctuality and accurate record keeping."
  ],
  [
    "कार्यालय स्रोत तथा साधन",
    "Office resources",
    "कार्यालयको एउटा भौतिक साधनको नाम लेख्नुहोस्।",
    "Name one physical office resource.",
    "कम्प्युटर।",
    "A computer.",
    "कार्यालय सामग्री व्यवस्थापनका दुई उपाय लेख्नुहोस्।",
    "Give two ways to manage office supplies.",
    "मौज्दात अभिलेख राख्ने; आवश्यकताअनुसार खरिद गर्ने।",
    "Maintain inventory records; purchase according to need."
  ],
  [
    "पत्र व्यवहार",
    "Correspondence",
    "औपचारिक पत्रको एउटा अङ्ग लेख्नुहोस्।",
    "Name one part of a formal letter.",
    "विषय।",
    "Subject line.",
    "आगमन पत्रको व्यवस्थापनका दुई चरण लेख्नुहोस्।",
    "State two steps for handling incoming letters.",
    "पत्र दर्ता गर्ने; सम्बन्धित शाखामा पठाउने।",
    "Register the letter; route it to the relevant department."
  ],
  [
    "अभिलेख व्यवस्थापन",
    "Records management",
    "अभिलेख व्यवस्थापनको एउटा उद्देश्य लेख्नुहोस्।",
    "State one purpose of records management.",
    "आवश्यक अभिलेख समयमै भेट्टाउन सक्नु।",
    "Retrieve necessary records promptly.",
    "कागजी र डिजिटल अभिलेख सुरक्षित राख्ने एक-एक उपाय लेख्नुहोस्।",
    "Give one protection measure each for paper and digital records.",
    "कागज सुरक्षित दराजमा राख्ने; डिजिटल अभिलेखको सुरक्षित ब्याकअप गर्ने।",
    "Store paper in a secure cabinet; maintain secure digital backups."
  ],
  [
    "सञ्चार र सूचना प्रविधि",
    "Communication and information technology",
    "विद्युतीय सञ्चारको एउटा माध्यम लेख्नुहोस्।",
    "Name one electronic communication medium.",
    "इमेल।",
    "Email.",
    "कार्यालयको इमेल सुरक्षित प्रयोग गर्न दुई उपाय लेख्नुहोस्।",
    "Give two measures for safe office email use.",
    "बलियो पासवर्ड प्रयोग गर्ने; शङ्कास्पद लिङ्क नखोल्ने।",
    "Use strong passwords; avoid suspicious links."
  ],
  [
    "व्यवसाय",
    "Business",
    "व्यवसायको एउटा उद्देश्य लेख्नुहोस्।",
    "State one objective of business.",
    "ग्राहकको आवश्यकता पूरा गर्ने।",
    "Meet customer needs.",
    "एकल स्वामित्व र साझेदारीबीच दुई भिन्नता लेख्नुहोस्।",
    "Give two differences between sole proprietorship and partnership.",
    "एकलमा एक मालिक हुन्छ; साझेदारीमा दुई वा बढी। एकलमा निर्णय एक मालिकले गर्छ; साझेदारीमा साझेदारबीच सहमति आवश्यक हुन सक्छ।",
    "A sole proprietorship has one owner; a partnership has two or more. Decisions are individual in the former and may require agreement in the latter."
  ],
  [
    "सभा र बैठक",
    "Assemblies and meetings",
    "बैठकको कार्यसूची भनेको के हो?",
    "What is a meeting agenda?",
    "बैठकमा छलफल गरिने विषयहरूको सूची।",
    "A list of topics to be discussed.",
    "बैठकको निर्णय पुस्तिकामा राखिने दुई विवरण लेख्नुहोस्।",
    "State two details recorded in meeting minutes.",
    "मिति र पारित निर्णय।",
    "Date and resolutions adopted."
  ],
  [
    "लेखाविधि",
    "Bookkeeping",
    "लेखाविधिको एउटा उद्देश्य लेख्नुहोस्।",
    "State one purpose of bookkeeping.",
    "आर्थिक कारोबार व्यवस्थित रूपमा अभिलेख गर्नु।",
    "Systematically record financial transactions.",
    "व्यक्तिगत र व्यवसायको कारोबार छुट्टाछुट्टै राख्नुका दुई कारण लेख्नुहोस्।",
    "Give two reasons for separating personal and business transactions.",
    "व्यवसायको वास्तविक नतिजा थाहा पाउन; लेखा अभिलेख स्पष्ट राख्न।",
    "Determine business performance accurately; maintain clear accounting records."
  ],
  [
    "आधारभूत लेखा प्रणाली",
    "Basic accounting system",
    "लेखा समीकरण लेख्नुहोस्।",
    "Write the accounting equation.",
    "सम्पत्ति = दायित्व + पुँजी।",
    "Assets = liabilities + equity.",
    "सम्पत्ति रु. ५०००० र दायित्व रु. १५००० भए पुँजी निकाल्नुहोस्।",
    "Assets are Rs 50,000 and liabilities Rs 15,000. Calculate equity.",
    "रु. ३५०००।",
    "Rs 35,000."
  ],
  [
    "भौचर",
    "Vouchers",
    "भौचरको एउटा उद्देश्य लेख्नुहोस्।",
    "State one purpose of a voucher.",
    "कारोबारको प्रमाण राख्नु।",
    "Maintain evidence of a transaction.",
    "भुक्तानी भौचरका दुई आवश्यक विवरण लेख्नुहोस्।",
    "State two essential details of a payment voucher.",
    "भुक्तानी रकम र कारोबारको मिति।",
    "Payment amount and transaction date."
  ],
  [
    "खाताबही",
    "Ledger",
    "खाताबही भनेको के हो?",
    "Define a ledger.",
    "कारोबारलाई खाताअनुसार वर्गीकरण गरी राखिने पुस्तिका।",
    "A record that classifies transactions by account.",
    "नगदमा रु. १००० को स्टेशनरी खरिद गर्दा कुन खाता डेबिट र कुन खाता क्रेडिट हुन्छ?",
    "For stationery costing Rs 1,000 purchased for cash, identify the debit and credit accounts.",
    "स्टेशनरी खर्च खाता डेबिट र नगद खाता क्रेडिट, दुवै रु. १०००।",
    "Debit stationery expense and credit cash, Rs 1,000 each."
  ],
  [
    "सहायक पुस्तिका",
    "Subsidiary books",
    "नगद कारोबारको अभिलेख राख्ने पुस्तिकाको नाम लेख्नुहोस्।",
    "Name the book used to record cash transactions.",
    "नगद पुस्तिका।",
    "Cash book.",
    "व्यापारिक सामान उधारोमा खरिद र बिक्री गर्दा कुन-कुन सहायक पुस्तिकामा लेखिन्छ?",
    "Which subsidiary books record credit purchases and credit sales of trading goods?",
    "उधारो खरिद खरिद पुस्तिकामा; उधारो बिक्री बिक्री पुस्तिकामा।",
    "Credit purchases in the purchases book; credit sales in the sales book."
  ],
  [
    "सन्तुलन परीक्षण",
    "Trial balance",
    "सन्तुलन परीक्षणको एउटा उद्देश्य लेख्नुहोस्।",
    "State one purpose of a trial balance.",
    "डेबिट र क्रेडिटको कुल रकम बराबर भए नभएको जाँच्नु।",
    "Check equality of total debits and credits.",
    "डेबिट कुल रु. २१००० र क्रेडिट कुल रु. २०००० भए अन्तर निकाल्नुहोस् र के गर्नुपर्छ लेख्नुहोस्।",
    "Total debits are Rs 21,000 and total credits Rs 20,000. Calculate the difference and state the next action.",
    "रु. १००० अन्तर; लेखा प्रविष्टि र जोड जाँचेर त्रुटि सच्याउनुपर्छ।",
    "Difference Rs 1,000; review entries and totals to identify and correct errors."
  ],
  [
    "सरकारी लेखा प्रणाली",
    "Government accounting system",
    "सरकारी लेखाको एउटा उद्देश्य लेख्नुहोस्।",
    "State one purpose of government accounting.",
    "सार्वजनिक रकमको उत्तरदायित्व सुनिश्चित गर्नु।",
    "Ensure accountability for public funds.",
    "सरकारी खर्चको अभिलेख पारदर्शी राख्नुका दुई कारण लेख्नुहोस्।",
    "Give two reasons for transparent public expenditure records.",
    "सार्वजनिक उत्तरदायित्व बढाउन; लेखापरीक्षण र बजेट नियन्त्रण गर्न।",
    "Strengthen public accountability; enable audit and budget control."
  ]
];
function build(rows,key,subject,sourceUrl){
 const units=rows.map(([ne,en],i)=>({id:'smss_g9_'+key+'_u'+(i+1),unitCode:String(i+1),unitTitle:ne+' / '+en,unitTitleEn:en,topics:[ne+' / '+en],sourceUrl,provenance:'Pinned government PDF text: topic headings only; original questions require teacher review'}));
 const questions=rows.flatMap((row,i)=>[1,2].map((marks,j)=>{
  const u=units[i],p=2+j*4;
  return {id:u.id+'_q'+j,gradeNumber:9,subject,unitCode:u.unitCode,unitId:u.id,unitTitle:u.unitTitle,topicId:u.id+'_0',topicName:u.topics[0],questionType:j?'short':'very_short',marks,cognitiveLevel:j?'application':'knowledge',questionText:row[p],questionTextEn:row[p+1],answer:row[p+2],answerEn:row[p+3],options:[],optionsEn:[],correctOption:'',status:'active',bundled:true,teacherReviewRequired:true,officialCdcQuestion:false,sourceStatus:'SMSS_original_draft_not_CDC_published'};
 }));
 return {units,questions,teacherReviewRequired:true,officialCdcQuestions:false,exactGridVerified:false};
}
export function grade9EconomicsPracticeBank({grade,subject}){
 if(grade!==9||subject!=='Economics')throw Error('Wrong Economics practice scope');
 return build(economics,'economics',subject,ECONOMICS_SOURCE);
}
export function grade9AccountingPracticeBank({grade,subject}){
 if(grade!==9||subject!=='Office Operation and Accounting')throw Error('Wrong Accounting practice scope');
 return build(accounting,'accounting',subject,ACCOUNTING_SOURCE);
}
