// Exact V46 working bilingual rubric data, from pinned main 82b01c45354e6a750ed1ab545deb6b15881eafaf,
// index.html blob ad2e3b96a22601fed9d956397a98c564b3ffb768.
// 2076 printed guide references, not independently verified wording; no official save.
const cdcPrimaryDailyLifeRubrics = [
  {ne:'घडी हेरेर घण्टा, मिनेट र सेकेन्डमा समय बताउने र लेख्ने',en:'Tell and write time in hours, minutes and seconds using a clock',criteria:[
    ['स्वतन्त्र रूपमा समय बताउने र लेख्ने','Tell and write the time independently'],
    ['साथीको मद्दतमा समय बताउने र लेख्ने','Tell and write the time with peer help'],
    ['शिक्षकको केही सहयोगमा समय बताउने र लेख्ने','Tell and write the time with partial teacher help'],
    ['शिक्षकको पूर्ण सहयोगमा समय बताउने र लेख्ने','Tell and write the time with full teacher help']]},
  {ne:'समयका एकाइहरूबीचको सम्बन्ध बताउने र लेख्ने',en:'Explain and write relationships between units of time',criteria:[
    ['वर्षदेखि सेकेन्डसम्मका सबै ६ क्रमिक एकाइ सम्बन्ध बताउने','Explain all six consecutive unit relationships from year to second'],
    ['कुनै चार एकाइ सम्बन्ध बताउने','Explain any four relationships'],
    ['कुनै तीन एकाइ सम्बन्ध बताउने','Explain any three relationships'],
    ['कुनै दुई एकाइ सम्बन्ध बताउने','Explain any two relationships']]},
  {ne:'काम पूरा गर्न लागेको समय निकाल्ने',en:'Determine the elapsed time of an activity',criteria:[
    ['स्वतन्त्र रूपमा लागेको समय निकाल्ने','Determine elapsed time independently'],
    ['साथीको मद्दतमा लागेको समय निकाल्ने','Determine elapsed time with peer help'],
    ['शिक्षकको केही सहयोगमा लागेको समय निकाल्ने','Determine elapsed time with partial teacher help'],
    ['शिक्षकको पूर्ण सहयोगमा लागेको समय निकाल्ने','Determine elapsed time with full teacher help']]}
];
// Revised CDC 2082, Annex 3(g), printed pp.202–203,207–208,214–215.
 // Each row stores a topic label and stable observation title; English is a working translation.
 // 2076 curriculum, printed pp.149,150,153. Working bilingual paraphrases.
 // Store the older themes separately from the 2084 revised curriculum.
 const cdcLegacyMathRubrics={
 '2:मेरो सिर्जना':{page:149,en:'My creation',rows:[
 {ne:'ठोस वस्तुबाट त्रिभुज र चतुर्भुज बनाउने',en:'Construct triangles and quadrilaterals using objects',criteria:[
 ['आफैँ बनाउने','Independently'],['साथीको सहयोगमा बनाउने','With peer help'],['शिक्षकको आंशिक सहयोगमा बनाउने','With partial teacher help'],['शिक्षकको पूर्ण सहयोगमा बनाउने','With full teacher help']]},
 {ne:'त्रिभुज, चतुर्भुज र वृत्तको खाका उतार्ने',en:'Trace triangles, quadrilaterals and circles',criteria:[
 ['आफैँ खाका उतार्ने','Independently'],['साथीको सहयोगमा खाका उतार्ने','With peer help'],['शिक्षकको आंशिक सहयोगमा खाका उतार्ने','With partial teacher help'],['शिक्षकको पूर्ण सहयोगमा खाका उतार्ने','With full teacher help']]},
 {ne:'भुजा र कुनाका आधारमा त्रिभुज र चतुर्भुज चिन्ने',en:'Identify triangles and quadrilaterals by sides and corners',criteria:[
 ['आकार पहिचान र भुजा–कुना सङ्ख्या बताउने','Identify shapes and state counts of sides and corners'],['पहिचान वा सङ्ख्या बताउने','Identify or state counts'],['साथीको सहयोगमा दुवै गर्ने','Both with peer help'],['शिक्षकको आंशिक सहयोगमा दुवै गर्ने','Both with partial teacher help']]}]},
 '2:सञ्चार प्रविधि र बजार':{page:150,en:'Communication technology and market',rows:[
 {ne:'रु. १००० सम्मका सिक्का र नोट चिन्ने',en:'Recognize coins and notes up to Rs 1,000',criteria:[
 ['आफैँ चिन्ने','Independently'],['साथीको सहयोगमा चिन्ने','With peer help'],['शिक्षकको आंशिक सहयोगमा चिन्ने','With partial teacher help'],['शिक्षकको पूर्ण सहयोगमा चिन्ने','With full teacher help']]},
 {ne:'रूपान्तरण नगरी मुद्रा जोड्ने र घटाउने',en:'Add and subtract money without conversion',criteria:[
 ['आफैँ गर्ने','Independently'],['साथीको सहयोगमा गर्ने','With peer help'],['शिक्षकको आंशिक सहयोगमा गर्ने','With partial teacher help'],['शिक्षकको पूर्ण सहयोगमा गर्ने','With full teacher help']]},
 {ne:'तालिकाबाट जानकारी लिने र दिने',en:'Read and communicate table data',criteria:[
 ['आफैँ पूर्ण जानकारी दिने','Complete independently'],['आफैँ आंशिक जानकारी दिने','Partial independently'],['साथीको सहयोगमा आंशिक जानकारी दिने','Partial with peer help'],['शिक्षकको सहयोगमा आंशिक जानकारी दिने','Partial with teacher help']]},
 {ne:'चित्रग्राफका सदस्य गनेर तालिकामा प्रस्तुत गर्ने',en:'Count pictograph entries and tabulate them',criteria:[
 ['आफैँ पूरा प्रस्तुत गर्ने','Complete independently'],['आफैँ आंशिक प्रस्तुत गर्ने','Partial independently'],['साथीको सहयोगमा प्रस्तुत गर्ने','With peer help'],['शिक्षकको सहयोगमा प्रस्तुत गर्ने','With teacher help']]}]},
 '3:मेरो दैनिक जीवन':{page:153,en:'My daily life',rows:cdcPrimaryDailyLifeRubrics}
 };
 // Further 2076 forms, printed pp.147–148,151–152,154–155; working paraphrases.
 Object.assign(cdcLegacyMathRubrics,{
  "2:हाम्रो विद्यालय": {
    "page": 147,
    "en": "Our school",
    "rows": [
      {
        "ne": "गुणनलाई दोहोरिएको जोडको रूपमा व्यक्त गर्ने",
        "en": "Express multiplication as repeated addition",
        "criteria": [
          [
            "स्वतन्त्र रूपमा",
            "Independently"
          ],
          [
            "साथीको सहयोगमा",
            "With peer help"
          ],
          [
            "शिक्षकको आंशिक सहयोगमा",
            "With partial teacher help"
          ],
          [
            "शिक्षकको पूर्ण सहयोगमा",
            "With full teacher help"
          ]
        ]
      },
      {
        "ne": "सिङ्गो, आधा र एक चौथाइबाट वस्तु तुलना गर्ने",
        "en": "Compare objects as whole, half and quarter",
        "criteria": [
          [
            "तीनै अवधारणाबाट तुलना",
            "Compare using all three concepts"
          ],
          [
            "आफैँ दुई अवधारणा वा साथीको सहयोगमा तीनै",
            "Two independently or all three with peer help"
          ],
          [
            "शिक्षकको आंशिक सहयोगमा तुलना",
            "Compare with partial teacher help"
          ],
          [
            "शिक्षकको पूर्ण सहयोगमा तुलना",
            "Compare with full teacher help"
          ]
        ]
      },
      {
        "ne": "उस्तै दुई सतहको क्षेत्रफल अवलोकन गरी तुलना गर्ने",
        "en": "Compare areas of two similar surfaces by observation",
        "criteria": [
          [
            "स्वतन्त्र रूपमा",
            "Independently"
          ],
          [
            "साथीको सहयोगमा",
            "With peer help"
          ],
          [
            "शिक्षकको आंशिक सहयोगमा",
            "With partial teacher help"
          ],
          [
            "शिक्षकको पूर्ण सहयोगमा",
            "With full teacher help"
          ]
        ]
      },
      {
        "ne": "मानक लम्बाइ एकाइ चिनेर रुलरमा सेन्टिमिटर र मिलिमिटर पढ्ने",
        "en": "Recognize standard units and read cm and mm on a ruler",
        "criteria": [
          [
            "आफैँ एकाइ चिन्ने र दुवै स्केल पढ्ने",
            "Identify units and read both scales independently"
          ],
          [
            "साथीको सहयोगमा दुवै वा आफैँ सेन्टिमिटर पढ्ने",
            "Both with peer help or cm independently"
          ],
          [
            "आंशिक शिक्षक सहयोगमा दुवै वा साथीको सहयोगमा सेन्टिमिटर",
            "Both with partial teacher help or cm with peer help"
          ],
          [
            "पूर्ण शिक्षक सहयोगमा दुवै वा आफैँ एकाइ पहिचान",
            "Both with full teacher help or identify units independently"
          ]
        ]
      },
      {
        "ne": "सेन्टिमिटरमा लम्बाइ अनुमान, नाप र पुष्टि गर्ने",
        "en": "Estimate, measure and verify length in centimetres",
        "criteria": [
          [
            "स्वतन्त्र रूपमा",
            "Independently"
          ],
          [
            "साथीको सहयोगमा",
            "With peer help"
          ],
          [
            "शिक्षकको आंशिक सहयोगमा",
            "With partial teacher help"
          ],
          [
            "शिक्षकको पूर्ण सहयोगमा",
            "With full teacher help"
          ]
        ]
      }
    ]
  },
  "2:सङ्ख्याको ज्ञान": {
    "page": 151,
    "en": "Number concepts",
    "rows": [
      {
        "ne": "देवनागरी पद्धतिमा १००० सम्म स्थानमान तालिका, स्थानमान, पढाइ र लेखाइ",
        "en": "Represent, state place value, read and write through 1,000 in Devanagari",
        "criteria": [
          [
            "चारै कार्य",
            "All four tasks"
          ],
          [
            "कुनै तीन कार्य",
            "Any three tasks"
          ],
          [
            "कुनै दुई कार्य",
            "Any two tasks"
          ],
          [
            "कुनै एक कार्य",
            "Any one task"
          ]
        ]
      },
      {
        "ne": "देवनागरी पद्धतिमा १०० सम्म अक्षरमा पढ्ने र लेख्ने",
        "en": "Read and write numbers in words to 100 in Devanagari",
        "criteria": [
          [
            "१०० सम्म पढ्ने र लेख्ने",
            "Read and write through 100"
          ],
          [
            "१०० सम्म पढ्ने वा लेख्ने अथवा ७० सम्म दुवै",
            "Read or write through 100, or both through 70"
          ],
          [
            "५० सम्म दुवै",
            "Both through 50"
          ],
          [
            "३० सम्म दुवै",
            "Both through 30"
          ]
        ]
      },
      {
        "ne": "हिन्दु–अरेबिक पद्धतिमा १००० सम्म स्थानमान तालिका, स्थानमान, पढाइ र लेखाइ",
        "en": "Represent, state place value, read and write through 1,000 in Hindu-Arabic",
        "criteria": [
          [
            "चारै कार्य",
            "All four tasks"
          ],
          [
            "कुनै तीन कार्य",
            "Any three tasks"
          ],
          [
            "कुनै दुई कार्य",
            "Any two tasks"
          ],
          [
            "कुनै एक कार्य",
            "Any one task"
          ]
        ]
      },
      {
        "ne": "हिन्दु–अरेबिक पद्धतिमा १०० सम्म अक्षरमा पढ्ने र लेख्ने",
        "en": "Read and write numbers in words to 100 in Hindu-Arabic",
        "criteria": [
          [
            "१०० सम्म पढ्ने र लेख्ने",
            "Read and write through 100"
          ],
          [
            "१०० सम्म पढ्ने वा लेख्ने अथवा ७० सम्म दुवै",
            "Read or write through 100, or both through 70"
          ],
          [
            "५० सम्म दुवै",
            "Both through 50"
          ],
          [
            "३० सम्म दुवै",
            "Both through 30"
          ]
        ]
      }
    ]
  },
  "2:गणितका आधारभूत क्रिया": {
    "page": 152,
    "en": "Basic operations",
    "rows": [
      {
        "ne": "योगफल १००० सम्म हुने तीन अङ्कका सङ्ख्या जोड्ने",
        "en": "Add up to three-digit numbers with sum through 1,000",
        "criteria": [
          [
            "सामग्री, चित्र, स्थानमान तालिका र सङ्केतबाट",
            "Using objects, pictures, place-value table and notation"
          ],
          [
            "सामग्री वा चित्र, स्थानमान तालिका र सङ्केतबाट",
            "Using objects or pictures, place-value table and notation"
          ],
          [
            "सामग्री र चित्रबाट",
            "Using objects and pictures"
          ],
          [
            "सामग्रीबाट",
            "Using objects"
          ]
        ]
      },
      {
        "ne": "तीन अङ्कसम्मको सङ्ख्या घटाउने",
        "en": "Subtract numbers of up to three digits",
        "criteria": [
          [
            "सामग्री, चित्र, स्थानमान तालिका र सङ्केतबाट",
            "Using objects, pictures, place-value table and notation"
          ],
          [
            "सामग्री वा चित्र, स्थानमान तालिका र सङ्केतबाट",
            "Using objects or pictures, place-value table and notation"
          ],
          [
            "सामग्री र चित्रबाट",
            "Using objects and pictures"
          ],
          [
            "सामग्रीबाट",
            "Using objects"
          ]
        ]
      },
      {
        "ne": "१० सम्मको गुणन तालिका बनाउने",
        "en": "Construct multiplication tables through 10",
        "criteria": [
          [
            "आफैँ १० सम्म",
            "Through 10 independently"
          ],
          [
            "आफैँ ७ वा साथीको सहयोगमा १० सम्म",
            "Through 7 independently or 10 with peer help"
          ],
          [
            "आफैँ ५ वा आंशिक शिक्षक सहयोगमा १० सम्म",
            "Through 5 independently or 10 with partial teacher help"
          ],
          [
            "आफैँ ३ वा पूर्ण शिक्षक सहयोगमा १० सम्म",
            "Through 3 independently or 10 with full teacher help"
          ]
        ]
      },
      {
        "ne": "दुई अङ्कसम्मको सङ्ख्यालाई १० सम्मको भाजकले निःशेष भाग गर्ने",
        "en": "Divide up to two-digit numbers exactly by divisors through 10",
        "criteria": [
          [
            "आफैँ १० सम्मका भाजक",
            "Divisors through 10 independently"
          ],
          [
            "आफैँ ७ वा साथीको सहयोगमा १० सम्म",
            "Through 7 independently or 10 with peer help"
          ],
          [
            "आफैँ ५ वा आंशिक शिक्षक सहयोगमा १० सम्म",
            "Through 5 independently or 10 with partial teacher help"
          ],
          [
            "आफैँ ३ वा पूर्ण शिक्षक सहयोगमा १० सम्म",
            "Through 3 independently or 10 with full teacher help"
          ]
        ]
      }
    ]
  },
  "3:हाम्रो समुदाय": {
    "page": 154,
    "en": "Our community",
    "rows": [
      {
        "ne": "चार अङ्कसम्मका सङ्ख्या बढ्दो वा घट्दो क्रममा पढ्ने र लेख्ने",
        "en": "Read and write up to four-digit numbers in ascending or descending order",
        "criteria": [
          [
            "चार अङ्कसम्म तुलना र क्रम मिलाउने",
            "Compare and order up to four digits"
          ],
          [
            "७००० सम्म आफैँ वा ९९९९ सम्म साथीको सहयोगमा",
            "Through 7,000 independently or 9,999 with peer help"
          ],
          [
            "५००० सम्म आफैँ वा ९९९९ सम्म आंशिक शिक्षक सहयोगमा",
            "Through 5,000 independently or 9,999 with partial teacher help"
          ],
          [
            "३००० सम्म आफैँ वा ९९९९ सम्म पूर्ण शिक्षक सहयोगमा",
            "Through 3,000 independently or 9,999 with full teacher help"
          ]
        ]
      },
      {
        "ne": "स्थानीय सङ्ख्याङ्कमा २० सम्म पढ्ने र लेख्ने",
        "en": "Read and write through 20 in local numerals",
        "criteria": [
          [
            "२० सम्म पढ्ने र लेख्ने",
            "Read and write through 20"
          ],
          [
            "२० सम्म पढ्ने वा लेख्ने अथवा १५ सम्म दुवै",
            "Read or write through 20, or both through 15"
          ],
          [
            "१५ सम्म पढ्ने वा लेख्ने अथवा १० सम्म दुवै",
            "Read or write through 15, or both through 10"
          ],
          [
            "१० सम्म पढ्ने वा लेख्ने अथवा ५ सम्म दुवै",
            "Read or write through 10, or both through 5"
          ]
        ]
      },
      {
        "ne": "आधा, एक चौथाइ, तीन चौथाइ, एक तिहाइ र दुई तिहाइ भिन्नमा लेख्ने",
        "en": "Write the five specified fractions",
        "criteria": [
          [
            "पाँचै भिन्न",
            "All five"
          ],
          [
            "कुनै चार",
            "Any four"
          ],
          [
            "कुनै तीन",
            "Any three"
          ],
          [
            "कुनै एक",
            "Any one"
          ]
        ]
      },
      {
        "ne": "१/२, १/४, ३/४, १/३ र २/३ सामग्रीबाट देखाउने",
        "en": "Model the five specified fractions",
        "criteria": [
          [
            "पाँचै भिन्न",
            "All five"
          ],
          [
            "कुनै चार",
            "Any four"
          ],
          [
            "कुनै तीन",
            "Any three"
          ],
          [
            "कुनै दुई",
            "Any two"
          ]
        ]
      },
      {
        "ne": "चित्रबाट उल्लिखित भिन्नमध्ये दुई तुलना गर्ने",
        "en": "Compare two of the listed fractions using pictures",
        "criteria": [
          [
            "स्वतन्त्र रूपमा",
            "Independently"
          ],
          [
            "साथीको सहयोगमा",
            "With peer help"
          ],
          [
            "शिक्षकको आंशिक सहयोगमा",
            "With partial teacher help"
          ],
          [
            "शिक्षकको पूर्ण सहयोगमा",
            "With full teacher help"
          ]
        ]
      },
      {
        "ne": "मिटर वा सेन्टिमिटरमा लम्बाइ अनुमान, नाप र पुष्टि गर्ने",
        "en": "Estimate, measure and verify lengths in metres or centimetres",
        "criteria": [
          [
            "अनुमान, नाप र पुष्टि",
            "Estimate, measure and verify"
          ],
          [
            "अनुमान र नाप वा नाप र पुष्टि",
            "Estimate and measure or measure and verify"
          ],
          [
            "अनुमान वा नाप",
            "Estimate or measure"
          ],
          [
            "शिक्षकको सहयोगमा तीनै कार्य",
            "All three with teacher help"
          ]
        ]
      }
    ]
  }
});
 // Source-reviewed 2076 Grade 3 forms, printed pp.156–163. Working paraphrases, not verbatim; ambiguous source wording requires final audit.
 Object.assign(cdcLegacyMathRubrics,{
  "3:मेरो सिर्जना": {
    "page": 156,
    "en": "My creation",
    "rows": [
      {
        "ne": "वस्तुको किनारा वा रेखाखण्ड नापेर तोकिएको नापको रेखाखण्ड खिच्ने",
        "en": "Measure an edge or segment and draw a segment of specified length",
        "criteria": [
          [
            "दुवै काम आफैँ",
            "Both independently"
          ],
          [
            "कुनै एक आफैँ वा दुवै साथीको सहयोगमा",
            "Either independently or both with peer help"
          ],
          [
            "दुवै शिक्षकको आंशिक सहयोगमा",
            "Both with partial teacher help"
          ],
          [
            "दुवै शिक्षकको पूर्ण सहयोगमा",
            "Both with full teacher help"
          ]
        ]
      },
      {
        "ne": "वरपरका ठोस वस्तुमा कोण देखाउने",
        "en": "Identify angles in nearby solid objects",
        "criteria": [
          [
            "आफैँ",
            "Independently"
          ],
          [
            "साथीको सहयोगमा",
            "With peer help"
          ],
          [
            "शिक्षकको आंशिक सहयोगमा",
            "With partial teacher help"
          ],
          [
            "शिक्षकको पूर्ण सहयोगमा",
            "With full teacher help"
          ]
        ]
      },
      {
        "ne": "रुलरले कोण खिच्ने, नाम लेख्ने र तुलना गर्ने",
        "en": "Draw, name and compare angles with a ruler",
        "criteria": [
          [
            "तीनै काम",
            "All three tasks"
          ],
          [
            "खिच्ने र नाम लेख्ने वा तुलना गर्ने",
            "Draw and name or compare"
          ],
          [
            "कुनै एक काम",
            "Any one task"
          ],
          [
            "शिक्षकको सहयोगमा तीनै",
            "All with teacher help"
          ]
        ]
      },
      {
        "ne": "समकोण पहिचान गर्ने",
        "en": "Identify right angles",
        "criteria": [
          [
            "आफैँ",
            "Independently"
          ],
          [
            "साथीको सहयोगमा",
            "With peer help"
          ],
          [
            "शिक्षकको आंशिक सहयोगमा",
            "With partial teacher help"
          ],
          [
            "शिक्षकको पूर्ण सहयोगमा",
            "With full teacher help"
          ]
        ]
      },
      {
        "ne": "सिधा किनारा भएको वस्तु र सिसाकलमले त्रिभुज र चतुर्भुज खिच्ने र नाम लेख्ने",
        "en": "Draw and name triangles and quadrilaterals using a straight edge and pencil",
        "criteria": [
          [
            "दुवै खिच्ने र नाम लेख्ने",
            "Draw and name both"
          ],
          [
            "एउटा खिचेर नाम लेख्ने वा दुवै खिच्ने वा दुवैको नाम लेख्ने",
            "Draw and name one, draw both, or name both"
          ],
          [
            "एउटा आकार खिच्ने",
            "Draw one shape"
          ],
          [
            "शिक्षकको पूर्ण सहयोगमा खिच्ने वा नाम लेख्ने",
            "Draw or name with full teacher help"
          ]
        ]
      },
      {
        "ne": "आयताकार र वर्गाकार सतह पहिचान गर्ने",
        "en": "Identify rectangular and square surfaces",
        "criteria": [
          [
            "दुवै सतह",
            "Both surfaces"
          ],
          [
            "कुनै एक",
            "Either surface"
          ],
          [
            "साथीको सहयोगमा दुवै",
            "Both with peer help"
          ],
          [
            "शिक्षकको पूर्ण सहयोगमा दुवै",
            "Both with full teacher help"
          ]
        ]
      }
    ]
  },
  "3:सञ्चार प्रविधि र बजार": {
    "page": 158,
    "en": "Communication technology and market",
    "rows": [
      {
        "ne": "रुपियाँ र पैसाको एकअर्कामा रूपान्तरण गर्ने",
        "en": "Convert rupees and paisa in both directions",
        "criteria": [
          [
            "दुवै रूपान्तरण",
            "Both conversions"
          ],
          [
            "कुनै एक रूपान्तरण",
            "Either conversion"
          ],
          [
            "रुपियाँबाट पैसा",
            "Rupees to paisa"
          ],
          [
            "शिक्षकको सहयोगमा दुवै",
            "Both with teacher help"
          ]
        ]
      },
      {
        "ne": "मुद्रासम्बन्धी जोड र घटाउ गर्ने",
        "en": "Add and subtract amounts of money",
        "criteria": [
          [
            "रूपान्तरण पर्ने र नपर्ने दुवै किसिमका जोड र घटाउ",
            "Add and subtract with and without conversion"
          ],
          [
            "दुवै किसिमका जोड वा घटाउ",
            "Either operation with and without conversion"
          ],
          [
            "रूपान्तरण नपर्ने जोड र घटाउ",
            "Both without conversion"
          ],
          [
            "रूपान्तरण नपर्ने जोड वा घटाउ",
            "Either without conversion"
          ]
        ]
      },
      {
        "ne": "मिटर, सेन्टिमिटर र मिलिमिटरको सम्बन्ध बताउने",
        "en": "Relate metres, centimetres and millimetres",
        "criteria": [
          [
            "आफैँ",
            "Independently"
          ],
          [
            "साथीको सहयोगमा",
            "With peer help"
          ],
          [
            "शिक्षकको आंशिक सहयोगमा",
            "With partial teacher help"
          ],
          [
            "शिक्षकको पूर्ण सहयोगमा",
            "With full teacher help"
          ]
        ]
      },
      {
        "ne": "मिटरलाई सेन्टिमिटर र सेन्टिमिटरलाई मिलिमिटरमा बदल्ने",
        "en": "Convert metres to centimetres and centimetres to millimetres",
        "criteria": [
          [
            "दुवै रूपान्तरण",
            "Both conversions"
          ],
          [
            "कुनै एक",
            "Either conversion"
          ],
          [
            "साथीको सहयोगमा दुवै",
            "Both with peer help"
          ],
          [
            "शिक्षकको सहयोगमा दुवै",
            "Both with teacher help"
          ]
        ]
      },
      {
        "ne": "वस्तुको तौल अनुमान गरी नापबाट पुष्टि गर्ने",
        "en": "Estimate and verify object weight",
        "criteria": [
          [
            "अनुमान, नाप र पुष्टि",
            "Estimate, measure and verify"
          ],
          [
            "अनुमान र नाप वा नाप र पुष्टि",
            "Estimate and measure or measure and verify"
          ],
          [
            "अनुमान वा नाप",
            "Estimate or measure"
          ],
          [
            "शिक्षकको सहयोगमा तीनै",
            "All with teacher help"
          ]
        ]
      },
      {
        "ne": "किलोग्रामलाई ग्राममा रूपान्तरण गर्ने",
        "en": "Convert kilograms to grams",
        "criteria": [
          [
            "आफैँ",
            "Independently"
          ],
          [
            "साथीको सहयोगमा",
            "With peer help"
          ],
          [
            "शिक्षकको आंशिक सहयोगमा",
            "With partial teacher help"
          ],
          [
            "शिक्षकको पूर्ण सहयोगमा",
            "With full teacher help"
          ]
        ]
      },
      {
        "ne": "लिटर र मिलिलिटरको सम्बन्ध बताउने",
        "en": "Relate litres and millilitres",
        "criteria": [
          [
            "आफैँ",
            "Independently"
          ],
          [
            "साथीको सहयोगमा",
            "With peer help"
          ],
          [
            "शिक्षकको आंशिक सहयोगमा",
            "With partial teacher help"
          ],
          [
            "शिक्षकको पूर्ण सहयोगमा",
            "With full teacher help"
          ]
        ]
      },
      {
        "ne": "भाँडाको क्षमता लिटर र मिलिलिटरमा नाप्ने",
        "en": "Measure container capacity in litres and millilitres",
        "criteria": [
          [
            "आफैँ",
            "Independently"
          ],
          [
            "साथीको सहयोगमा",
            "With peer help"
          ],
          [
            "शिक्षकको आंशिक सहयोगमा",
            "With partial teacher help"
          ],
          [
            "शिक्षकको पूर्ण सहयोगमा",
            "With full teacher help"
          ]
        ]
      },
      {
        "ne": "लिटर र मिलिलिटरको जोड र घटाउ गर्ने",
        "en": "Add and subtract litres and millilitres",
        "criteria": [
          [
            "आफैँ",
            "Independently"
          ],
          [
            "साथीको सहयोगमा",
            "With peer help"
          ],
          [
            "शिक्षकको आंशिक सहयोगमा",
            "With partial teacher help"
          ],
          [
            "शिक्षकको पूर्ण सहयोगमा",
            "With full teacher help"
          ]
        ]
      },
      {
        "ne": "सङ्केत प्रयोग गरी चित्रग्राफ बनाउने",
        "en": "Construct a pictograph using symbols",
        "criteria": [
          [
            "आफैँ",
            "Independently"
          ],
          [
            "साथीको सहयोगमा",
            "With peer help"
          ],
          [
            "शिक्षकको आंशिक सहयोगमा",
            "With partial teacher help"
          ],
          [
            "शिक्षकको पूर्ण सहयोगमा",
            "With full teacher help"
          ]
        ]
      }
    ]
  },
  "3:सङ्ख्याको ज्ञान": {
    "page": 160,
    "en": "Number concepts",
    "rows": [
      {
        "ne": "देवनागरी पद्धतिमा पाँच अङ्कसम्मका सङ्ख्या स्थानमान तालिकामा देखाउने, स्थानमान भन्ने र लेख्ने",
        "en": "Represent up to five-digit numbers in a Devanagari place-value table and state and write place values",
        "criteria": [
          [
            "तीनै काम",
            "All three tasks"
          ],
          [
            "कुनै दुई",
            "Any two"
          ],
          [
            "कुनै एक",
            "Any one"
          ],
          [
            "स्थानमान तालिका बनाउने",
            "Construct a place-value table"
          ]
        ]
      },
      {
        "ne": "देवनागरी पद्धतिमा १००० सम्मका सङ्ख्या अक्षरमा पढ्ने र लेख्ने",
        "en": "Read and write numbers through 1,000 in Devanagari words",
        "criteria": [
          [
            "१००० सम्म दुवै",
            "Both through 1,000"
          ],
          [
            "१००० सम्म कुनै एक वा ७०० सम्म दुवै",
            "Either through 1,000 or both through 700"
          ],
          [
            "५०० सम्म दुवै",
            "Both through 500"
          ],
          [
            "३०० सम्म दुवै",
            "Both through 300"
          ]
        ]
      },
      {
        "ne": "हिन्दु–अरेबिक पद्धतिमा पाँच अङ्कसम्मका सङ्ख्या स्थानमान तालिकामा देखाउने, स्थानमान भन्ने र लेख्ने",
        "en": "Represent up to five-digit numbers in a Hindu-Arabic place-value table and state and write place values",
        "criteria": [
          [
            "तीनै काम",
            "All three tasks"
          ],
          [
            "कुनै दुई",
            "Any two"
          ],
          [
            "कुनै एक",
            "Any one"
          ],
          [
            "स्थानमान तालिका बनाउने",
            "Construct a place-value table"
          ]
        ]
      },
      {
        "ne": "हिन्दु–अरेबिक पद्धतिमा १००० सम्मका सङ्ख्या अक्षरमा पढ्ने र लेख्ने",
        "en": "Read and write numbers through 1,000 in Hindu-Arabic words",
        "criteria": [
          [
            "१००० सम्म दुवै",
            "Both through 1,000"
          ],
          [
            "१००० सम्म कुनै एक वा ७०० सम्म पढ्ने र लेख्ने",
            "Either through 1,000 or read and write through 700"
          ],
          [
            "५०० सम्म पढ्ने र लेख्ने",
            "Read and write through 500"
          ],
          [
            "३०० सम्म पढ्ने र लेख्ने",
            "Read and write through 300"
          ]
        ]
      },
      {
        "ne": "सङ्ख्याको ढाँचा पहिचान गर्ने",
        "en": "Recognize number patterns",
        "criteria": [
          [
            "आफैँ",
            "Independently"
          ],
          [
            "साथीको सहयोगमा",
            "With peer help"
          ],
          [
            "शिक्षकको आंशिक सहयोगमा",
            "With partial teacher help"
          ],
          [
            "शिक्षकको पूर्ण सहयोगमा",
            "With full teacher help"
          ]
        ]
      },
      {
        "ne": "चार अङ्कसम्मका सङ्ख्या =, >, < सङ्केतले तुलना गर्ने",
        "en": "Compare up to four-digit numbers using equality and inequality signs",
        "criteria": [
          [
            "चार अङ्कसम्म",
            "Up to four digits"
          ],
          [
            "७००० सम्म वा साथीको सहयोगमा ९९९९ सम्म",
            "Through 7,000 or 9,999 with peer help"
          ],
          [
            "५००० सम्म वा शिक्षकको आंशिक सहयोगमा ९९९९ सम्म",
            "Through 5,000 or 9,999 with partial teacher help"
          ],
          [
            "३००० सम्म वा शिक्षकको पूर्ण सहयोगमा ९९९९ सम्म",
            "Through 3,000 or 9,999 with full teacher help"
          ]
        ]
      }
    ]
  },
  "3:गणितका आधारभूत क्रिया": {
    "page": 162,
    "en": "Basic operations",
    "rows": [
      {
        "ne": "योगफल १०००० सम्म हुने चार अङ्कसम्मका सङ्ख्या जोड्ने",
        "en": "Add up to four-digit numbers with sum through 10,000",
        "criteria": [
          [
            "स्थानमान तालिका र सङ्केतले हात लागी नआउने वा तीन स्थानसम्म हात लागी आउने",
            "Place-value table and notation, no carrying or up to three carries"
          ],
          [
            "हात लागी नआउने वा दुई स्थानसम्म",
            "No carrying or up to two carries"
          ],
          [
            "हात लागी नआउने वा एक स्थानसम्म",
            "No carrying or one carry"
          ],
          [
            "हात लागी नआउने",
            "Without carrying"
          ]
        ]
      },
      {
        "ne": "जोड र घटाउबिचको सम्बन्ध पहिचान गर्ने",
        "en": "Identify the relationship between addition and subtraction",
        "criteria": [
          [
            "आफैँ",
            "Independently"
          ],
          [
            "साथीको सहयोगमा",
            "With peer help"
          ],
          [
            "शिक्षकको आंशिक सहयोगमा",
            "With partial teacher help"
          ],
          [
            "शिक्षकको पूर्ण सहयोगमा",
            "With full teacher help"
          ]
        ]
      },
      {
        "ne": "चार अङ्कले बनेका सङ्ख्या घटाउने",
        "en": "Subtract four-digit numbers",
        "criteria": [
          [
            "स्थानमान तालिका र सङ्केतले सापटी नलिने वा तीन स्थानबाट लिने",
            "Use place value and notation, without borrowing or borrowing across three places"
          ],
          [
            "सापटी नलिने वा दुई स्थानबाट लिने",
            "Without borrowing or across two places"
          ],
          [
            "सापटी नलिने वा एक स्थानबाट लिने",
            "Without borrowing or across one place"
          ],
          [
            "सापटी नलिने",
            "Without borrowing"
          ]
        ]
      },
      {
        "ne": "तीन अङ्कसम्मको सङ्ख्यालाई दुई अङ्कसम्मले गुणन गर्ने",
        "en": "Multiply up to three-digit numbers by up to two-digit numbers",
        "criteria": [
          [
            "तीन अङ्क × दुई अङ्क",
            "Three digits × two digits"
          ],
          [
            "दुई अङ्क × दुई अङ्क",
            "Two digits × two digits"
          ],
          [
            "तीन अङ्क × एक अङ्क",
            "Three digits × one digit"
          ],
          [
            "दुई अङ्क × एक अङ्क",
            "Two digits × one digit"
          ]
        ]
      },
      {
        "ne": "तीन अङ्कसम्मको सङ्ख्यालाई १० सम्मको सङ्ख्याले भाग गर्ने",
        "en": "Divide up to three-digit numbers by divisors up to 10",
        "criteria": [
          [
            "तीन अङ्क, शेष रहने र नरहने",
            "Three digits, with and without remainder"
          ],
          [
            "दुई अङ्क, शेष रहने र नरहने",
            "Two digits, with and without remainder"
          ],
          [
            "तीन अङ्क, शेष नरहने",
            "Three digits without remainder"
          ],
          [
            "दुई अङ्क, शेष नरहने",
            "Two digits without remainder"
          ]
        ]
      }
    ]
  }
});
 // CDC 2076 Annex 3(b), printed pages 136–146; concise bilingual working paraphrases, pending wording audit.
 Object.assign(cdcLegacyMathRubrics,{
  "1:म र मेरो परिवार": {
    "page": 136,
    "en": "Me and my family",
    "rows": [
      {
        "ne": "स्थानका आधारमा भित्र–बाहिर, अगाडि–पछाडि, तल–माथि, दायाँ–बायाँ–बिच, नजिक–टाढा छुट्याउने",
        "en": "Distinguish spatial positions and relationships",
        "criteria": [
          [
            "सबै स्थानसम्बन्ध",
            "All relationships"
          ],
          [
            "कुनै तीन स्थानसम्बन्ध",
            "Any three relationships"
          ],
          [
            "कुनै दुई स्थानसम्बन्ध",
            "Any two relationships"
          ],
          [
            "कुनै एक स्थानसम्बन्ध",
            "Any one relationship"
          ]
        ]
      },
      {
        "ne": "देवनागरी पद्धतिमा १० सम्म गन्ने, पढ्ने, लेख्ने र तुलना गर्ने",
        "en": "Count, read, write and compare through 10 in Devanagari",
        "criteria": [
          [
            "चारै कार्य",
            "All four tasks"
          ],
          [
            "कुनै तीन",
            "Any three"
          ],
          [
            "कुनै दुई",
            "Any two"
          ],
          [
            "कुनै एक",
            "Any one"
          ]
        ]
      },
      {
        "ne": "देवनागरी पद्धतिमा ११–२० गन्ने, पढ्ने, लेख्ने र तुलना गर्ने",
        "en": "Count, read, write and compare 11–20 in Devanagari",
        "criteria": [
          [
            "चारै कार्य",
            "All four tasks"
          ],
          [
            "कुनै तीन",
            "Any three"
          ],
          [
            "कुनै दुई",
            "Any two"
          ],
          [
            "कुनै एक",
            "Any one"
          ]
        ]
      },
      {
        "ne": "हिन्दु–अरेबिक पद्धतिमा २० सम्म गन्ने, पढ्ने, लेख्ने र तुलना गर्ने",
        "en": "Count, read, write and compare through 20 in Hindu-Arabic",
        "criteria": [
          [
            "चारै कार्य",
            "All four tasks"
          ],
          [
            "कुनै तीन",
            "Any three"
          ],
          [
            "कुनै दुई",
            "Any two"
          ],
          [
            "कुनै एक",
            "Any one"
          ]
        ]
      }
    ]
  },
  "1:मेरो दैनिक जीवन": {
    "page": 138,
    "en": "My daily life",
    "rows": [
      {
        "ne": "दैनिक काम कुन समयमा गरिन्छ बताउने",
        "en": "Tell when daily activities take place",
        "criteria": [
          [
            "4 वटा सही",
            "4 correct"
          ],
          [
            "3 वटा सही",
            "3 correct"
          ],
          [
            "2 वटा सही",
            "2 correct"
          ],
          [
            "1 वटा सही",
            "1 correct"
          ]
        ]
      },
      {
        "ne": "हप्ताका दिन भन्ने र लेख्ने",
        "en": "Say and write the days of the week",
        "criteria": [
          [
            "क्रम मिलाएर दुवै",
            "Say and write in order"
          ],
          [
            "क्रम मिलाएर कुनै एक",
            "Either in order"
          ],
          [
            "क्रम नमिलाई भन्ने वा लेख्ने",
            "Say or write out of order"
          ],
          [
            "क्रम नमिलाई भन्ने",
            "Say out of order"
          ]
        ]
      }
    ]
  },
  "1:हाम्रो समुदाय": {
    "page": 139,
    "en": "Our community",
    "rows": [
      {
        "ne": "देवनागरी पद्धतिमा २१–१०० गन्ने, पढ्ने, लेख्ने र तुलना गर्ने",
        "en": "Count, read, write and compare 21–100 in Devanagari",
        "criteria": [
          [
            "चारै कार्य",
            "All four tasks"
          ],
          [
            "कुनै तीन",
            "Any three"
          ],
          [
            "कुनै दुई",
            "Any two"
          ],
          [
            "कुनै एक",
            "Any one"
          ]
        ]
      },
      {
        "ne": "देवनागरीमा १ देखि २० सम्म अक्षरमा पढ्ने र लेख्ने",
        "en": "Read and write 1–20 in Devanagari words",
        "criteria": [
          [
            "२० सम्म पढ्ने र लेख्ने",
            "Read and write through 20"
          ],
          [
            "२० सम्म पढ्ने वा लेख्ने, वा १५ सम्म दुवै",
            "Either through 20 or both through 15"
          ],
          [
            "१५ सम्म पढ्ने वा लेख्ने, वा १० सम्म दुवै",
            "Either through 15 or both through 10"
          ],
          [
            "१० सम्म पढ्ने वा लेख्ने, वा ५ सम्म दुवै",
            "Either through 10 or both through 5"
          ]
        ]
      },
      {
        "ne": "हिन्दु–अरेबिक पद्धतिमा २१–१०० गन्ने, पढ्ने, लेख्ने र तुलना गर्ने",
        "en": "Count, read, write and compare 21–100 in Hindu-Arabic",
        "criteria": [
          [
            "चारै कार्य",
            "All four tasks"
          ],
          [
            "कुनै तीन",
            "Any three"
          ],
          [
            "कुनै दुई",
            "Any two"
          ],
          [
            "कुनै एक",
            "Any one"
          ]
        ]
      },
      {
        "ne": "हिन्दु–अरेबिक पद्धतिमा १ देखि २० सम्म अक्षरमा पढ्ने र लेख्ने",
        "en": "Read and write 1–20 in Hindu-Arabic words",
        "criteria": [
          [
            "२० सम्म पढ्ने र लेख्ने",
            "Read and write through 20"
          ],
          [
            "२० सम्म पढ्ने वा लेख्ने, वा १५ सम्म दुवै",
            "Either through 20 or both through 15"
          ],
          [
            "१५ सम्म पढ्ने वा लेख्ने, वा १० सम्म दुवै",
            "Either through 15 or both through 10"
          ],
          [
            "१० सम्म पढ्ने वा लेख्ने, वा ५ सम्म दुवै",
            "Either through 10 or both through 5"
          ]
        ]
      },
      {
        "ne": "ठोस वस्तुबाट २० सम्मका सङ्ख्या जोर र बिजोरमा वर्गीकरण गर्ने",
        "en": "Classify numbers through 20 as even or odd with objects",
        "criteria": [
          [
            "20 वटा सही",
            "20 correct"
          ],
          [
            "15 वटा सही",
            "15 correct"
          ],
          [
            "10 वटा सही",
            "10 correct"
          ],
          [
            "5 वटा सही",
            "5 correct"
          ]
        ]
      },
      {
        "ne": "योगफल १० सम्म आउने गरी दुई सङ्ख्या जोड्ने",
        "en": "Add two numbers with sum up to 10",
        "criteria": [
          [
            "सामग्री, चित्र र सङ्केतबाट",
            "Objects, pictures and notation"
          ],
          [
            "सामग्री वा चित्र, र सङ्केतबाट",
            "Objects or pictures, and notation"
          ],
          [
            "सामग्री र चित्रबाट",
            "Objects and pictures"
          ],
          [
            "सामग्रीबाट",
            "Objects"
          ]
        ]
      },
      {
        "ne": "योगफल २० सम्म आउने गरी बढीमा तीन सङ्ख्या जोड्ने",
        "en": "Add up to three numbers with sum up to 20",
        "criteria": [
          [
            "सामग्री, चित्र र सङ्केतबाट",
            "Objects, pictures and notation"
          ],
          [
            "सामग्री वा चित्र, र सङ्केतबाट",
            "Objects or pictures, and notation"
          ],
          [
            "सामग्री र चित्रबाट",
            "Objects and pictures"
          ],
          [
            "सामग्रीबाट दुई सङ्ख्या जोड्ने",
            "Add two numbers using objects"
          ]
        ]
      },
      {
        "ne": "अप्रामाणिक नापले वस्तु नापेर अग्लो–होचो र लामो–छोटो छुट्याउने",
        "en": "Measure using informal units and compare height and length",
        "criteria": [
          [
            "आफैँ नाप्ने र तुलना गर्ने",
            "Measure and compare independently"
          ],
          [
            "नाप्ने र सहयोगमा तुलना गर्ने",
            "Measure and compare with help"
          ],
          [
            "नाप्ने",
            "Measure"
          ],
          [
            "अप्रामाणिक नापबारे बताउने",
            "Describe informal units"
          ]
        ]
      }
    ]
  },
  "1:हाम्रो विद्यालय": {
    "page": 141,
    "en": "Our school",
    "rows": [
      {
        "ne": "पहिलोदेखि दसौँसम्मको स्थान पहिचान गर्ने",
        "en": "Identify first through tenth positions",
        "criteria": [
          [
            "10 वटा सही",
            "10 correct"
          ],
          [
            "8 वटा सही",
            "8 correct"
          ],
          [
            "5 वटा सही",
            "5 correct"
          ],
          [
            "3 वटा सही",
            "3 correct"
          ]
        ]
      },
      {
        "ne": "हात नलिई योगफल १०० सम्म हुने दुई सङ्ख्या जोड्ने",
        "en": "Add two numbers to 100 without carrying",
        "criteria": [
          [
            "सामग्री, चित्र र सङ्केतबाट",
            "Objects, pictures and notation"
          ],
          [
            "सामग्री वा चित्र, र सङ्केतबाट",
            "Objects or pictures, and notation"
          ],
          [
            "सामग्री र चित्रबाट",
            "Objects and pictures"
          ],
          [
            "सामग्रीबाट",
            "Objects"
          ]
        ]
      },
      {
        "ne": "ठोस वस्तुबाट १० सम्मका सङ्ख्या घटाउने",
        "en": "Subtract numbers through 10 using objects",
        "criteria": [
          [
            "स्वतन्त्र रूपमा",
            "Independently"
          ],
          [
            "साथीको सहयोगमा",
            "With peer help"
          ],
          [
            "शिक्षकको आंशिक सहयोगमा",
            "With partial teacher help"
          ],
          [
            "शिक्षकको पूर्ण सहयोगमा",
            "With full teacher help"
          ]
        ]
      },
      {
        "ne": "ठोस वस्तुबाट २० सम्मका सङ्ख्या घटाउने",
        "en": "Subtract numbers through 20 using objects",
        "criteria": [
          [
            "स्वतन्त्र रूपमा",
            "Independently"
          ],
          [
            "साथीको सहयोगमा",
            "With peer help"
          ],
          [
            "शिक्षकको आंशिक सहयोगमा",
            "With partial teacher help"
          ],
          [
            "शिक्षकको पूर्ण सहयोगमा",
            "With full teacher help"
          ]
        ]
      },
      {
        "ne": "सापटी नलिई दुई अङ्कसम्मका सङ्ख्या घटाउने",
        "en": "Subtract up to two-digit numbers without borrowing",
        "criteria": [
          [
            "स्वतन्त्र रूपमा",
            "Independently"
          ],
          [
            "साथीको सहयोगमा",
            "With peer help"
          ],
          [
            "शिक्षकको आंशिक सहयोगमा",
            "With partial teacher help"
          ],
          [
            "शिक्षकको पूर्ण सहयोगमा",
            "With full teacher help"
          ]
        ]
      }
    ]
  },
  "1:मेरो सिर्जना": {
    "page": 142,
    "en": "My creation",
    "rows": [
      {
        "ne": "सिधा र वक्र रेखा चिन्ने, ट्रेस गर्ने र चित्र कोर्ने",
        "en": "Identify straight and curved lines, trace and draw",
        "criteria": [
          [
            "चारै कार्य",
            "All four tasks"
          ],
          [
            "कुनै तीन",
            "Any three"
          ],
          [
            "कुनै दुई",
            "Any two"
          ],
          [
            "कुनै एक",
            "Any one"
          ]
        ]
      },
      {
        "ne": "वरपरका वस्तुमा त्रिभुज, चतुर्भुज र वृत्त चिन्ने",
        "en": "Recognize triangles, quadrilaterals and circles in nearby objects",
        "criteria": [
          [
            "तीनै आकार छुट्याउने",
            "Distinguish all three"
          ],
          [
            "कुनै दुई",
            "Any two"
          ],
          [
            "कुनै एक",
            "Any one"
          ],
          [
            "आकार भएको बुझ्ने तर छुट्याउन नसक्ने",
            "Recognize shapes exist but cannot distinguish them"
          ]
        ]
      }
    ]
  },
  "1:सञ्चार प्रविधि र बजार": {
    "page": 143,
    "en": "Communication technology and market",
    "rows": [
      {
        "ne": "चलनचल्तीका रु. १०० सम्मका नेपाली सिक्का र नोट चिन्ने",
        "en": "Recognize Nepalese coins and notes through Rs 100",
        "criteria": [
          [
            "सबै रु. १०० सम्मका सिक्का र नोट",
            "All coins and notes through Rs 100"
          ],
          [
            "चलनचल्तीका रुपियाँका सबै सिक्का र नोट चिन्ने (स्रोतको शब्दावली पुनः पुष्टि गर्नुपर्ने)",
            "Recognize circulating rupee coins and notes (source wording requires review)"
          ],
          [
            "साथीको सहयोगमा रु. १०० सम्म",
            "Through Rs 100 with peer help"
          ],
          [
            "शिक्षकको सहयोगमा रु. १०० सम्म",
            "Through Rs 100 with teacher help"
          ]
        ]
      },
      {
        "ne": "चित्रग्राफबाट सूचना लिने र दिने",
        "en": "Read and communicate pictograph information",
        "criteria": [
          [
            "आफैँ पूर्ण जानकारी",
            "Complete independently"
          ],
          [
            "आफैँ आंशिक जानकारी",
            "Partial independently"
          ],
          [
            "साथीको सहयोगमा आंशिक",
            "Partial with peer help"
          ],
          [
            "शिक्षकको सहयोगमा आंशिक",
            "Partial with teacher help"
          ]
        ]
      }
    ]
  },
  "2:म र मेरो परिवार": {
    "page": 144,
    "en": "Me and my family",
    "rows": [
      {
        "ne": "समान प्रकृतिका भाँडाको क्षमता अवलोकनबाट तुलना गर्ने",
        "en": "Compare capacities of similar containers by observation",
        "criteria": [
          [
            "स्वतन्त्र रूपमा",
            "Independently"
          ],
          [
            "साथीको सहयोगमा",
            "With peer help"
          ],
          [
            "शिक्षकको आंशिक सहयोगमा",
            "With partial teacher help"
          ],
          [
            "शिक्षकको पूर्ण सहयोगमा",
            "With full teacher help"
          ]
        ]
      },
      {
        "ne": "भाँडाको क्षमता अनुमान गरी अप्रामाणिक नापबाट पुष्टि गर्ने",
        "en": "Estimate capacity and verify using informal units",
        "criteria": [
          [
            "अनुमान, नाप र पुष्टि",
            "Estimate, measure and verify"
          ],
          [
            "अनुमान र नाप वा नाप र पुष्टि",
            "Estimate and measure or measure and verify"
          ],
          [
            "अनुमान वा नाप",
            "Estimate or measure"
          ],
          [
            "शिक्षकको सहयोगमा तीनै",
            "All three with teacher help"
          ]
        ]
      }
    ]
  },
  "2:मेरो दैनिक जीवन": {
    "page": 145,
    "en": "My daily life",
    "rows": [
      {
        "ne": "घडी हेरेर घण्टा र मिनेटमा समय भन्ने र लेख्ने",
        "en": "Tell and write time in hours and minutes",
        "criteria": [
          [
            "स्वतन्त्र रूपमा",
            "Independently"
          ],
          [
            "साथीको सहयोगमा",
            "With peer help"
          ],
          [
            "शिक्षकको आंशिक सहयोगमा",
            "With partial teacher help"
          ],
          [
            "शिक्षकको पूर्ण सहयोगमा",
            "With full teacher help"
          ]
        ]
      },
      {
        "ne": "क्यालेन्डरबाट साल, महिना, गते र बार भन्ने र लेख्ने",
        "en": "Read and write year, month, date and weekday from a calendar",
        "criteria": [
          [
            "स्वतन्त्र रूपमा",
            "Independently"
          ],
          [
            "साथीको सहयोगमा",
            "With peer help"
          ],
          [
            "शिक्षकको आंशिक सहयोगमा",
            "With partial teacher help"
          ],
          [
            "शिक्षकको पूर्ण सहयोगमा",
            "With full teacher help"
          ]
        ]
      }
    ]
  },
  "2:हाम्रो समुदाय": {
    "page": 146,
    "en": "Our community",
    "rows": [
      {
        "ne": "तीन अङ्कसम्मका जोर र बिजोर सङ्ख्या पहिचान गर्ने",
        "en": "Identify even and odd numbers of up to three digits",
        "criteria": [
          [
            "तीन अङ्कसम्म",
            "Up to three digits"
          ],
          [
            "७०० सम्म आफैँ वा साथीको सहयोगमा तीन अङ्कसम्म",
            "Through 700 independently or three digits with peer help"
          ],
          [
            "५०० सम्म आफैँ वा आंशिक शिक्षक सहयोगमा तीन अङ्कसम्म",
            "Through 500 independently or three digits with partial teacher help"
          ],
          [
            "१०० सम्म आफैँ वा पूर्ण शिक्षक सहयोगमा तीन अङ्कसम्म",
            "Through 100 independently or three digits with full teacher help"
          ]
        ]
      },
      {
        "ne": "तीन अङ्कसम्मका सङ्ख्या तुलना गरी बढ्दो वा घट्दो क्रममा पढ्ने र लेख्ने",
        "en": "Compare and order up to three-digit numbers",
        "criteria": [
          [
            "तीन अङ्कसम्म",
            "Up to three digits"
          ],
          [
            "७०० सम्म आफैँ वा साथीको सहयोगमा तीन अङ्कसम्म",
            "Through 700 independently or three digits with peer help"
          ],
          [
            "५०० सम्म आफैँ वा आंशिक शिक्षक सहयोगमा तीन अङ्कसम्म",
            "Through 500 independently or three digits with partial teacher help"
          ],
          [
            "१०० सम्म आफैँ वा पूर्ण शिक्षक सहयोगमा तीन अङ्कसम्म",
            "Through 100 independently or three digits with full teacher help"
          ]
        ]
      },
      {
        "ne": "किलोग्राम र ग्रामबीचको सम्बन्ध बताउने",
        "en": "Relate kilograms and grams",
        "criteria": [
          [
            "स्वतन्त्र रूपमा",
            "Independently"
          ],
          [
            "साथीको सहयोगमा",
            "With peer help"
          ],
          [
            "शिक्षकको आंशिक सहयोगमा",
            "With partial teacher help"
          ],
          [
            "शिक्षकको पूर्ण सहयोगमा",
            "With full teacher help"
          ]
        ]
      },
      {
        "ne": "१०० ग्रामदेखि १ किलोग्रामसम्मका ढकबाट वस्तुको तौल लिने",
        "en": "Weigh objects using standard weights from 100 g to 1 kg",
        "criteria": [
          [
            "स्वतन्त्र रूपमा",
            "Independently"
          ],
          [
            "साथीको सहयोगमा",
            "With peer help"
          ],
          [
            "शिक्षकको आंशिक सहयोगमा",
            "With partial teacher help"
          ],
          [
            "शिक्षकको पूर्ण सहयोगमा",
            "With full teacher help"
          ]
        ]
      }
    ]
  }
});

export function v46LowerMathReference(grade){
 if(!['1','2','3'].includes(grade))throw Error('Lower Mathematics grade required');
 return Object.freeze(Object.entries(cdcLegacyMathRubrics).filter(([id])=>id.startsWith(grade+':')).sort((a,b)=>a[1].page-b[1].page).map(([id,form])=>{
  if(!Number.isInteger(form.page)||form.page<136||form.page>163||!Array.isArray(form.rows)||!form.rows.length)throw Error('Invalid pinned lower Mathematics reference');
  const sourceRows=form.rows.map(r=>{
   if(typeof r.ne!=='string'||typeof r.en!=='string'||!Array.isArray(r.criteria)||r.criteria.length!==4||r.criteria.some(c=>!Array.isArray(c)||c.length!==2||c.some(v=>typeof v!=='string'||!v.trim())))throw Error('Invalid pinned Mathematics rubric');
   return Object.freeze({title:r.ne,titleEn:r.en,criteria:Object.freeze(r.criteria.map(c=>Object.freeze([...c])))});
  });
  return Object.freeze({theme:id.slice(2),en:form.en,count:sourceRows.length,fullMarks:sourceRows.length*4,page:form.page,guide:'lower',status:'v46WorkingReference',indicators:null,scoreBlocks:null,sourceRows:Object.freeze(sourceRows),printedPage:true});
 }));
}
