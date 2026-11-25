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
const economicsExtra=[
  [
    [
      "परिवारसँग रु. १२०० छ। किताब रु. ७०० र यातायात रु. ५०० पर्छ। दुवै किनेपछि बाँकी रकम कति हुन्छ? बचतका लागि दुई निर्णय र तिनको अवसर लागत व्याख्या गर्नुहोस्।",
      "A household has Rs 1,200. Books cost Rs 700 and transport costs Rs 500. Calculate the balance if both are purchased. Explain two possible decisions to save money and their opportunity costs.",
      "बाँकी ०; सस्तो किताब रोज्दा किताबको गुणस्तर वा सुविधा त्याग्नुपर्ने हुन सक्छ; कम खर्चिलो यात्रा गर्दा समय वा सुविधा त्याग्नुपर्ने हुन सक्छ। उचित उदाहरण स्वीकार्य।",
      "Balance 0; cheaper books may sacrifice quality or convenience; cheaper transport may sacrifice time or convenience. Accept justified examples."
    ],
    [
      "विद्यालयमा सीमित बजेटले पुस्तकालय र खेलकुदमध्ये प्राथमिकता निर्धारण गर्नुपर्छ। दुर्लभता, छनोट, अवसर लागत र वैकल्पिक योजना प्रयोग गरी निर्णय प्रक्रिया व्याख्या गर्नुहोस्।",
      "A school must prioritize library and sports spending within a limited budget. Explain a decision process using scarcity, choice, opportunity cost and alternative plans.",
      "बजेटको सीमा पहिचान; दुवैको आवश्यकता र लाभ तुलना; विद्यार्थीको प्राथमिकता बुझ्ने; छनोटको त्यागिएको लाभ लेख्ने; चरणबद्ध लगानीको सम्भावना जाँच्ने; निर्णयको पुनरावलोकन।",
      "Identify budget constraints; compare needs and benefits; consult students; identify forgone benefit; consider phased spending; review the decision."
    ]
  ],
  [
    [
      "मूल्य रु. १०, २० र ३० हुँदा माग परिमाण क्रमशः ३०, २० र १० एकाइ छ। तालिका बनाउनुहोस् र मागको सम्बन्ध व्याख्या गर्नुहोस्।",
      "Price is Rs 10, 20 and 30, with demand of 30, 20 and 10 units respectively. Prepare a schedule and explain the relationship.",
      "(१०,३०), (२०,२०), (३०,१०); अन्य अवस्था समान हुँदा मूल्य बढेसँगै माग घट्छ।",
      "Pairs (10,30), (20,20), (30,10); other things equal, quantity demanded falls as price rises."
    ],
    [
      "मूल्य रु. १०, २० र ३० मा माग ४०, ३० र २० तथा आपूर्ति १०, ३० र ५० एकाइ छ। तालिका, सन्तुलन र रु. १० तथा ३० मा हुने अवस्थाको व्याख्या गर्नुहोस्।",
      "At prices Rs 10, 20 and 30, demand is 40, 30 and 20 units and supply is 10, 30 and 50 units. Prepare a schedule, identify equilibrium and explain conditions at Rs 10 and Rs 30.",
      "सन्तुलन रु. २० मा ३० एकाइ; रु. १० मा ३० एकाइ अधिक माग; रु. ३० मा ३० एकाइ अधिक आपूर्ति; अन्य अवस्था समान भए मूल्य समायोजनको सम्भावना।",
      "Equilibrium Rs 20 and 30 units; excess demand 30 units at Rs 10; excess supply 30 units at Rs 30; potential price adjustment, other things equal."
    ]
  ],
  [
    [
      "एक परिवारको मासिक आम्दानी रु. २०००० बाट रु. २२००० र खर्च रु. १८००० बाट रु. २०००० भयो। दुवै अवधिको बचत गणना गरी तुलना गर्नुहोस्।",
      "Monthly household income rises from Rs 20,000 to Rs 22,000 and spending from Rs 18,000 to Rs 20,000. Calculate and compare savings.",
      "दुवैमा रु. २००० बचत; बचत रकम उही भए पनि बचत दर १० प्रतिशतबाट करिब ९.०९ प्रतिशतमा घट्यो।",
      "Savings Rs 2,000 in both periods; savings rate falls from 10% to about 9.09%."
    ],
    [
      "देशको उत्पादन, रोजगारी र सामान्य मूल्यस्तरले परिवारमा पार्ने प्रभाव तीन उदाहरणसहित व्याख्या गर्नुहोस्। आर्थिक तथ्याङ्कको सीमाबारे दुई बुँदा लेख्नुहोस्।",
      "Explain how national output, employment and the general price level affect households, with three examples. Give two limitations of aggregate statistics.",
      "उत्पादनले वस्तु र आयको अवसर; रोजगारीले आम्दानी; मूल्यले क्रयशक्ति प्रभावित गर्छ। औसतले असमानता र क्षेत्रीय भिन्नता लुकाउन सक्छ। उदाहरणको औचित्य आवश्यक।",
      "Output affects goods and income opportunities; employment affects income; prices affect purchasing power. Averages can conceal inequality and regional differences. Require reasoned examples."
    ]
  ],
  [
    [
      "शिक्षा र स्वास्थ्यमा सुधारले आर्थिक विकासमा कसरी योगदान गर्छ? तीन कारण र दुई स्थानीय उदाहरण दिनुहोस्।",
      "How can better education and health contribute to development? Give three reasons and two local examples.",
      "सीप विकास, उत्पादकता वृद्धि र काममा सहभागिता; उदाहरण: व्यावसायिक तालिम र सुरक्षित स्वास्थ्य सेवा।",
      "Skills, productivity and participation; examples include vocational training and accessible health services."
    ],
    [
      "दुई काल्पनिक गाउँको औसत आय समान छ, तर शिक्षा, स्वास्थ्य र खानेपानीको पहुँच फरक छ। विकास तुलना गर्ने चार सूचक र दुई सुधार प्राथमिकता कारणसहित प्रस्ताव गर्नुहोस्।",
      "Two hypothetical villages have the same average income but differ in education, health and water access. Propose four development indicators and two justified improvement priorities.",
      "विद्यालय सहभागिता, स्वास्थ्य सेवा पहुँच, सुरक्षित पानी, आय वितरण; पहुँचमा बढी अभाव भएका सेवा पहिचान गरी प्राथमिकता दिने। आय मात्र पर्याप्त सूचक होइन।",
      "School participation, healthcare access, safe water and income distribution; prioritize services with the greatest unmet needs. Income alone is insufficient."
    ]
  ],
  [
    [
      "नेपालको ग्रामीण क्षेत्रमा कृषि र सेवा क्षेत्रका तीन आर्थिक सम्बन्ध व्याख्या गरी दुई स्थानीय रोजगारीका उदाहरण दिनुहोस्।",
      "Explain three economic links between agriculture and services in rural Nepal, with two local employment examples.",
      "ढुवानीले बजार जोड्छ; वित्तीय सेवाले पूँजी जुटाउँछ; बजार सूचनाले बिक्री सहयोग गर्छ। ढुवानी चालक र कृषि सेवा प्राविधिक उदाहरण।",
      "Transport connects markets; finance supports capital; market information supports sales. Examples: drivers and agricultural service technicians."
    ],
    [
      "काल्पनिक स्थानीय सहकारीले कृषकको उत्पादन बजारमा पुर्‍याउन योजना बनाउँदैछ। लागत, गुणस्तर, बजार, रोजगारी र जोखिम समेटेर पाँच चरणको योजना प्रस्ताव गर्नुहोस्।",
      "A hypothetical cooperative plans to market farmers’ produce. Propose a five-step plan covering cost, quality, markets, jobs and risk.",
      "लागत र माग अनुमान; संकलन र गुणस्तर जाँच; भण्डारण र ढुवानी; बजार सम्झौता र जिम्मेवारी; जोखिम तथा आम्दानीको समीक्षा।",
      "Estimate costs and demand; collect and check quality; arrange storage and transport; establish market agreements and roles; review risks and income."
    ]
  ],
  [
    [
      "चार दिनको बिक्री रु. १००, १५०, २०० र २५० छ। कुल, औसत र उच्चतम तथा न्यूनतम बिक्रीको अन्तर निकाल्नुहोस्।",
      "Sales over four days are Rs 100, 150, 200 and 250. Calculate total, mean and range.",
      "कुल ७००, औसत १७५, अन्तर १५०।",
      "Total 700, mean 175, range 150."
    ],
    [
      "तीन वस्तुको आधार वर्षको मूल्य रु. २०, ३० र ५० तथा हालको मूल्य रु. २५, ३६ र ५९ छ। एक-एक एकाइको डालोका दुवै लागत, वृद्धि रकम र प्रतिशत निकाल्नुहोस् र त्यसको अर्थ लेख्नुहोस्।",
      "Three items cost Rs 20, 30 and 50 in the base year and Rs 25, 36 and 59 now. For a basket of one unit each, calculate both costs, increase and percentage increase, and interpret it.",
      "आधार लागत १००, हाल १२०, वृद्धि २०, वृद्धि दर २० प्रतिशत; उही डालो किन्न २० प्रतिशत बढी रकम चाहिन्छ। यो तीन वस्तुको उदाहरण मात्र हो।",
      "Base cost 100, current 120, increase 20, increase 20%; the same basket costs 20% more. This is only an illustrative three-item basket."
    ]
  ]
];
const accountingExtra=[
  [
    [
      "विद्यालय कार्यालयमा पत्र, आगन्तुक र दैनिक काम व्यवस्थित गर्न चार कार्य तथा तिनको जिम्मेवारी तोक्नुहोस्।",
      "Allocate four duties and responsibilities for correspondence, visitors and daily work in a school office.",
      "पत्र दर्ता, आगन्तुक अभिलेख, कार्यसूची, सम्बन्धित शाखामा पठाउने; जिम्मेवार व्यक्ति तोक्ने।",
      "Register letters, log visitors, maintain work schedules, route tasks; allocate responsibility."
    ]
  ],
  [
    [
      "कार्यालय सहायकले एकै दिन तीन अत्यावश्यक काम पाएमा प्राथमिकता कसरी निर्धारण गर्छ? चार बुँदा लेख्नुहोस्।",
      "Explain four steps an office assistant should take to prioritize three urgent tasks.",
      "समयसीमा बुझ्ने, प्रभाव र आवश्यकता तुलना गर्ने, अधिकारीसँग समन्वय गर्ने, प्रगति अभिलेख राख्ने।",
      "Check deadlines, compare impact and need, coordinate with the supervisor, record progress."
    ]
  ],
  [
    [
      "कुनै कार्यालयमा ५० कापी मौज्दात थियो, ३० थपियो र २५ वितरण भयो। बाँकी निकालेर मौज्दात नियन्त्रणका दुई उपाय लेख्नुहोस्।",
      "An office had 50 notebooks, received 30 and issued 25. Calculate the balance and give two inventory controls.",
      "५५; प्राप्ति र वितरण दर्ता; भौतिक गणना मिलान।",
      "55; record receipts and issues; reconcile physical counts."
    ]
  ],
  [
    [
      "पुस्तक माग गर्न प्रधानाध्यापकलाई विषय, कारण र अनुरोधसहित औपचारिक पत्रको छोटो नमुना लेख्नुहोस्।",
      "Draft a short formal letter to a headteacher requesting books, including a subject, reason and request.",
      "मिति, प्राप्तकर्ता, स्पष्ट विषय, आवश्यकताको कारण, अनुरोध, सम्मानजनक समाप्ति र प्रेषक।",
      "Date, recipient, clear subject, reason, request, respectful closing and sender."
    ]
  ],
  [
    [
      "विद्यार्थीका अभिलेख खोज्न र सुरक्षित राख्न चार चरणको अभिलेख व्यवस्थापन योजना लेख्नुहोस्।",
      "Prepare a four-step plan for retrieving and protecting student records.",
      "वर्गीकरण, सूचक वा खोज प्रणाली, पहुँच नियन्त्रण, सुरक्षित ब्याकअप र पुनर्प्राप्ति जाँच।",
      "Classification, index or search system, access control, secure backup and recovery check."
    ]
  ],
  [
    [
      "कार्यालयमा गोपनीय सूचना पठाउँदा सुरक्षित डिजिटल सञ्चारका चार उपाय कारणसहित लेख्नुहोस्।",
      "Explain four precautions when sending confidential office information digitally.",
      "प्राप्तकर्ता जाँच, आवश्यक विवरण मात्र, सुरक्षित माध्यम, पहुँच सुरक्षा; प्रत्येकको कारण स्पष्ट।",
      "Verify recipient, minimize data, use secure channels, protect access; justify each."
    ]
  ],
  [
    [
      "एक पसलले रु. ५००० मा सामान किन्यो र रु. ६२०० मा बेच्यो। अन्य खर्च रु. ४०० भए नाफा गणना गरी दुई खर्च नियन्त्रण उपाय लेख्नुहोस्।",
      "A shop buys goods for Rs 5,000, sells for Rs 6,200 and incurs Rs 400 in other expenses. Calculate profit and give two cost controls.",
      "नाफा ८००; खरिद मूल्य तुलना र अनावश्यक खर्च घटाउने।",
      "Profit 800; compare purchase prices and reduce unnecessary expenses."
    ]
  ],
  [
    [
      "विद्यालय बैठकका लागि तीन कार्यसूची र निर्णय लेख्ने ढाँचाको नमुना तयार गर्नुहोस्।",
      "Prepare three agenda items and a sample format for recording school meeting decisions.",
      "मिति, सहभागी, कार्यसूची, निर्णय, जिम्मेवार व्यक्ति र समयसीमा।",
      "Date, attendees, agenda, decision, responsible person and deadline."
    ]
  ],
  [
    [
      "व्यवसायको रु. ३००० नगद बिक्री र रु. ५०० भाडा भुक्तानीलाई लेखा अभिलेखमा कसरी देखाउने? नगदको खुद परिवर्तन निकाल्नुहोस्।",
      "Explain how to record Rs 3,000 cash sales and Rs 500 rent paid. Calculate the net cash movement.",
      "नगद वृद्धि ३०००, बिक्री आय ३०००; भाडा खर्च ५००, नगद कमी ५००; खुद वृद्धि २५००।",
      "Cash increase 3,000 and sales revenue 3,000; rent expense 500 and cash decrease 500; net cash increase 2,500."
    ]
  ],
  [
    [
      "मालिकले रु. ४०००० नगद लगानी गरे र रु. १०००० बैंक ऋण लिए। सम्पत्ति, दायित्व र पुँजी निकालेर लेखा समीकरण जाँच्नुहोस्।",
      "An owner invests Rs 40,000 cash and borrows Rs 10,000. Calculate assets, liabilities and equity and check the accounting equation.",
      "सम्पत्ति ५००००, दायित्व १००००, पुँजी ४००००; ५०००० = १०००० + ४००००।",
      "Assets 50,000, liabilities 10,000, equity 40,000; 50,000 = 10,000 + 40,000."
    ]
  ],
  [
    [
      "रु. २५०० को कार्यालय सामग्री भुक्तानीको भौचरमा राखिने पाँच विवरणको नमुना तयार गर्नुहोस्।",
      "Prepare a sample of five entries required in a voucher for Rs 2,500 office supplies.",
      "मिति, भौचर नम्बर, प्राप्तकर्ता, कारोबार विवरण र रु. २५०० रकम; स्वीकृति वा प्रमाण पनि स्वीकार्य।",
      "Date, voucher number, payee, description and amount Rs 2,500; authorization or evidence also acceptable."
    ]
  ],
  [
    [
      "नगद रु. १०००० बाट व्यवसाय सुरु गरी रु. २००० को सामग्री नगदमा किनेको अवस्थामा नगद खाताको बाँकी र सम्बन्धित डेबिट/क्रेडिट देखाउनुहोस्।",
      "A business starts with Rs 10,000 cash and buys supplies for Rs 2,000 cash. Show the cash balance and relevant debits and credits.",
      "नगद डेबिट १००००, पुँजी क्रेडिट १००००; सामग्री डेबिट २०००, नगद क्रेडिट २०००; नगद बाँकी ८०००।",
      "Debit cash 10,000 and credit capital 10,000; debit supplies 2,000 and credit cash 2,000; cash balance 8,000."
    ]
  ],
  [
    [
      "नगद बिक्री रु. १५००, उधारो बिक्री रु. २५०० र व्यापारिक सामानको उधारो खरिद रु. २००० कुन-कुन पुस्तिकामा लेख्ने? कारण दिनुहोस्।",
      "Identify the books for Rs 1,500 cash sales, Rs 2,500 credit sales and Rs 2,000 credit purchases of trading goods. Explain why.",
      "नगद पुस्तिका, बिक्री पुस्तिका, खरिद पुस्तिका; कारोबारको प्रकृतिअनुसार वर्गीकरण।",
      "Cash book, sales book, purchases book; classify by transaction type."
    ]
  ],
  [
    [
      "नगद डेबिट रु. ८०००, सामग्री डेबिट रु. २००० र पुँजी क्रेडिट रु. १०००० भएको सन्तुलन परीक्षण बनाउनुहोस्। यसको एउटा सीमा लेख्नुहोस्।",
      "Prepare a trial balance for cash debit Rs 8,000, supplies debit Rs 2,000 and capital credit Rs 10,000. State one limitation.",
      "डेबिट जम्मा १००००; क्रेडिट जम्मा १००००; बराबर भए पनि पूर्ण रूपमा छुटेको कारोबार पत्ता नलाग्न सक्छ।",
      "Debit total 10,000; credit total 10,000; equality cannot detect a completely omitted transaction."
    ]
  ],
  [
    [
      "सार्वजनिक विद्यालयमा बजेट खर्च अभिलेखको उत्तरदायित्व बढाउन पाँच उपाय प्रस्ताव गर्नुहोस्।",
      "Propose five measures to improve accountability of public school budget expenditure.",
      "स्वीकृत बजेट, प्रमाणित भौचर, नियमित अभिलेख, बैंक मिलान, लेखापरीक्षण र उपयुक्त सार्वजनिक प्रतिवेदन।",
      "Approved budget, supported vouchers, regular records, bank reconciliation, audit and appropriate public reporting."
    ]
  ]
];
function build(rows,key,subject,sourceUrl){
 const units=rows.map(([ne,en],i)=>({id:'smss_g9_'+key+'_u'+(i+1),unitCode:String(i+1),unitTitle:ne+' / '+en,unitTitleEn:en,topics:[ne+' / '+en],sourceUrl,provenance:'Pinned government PDF text: topic headings only; original questions require teacher review'}));
 const questions=rows.flatMap((row,i)=>[1,2].map((marks,j)=>{
  const u=units[i],p=2+j*4;
  return {id:u.id+'_q'+j,gradeNumber:9,subject,unitCode:u.unitCode,unitId:u.id,unitTitle:u.unitTitle,topicId:u.id+'_0',topicName:u.topics[0],questionType:j?'short':'very_short',marks,cognitiveLevel:j?'application':'knowledge',questionText:row[p],questionTextEn:row[p+1],answer:row[p+2],answerEn:row[p+3],options:[],optionsEn:[],correctOption:'',status:'active',bundled:true,teacherReviewRequired:true,officialCdcQuestion:false,sourceStatus:'SMSS_original_draft_not_CDC_published'};
 }));
 const extra=key==='economics'?economicsExtra:accountingExtra,marks=key==='economics'?[5,8]:[5];
 if(extra.length!==units.length)throw Error('Practice supplement unit mismatch');
 for(const [i,items] of extra.entries())for(const [j,row] of items.entries()){
  const base=questions[i*2],m=marks[j];
  questions.push({...base,id:units[i].id+'_extra'+(j+1),marks:m,questionType:m===8?'long':'short',cognitiveLevel:j?'higher':'application',questionText:row[0],questionTextEn:row[1],answer:row[2],answerEn:row[3]});
 }
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
