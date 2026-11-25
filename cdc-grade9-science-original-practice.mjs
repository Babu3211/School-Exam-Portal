/** Grade 9 Science original SMSS practice.
 * Unit titles from government-hosted English textbook contents (text extraction;
 * screenshot timeout). Latest 2082 book and specification grid not inspected.
 * Unit 3 Mushroom and Unit 19 Materials used in Agriculture deliberately
 * differ from the historic 2078 grid. This is not an exact exam blueprint.
 */
import {cdcSubjectKey} from './cdc-grid-source-index.mjs';
export const SCIENCE_TEXTBOOK_URL="https://giwmscdnone.gov.np/media/pdf_upload/Science%20and%20Technology%20Grade%20-9%20%28English%20Translation%29_v0nphvf.pdf";
const rows=[
  [
    "वैज्ञानिक अध्ययन",
    "Scientific Study",
    [
      "लम्बाइको SI एकाइ कुन हो?",
      "Which is the SI unit of length?",
      [
        "मिटर",
        "किलोग्राम",
        "सेकेन्ड",
        "केल्भिन"
      ],
      [
        "metre",
        "kilogram",
        "second",
        "kelvin"
      ],
      0
    ],
    [
      "परिकल्पना के हो?",
      "What is a hypothesis?",
      "परीक्षण गर्न सकिने प्रारम्भिक व्याख्या।",
      "A preliminary explanation that can be tested."
    ],
    [
      "प्रयोगमा स्वतन्त्र र आश्रित चर छुट्याउनुहोस्।",
      "Distinguish independent and dependent variables.",
      "स्वतन्त्र चर बदलिन्छ; आश्रित चर त्यसको प्रभाव नाप्न प्रयोग हुन्छ।",
      "The independent variable is changed; the dependent variable measures its effect."
    ],
    [
      "प्रकाशले बिरुवाको वृद्धिमा पार्ने असर जाँच्न चार चरणको निष्पक्ष प्रयोग योजना बनाउनुहोस्।",
      "Design a fair four-step experiment to test the effect of light on plant growth.",
      "उस्तै बिरुवा छान्ने; प्रकाश मात्र फरक राख्ने; पानी र माटो समान राख्ने; निश्चित अवधिमा वृद्धि नापेर तुलना गर्ने।",
      "Select similar plants; vary only light; keep water and soil constant; measure and compare growth over a fixed period."
    ]
  ],
  [
    "सजीवहरूको वर्गीकरण",
    "Classification of Living Beings",
    [
      "वैज्ञानिक नामकरणमा सामान्यतः कति पद हुन्छन्?",
      "How many parts are normally used in binomial nomenclature?",
      [
        "एक",
        "दुई",
        "तीन",
        "चार"
      ],
      [
        "One",
        "Two",
        "Three",
        "Four"
      ],
      1
    ],
    [
      "मेरुदण्ड भएको एउटा जनावरको उदाहरण दिनुहोस्।",
      "Name one vertebrate.",
      "भ्यागुता।",
      "A frog."
    ],
    [
      "कशेरुकी र अकशेरुकी जनावरलाई उदाहरणसहित छुट्याउनुहोस्।",
      "Distinguish vertebrates and invertebrates with examples.",
      "कशेरुकीमा मेरुदण्ड हुन्छ, जस्तै माछा; अकशेरुकीमा हुँदैन, जस्तै गँड्यौला।",
      "Vertebrates have a backbone, e.g. fish; invertebrates lack one, e.g. earthworms."
    ],
    [
      "चरा, माछा, भ्यागुता र गाईलाई वर्गीकरण गरी प्रत्येकको एउटा पहिचान दिने लक्षण लेख्नुहोस्।",
      "Classify a bird, fish, frog and cow and give one identifying characteristic of each.",
      "चरा: Aves, प्वाँख; माछा: Pisces, गलफडा; भ्यागुता: Amphibia, ओसिलो छाला; गाई: Mammalia, दूध उत्पादन।",
      "Bird: Aves, feathers; fish: fish group, gills; frog: Amphibia, moist skin; cow: Mammalia, milk production."
    ]
  ],
  [
    "च्याउ",
    "Mushroom",
    [
      "च्याउ कुन समूहमा पर्छ?",
      "Which group includes mushrooms?",
      [
        "वनस्पति",
        "कवक",
        "जनावर",
        "भाइरस"
      ],
      [
        "Plants",
        "Fungi",
        "Animals",
        "Viruses"
      ],
      1
    ],
    [
      "च्याउको प्रजननमा प्रयोग हुने एउटा संरचना नाम दिनुहोस्।",
      "Name a reproductive structure of mushrooms.",
      "बीजाणु।",
      "Spore."
    ],
    [
      "च्याउले हरिया वनस्पतिले जस्तो प्रकाश संश्लेषण किन गर्दैन? दुई बुँदा लेख्नुहोस्।",
      "Give two points explaining why mushrooms do not photosynthesize like green plants.",
      "क्लोरोफिल हुँदैन; जैविक पदार्थबाट पोषक तत्त्व सोस्छ।",
      "They lack chlorophyll; they absorb nutrients from organic matter."
    ],
    [
      "च्याउ खेतीमा सफाइ, तापक्रम, आर्द्रता र सुरक्षित स्रोत किन आवश्यक छन्? चार बुँदामा स्पष्ट पार्नुहोस्।",
      "Explain why cleanliness, temperature, moisture and a safe source of spawn matter in mushroom cultivation.",
      "सफाइले दूषण घटाउँछ; उपयुक्त तापले वृद्धि सहयोग गर्छ; आर्द्रताले सुक्न दिँदैन; भरपर्दो बीउले सही प्रजाति र गुणस्तर सुनिश्चित गर्न मद्दत गर्छ।",
      "Cleanliness reduces contamination; suitable temperature supports growth; moisture prevents drying; reliable spawn helps ensure suitable species and quality."
    ]
  ],
  [
    "क्रमविकास",
    "Evolution",
    [
      "प्राकृतिक छनोटसँग विशेष रूपमा सम्बन्धित वैज्ञानिक को हुन्?",
      "Which scientist is especially associated with natural selection?",
      [
        "न्युटन",
        "डार्विन",
        "ओम",
        "पास्कल"
      ],
      [
        "Newton",
        "Darwin",
        "Ohm",
        "Pascal"
      ],
      1
    ],
    [
      "जीवाश्म के हो?",
      "What is a fossil?",
      "पुरानो जीवको संरक्षित अवशेष वा चिन्ह।",
      "A preserved remain or trace of an ancient organism."
    ],
    [
      "जीवाश्म र समजात अङ्गले क्रमविकासबारे कसरी प्रमाण दिन्छन्?",
      "How do fossils and homologous organs provide evidence of evolution?",
      "जीवाश्मले समयक्रमका परिवर्तन देखाउँछन्; समजात अङ्गले साझा पुर्खाको संकेत दिन्छन्।",
      "Fossils show changes through time; homologous structures suggest common ancestry."
    ],
    [
      "फरक रङका कीरामा चराको सिकार र वातावरणको रङले पुस्तौँपछि सङ्ख्यामा कस्तो परिवर्तन ल्याउन सक्छ? कारणसहित व्याख्या गर्नुहोस्।",
      "Explain how predation by birds and background colour might change insect colour frequencies over generations.",
      "रङमा वंशानुगत भिन्नता हुन्छ; देखिने कीरा बढी सिकार हुन सक्छन्; कम देखिने बढी बाँच्छन् र प्रजनन गर्छन्; पुस्तौँमा ती रङको अनुपात बढ्न सक्छ।",
      "Heritable colour variation exists; conspicuous insects may be eaten more; less visible insects survive and reproduce more; their colour frequency may rise over generations."
    ]
  ],
  [
    "शारीरिक संरचना र जीवन प्रक्रिया",
    "Body Structure and Life Process",
    [
      "रगतमा अक्सिजन बोक्ने मुख्य कोशिका कुन हो?",
      "Which blood cells mainly transport oxygen?",
      [
        "राता रक्तकोशिका",
        "सेता रक्तकोशिका",
        "प्लेटलेट",
        "स्नायुकोशिका"
      ],
      [
        "Red blood cells",
        "White blood cells",
        "Platelets",
        "Neurons"
      ],
      0
    ],
    [
      "प्रकाश संश्लेषणमा वनस्पतिले ग्रहण गर्ने ग्यास कुन हो?",
      "Which gas do plants take in for photosynthesis?",
      "कार्बन डाइअक्साइड।",
      "Carbon dioxide."
    ],
    [
      "धमनी र शिराको कार्यमा दुई फरक लेख्नुहोस्।",
      "Give two functional differences between arteries and veins.",
      "धमनीले मुटुबाट रगत लैजान्छ; शिराले मुटुतर्फ ल्याउँछ। धमनीमा सामान्यतः बढी चाप हुन्छ।",
      "Arteries carry blood away from the heart; veins carry it toward the heart. Arteries generally have higher pressure."
    ],
    [
      "व्यायाम गर्दा श्वासप्रश्वास र मुटुको गति बढ्नुको चार सम्बन्धित कारण स्पष्ट पार्नुहोस्।",
      "Explain four linked reasons why breathing and heart rates increase during exercise.",
      "मांसपेशीको ऊर्जा माग बढ्छ; अक्सिजन माग बढ्छ; कार्बन डाइअक्साइड उत्पादन बढ्छ; तीव्र रक्तसञ्चार र श्वासले ग्यास आदानप्रदान बढाउँछन्।",
      "Muscles require more energy; oxygen demand rises; carbon dioxide production rises; faster circulation and breathing increase gas exchange."
    ]
  ],
  [
    "प्रकृति र वातावरण",
    "Nature and Environment",
    [
      "खाद्य शृङ्खलाको उत्पादक कुन हो?",
      "Which is a producer in a food chain?",
      [
        "घाँस",
        "सर्प",
        "बाघ",
        "भ्यागुता"
      ],
      [
        "Grass",
        "Snake",
        "Tiger",
        "Frog"
      ],
      0
    ],
    [
      "जैविक विविधता भन्नाले के बुझिन्छ?",
      "What is biodiversity?",
      "जीवहरूको विविधता।",
      "The variety of living organisms."
    ],
    [
      "उत्पादक र अपघटकको भूमिका छुट्याउनुहोस्।",
      "Distinguish the roles of producers and decomposers.",
      "उत्पादकले जैविक पदार्थ बनाउँछन्; अपघटकले मृत पदार्थ विघटन गरी पोषक चक्रमा फर्काउँछन्।",
      "Producers create organic matter; decomposers break down dead matter and recycle nutrients."
    ],
    [
      "स्थानीय पोखरीको संरक्षणका चार उपाय तिनका फाइदासहित लेख्नुहोस्।",
      "Propose four ways to conserve a local pond and explain their benefits.",
      "फोहोर रोक्ने—प्रदूषण कम; किनाराको वनस्पति जोगाउने—भूक्षय कम; ढल उपचार—पानी सुरक्षित; जैविक निगरानी—समस्या समयमै पत्ता लाग्ने।",
      "Prevent dumping—less pollution; protect bank vegetation—less erosion; treat sewage—safer water; monitor biodiversity—early detection of problems."
    ]
  ],
  [
    "बल र चाल",
    "Force and Motion",
    [
      "बलको SI एकाइ कुन हो?",
      "What is the SI unit of force?",
      [
        "जुल",
        "वाट",
        "न्युटन",
        "पास्कल"
      ],
      [
        "Joule",
        "Watt",
        "Newton",
        "Pascal"
      ],
      2
    ],
    [
      "त्वरणको सूत्र लेख्नुहोस्।",
      "Write the formula for acceleration.",
      "a=(v−u)/t।",
      "a=(v−u)/t."
    ],
    [
      "२ kg वस्तुमा ६ N परिणामी बल लाग्दा त्वरण निकाल्नुहोस्।",
      "Find the acceleration of a 2 kg object under a net force of 6 N.",
      "a=F/m=6/2=3 m/s²।",
      "a=F/m=6/2=3 m/s²."
    ],
    [
      "स्थिर अवस्थाबाट २ m/s² को समान त्वरणमा ५ s चल्ने ३ kg वस्तुको अन्तिम वेग, दूरी, परिणामी बल र गतिज ऊर्जा निकाल्नुहोस्।",
      "A 3 kg body starts from rest and accelerates uniformly at 2 m/s² for 5 s. Find final velocity, displacement, net force and kinetic energy.",
      "v=10 m/s; s=25 m; F=6 N; KE=150 J।",
      "v=10 m/s; s=25 m; F=6 N; KE=150 J."
    ]
  ],
  [
    "सरल यन्त्र",
    "Simple Machine",
    [
      "आदर्श उत्तोलकमा टेक्ने बिन्दुलाई के भनिन्छ?",
      "What is the pivot of a lever called?",
      [
        "भार",
        "प्रयास",
        "आधारबिन्दु",
        "घर्षण"
      ],
      [
        "Load",
        "Effort",
        "Fulcrum",
        "Friction"
      ],
      2
    ],
    [
      "यान्त्रिक लाभको सूत्र लेख्नुहोस्।",
      "Write the mechanical advantage formula.",
      "MA=भार/प्रयास।",
      "MA=load/effort."
    ],
    [
      "२०० N भार उठाउन ५० N प्रयास लागे MA निकाल्नुहोस्।",
      "A load of 200 N requires an effort of 50 N. Calculate MA.",
      "MA=200/50=4।",
      "MA=200/50=4."
    ],
    [
      "एउटा यन्त्रको भार ३०० N, प्रयास १०० N र वेग अनुपात ४ छ। MA र दक्षता निकाल्नुहोस् तथा दक्षता १००% नहुनुका दुई कारण दिनुहोस्।",
      "A machine has a load of 300 N, effort 100 N and velocity ratio 4. Find MA and efficiency and give two reasons efficiency is below 100%.",
      "MA=3; दक्षता=75%; घर्षण र भागहरूको विकृति/ऊर्जा क्षति।",
      "MA=3; efficiency=75%; friction and deformation/energy losses."
    ]
  ],
  [
    "ऊर्जा",
    "Energy",
    [
      "कार्यको SI एकाइ कुन हो?",
      "Which is the SI unit of work?",
      [
        "जुल",
        "एम्पियर",
        "ओम",
        "न्युटन"
      ],
      [
        "Joule",
        "Ampere",
        "Ohm",
        "Newton"
      ],
      0
    ],
    [
      "शक्तिको सूत्र लेख्नुहोस्।",
      "Write the formula for power.",
      "P=W/t।",
      "P=W/t."
    ],
    [
      "५० N बलको दिशामा ४ m सार्दा भएको कार्य निकाल्नुहोस्।",
      "Find work done by a force of 50 N moving a body 4 m in its direction.",
      "W=50×4=200 J।",
      "W=50×4=200 J."
    ],
    [
      "१० kg वस्तुलाई २ m माथि ५ s मा उठाइन्छ। g=10 m/s² मान्दा वजन, कार्य, स्थितिज ऊर्जा वृद्धि र औसत शक्ति निकाल्नुहोस्।",
      "A 10 kg object is raised 2 m in 5 s. Using g=10 m/s², calculate weight, work against gravity, potential energy gain and average power.",
      "वजन=100 N; कार्य=200 J; PE वृद्धि=200 J; P=40 W।",
      "Weight=100 N; work=200 J; PE gain=200 J; power=40 W."
    ]
  ],
  [
    "तरङ्ग",
    "Wave",
    [
      "आवृत्तिको SI एकाइ कुन हो?",
      "What is the SI unit of frequency?",
      [
        "हर्ट्ज",
        "जुल",
        "मिटर",
        "भोल्ट"
      ],
      [
        "Hertz",
        "Joule",
        "Metre",
        "Volt"
      ],
      0
    ],
    [
      "तरङ्गलम्बाइ भनेको के हो?",
      "What is wavelength?",
      "समान कलामा रहेका नजिकका दुई बिन्दुबिचको दूरी।",
      "Distance between adjacent points in the same phase."
    ],
    [
      "आवृत्ति २० Hz र तरङ्गलम्बाइ ०.५ m हुँदा वेग निकाल्नुहोस्।",
      "Find wave speed for frequency 20 Hz and wavelength 0.5 m.",
      "v=fλ=20×0.5=10 m/s।",
      "v=fλ=20×0.5=10 m/s."
    ],
    [
      "तरङ्गको आवृत्ति ५० Hz र वेग २०० m/s छ। तरङ्गलम्बाइ, आवर्तकाल र २ s मा हुने कम्पन सङ्ख्या निकाल्नुहोस्; आवृत्ति दोब्बर हुँदा वेग स्थिर भए तरङ्गलम्बाइ कति हुन्छ?",
      "A wave has frequency 50 Hz and speed 200 m/s. Find wavelength, period and oscillations in 2 s; find wavelength if frequency doubles at constant speed.",
      "λ=4 m; T=0.02 s; 100 कम्पन; नयाँ λ=2 m।",
      "λ=4 m; T=0.02 s; 100 oscillations; new λ=2 m."
    ]
  ],
  [
    "विद्युत्",
    "Electricity",
    [
      "विद्युतीय प्रतिरोधको SI एकाइ कुन हो?",
      "Which is the SI unit of electrical resistance?",
      [
        "ओम",
        "एम्पियर",
        "वाट",
        "कुलम्ब"
      ],
      [
        "Ohm",
        "Ampere",
        "Watt",
        "Coulomb"
      ],
      0
    ],
    [
      "ओमको नियमको समीकरण लेख्नुहोस्।",
      "Write Ohm's law equation.",
      "V=IR।",
      "V=IR."
    ],
    [
      "६ V स्रोतमा ३ Ω प्रतिरोध जोड्दा धारा निकाल्नुहोस्।",
      "Calculate current through a 3 Ω resistor connected to 6 V.",
      "I=6/3=2 A।",
      "I=6/3=2 A."
    ],
    [
      "२ Ω र ४ Ω प्रतिरोधक श्रेणीक्रममा १२ V स्रोतमा जोडिएका छन्। कुल प्रतिरोध, धारा र दुवै प्रतिरोधकको विभवान्तर निकाल्नुहोस्।",
      "Resistors of 2 Ω and 4 Ω are in series across 12 V. Find total resistance, current and voltage across each resistor.",
      "R=6 Ω; I=2 A; V₁=4 V; V₂=8 V।",
      "R=6 Ω; I=2 A; V₁=4 V; V₂=8 V."
    ]
  ],
  [
    "ब्रह्माण्ड",
    "The Universe",
    [
      "सौर्यमण्डलको केन्द्रमा के छ?",
      "What is at the centre of the solar system?",
      [
        "पृथ्वी",
        "चन्द्रमा",
        "सूर्य",
        "मङ्गल"
      ],
      [
        "Earth",
        "Moon",
        "Sun",
        "Mars"
      ],
      2
    ],
    [
      "उपग्रह के हो?",
      "What is a satellite?",
      "अर्को खगोलीय पिण्डलाई परिक्रमा गर्ने वस्तु।",
      "An object that orbits another celestial body."
    ],
    [
      "तारा र ग्रहका दुई फरक लेख्नुहोस्।",
      "State two differences between a star and a planet.",
      "ताराले आफ्नै प्रकाश उत्सर्जन गर्छ; ग्रह मुख्यतः प्रकाश परावर्तन गर्छ। ग्रहले सामान्यतः ताराको परिक्रमा गर्छ।",
      "Stars emit their own light; planets mainly reflect light. Planets generally orbit stars."
    ],
    [
      "सूर्यग्रहण र चन्द्रग्रहणमा सूर्य, पृथ्वी र चन्द्रमाको स्थिति तथा ग्रहण हरेक महिनामा नहुनुको कारण स्पष्ट पार्नुहोस्।",
      "Explain the alignment of the Sun, Earth and Moon in solar and lunar eclipses and why eclipses do not occur every month.",
      "सूर्यग्रहणमा सूर्य–चन्द्रमा–पृथ्वी; चन्द्रग्रहणमा सूर्य–पृथ्वी–चन्द्रमा; छायाँ सही स्थानमा पर्नुपर्छ; चन्द्रमाको कक्षा झुकेको हुन्छ।",
      "Solar eclipse: Sun–Moon–Earth; lunar eclipse: Sun–Earth–Moon; shadows must align; the lunar orbit is tilted."
    ]
  ],
  [
    "सूचना तथा सञ्चार प्रविधि",
    "Information and Communication Technology",
    [
      "कम्प्युटरको इनपुट उपकरण कुन हो?",
      "Which is a computer input device?",
      [
        "मोनिटर",
        "प्रिन्टर",
        "किबोर्ड",
        "स्पिकर"
      ],
      [
        "Monitor",
        "Printer",
        "Keyboard",
        "Speaker"
      ],
      2
    ],
    [
      "ब्याकअप किन राखिन्छ?",
      "Why is a backup kept?",
      "डाटा हराएमा पुनः प्राप्त गर्न।",
      "To recover data if lost."
    ],
    [
      "हार्डवेयर र सफ्टवेयर छुट्याएर उदाहरण दिनुहोस्।",
      "Distinguish hardware and software with examples.",
      "हार्डवेयर भौतिक भाग, जस्तै किबोर्ड; सफ्टवेयर निर्देशन/कार्यक्रम, जस्तै वर्ड प्रोसेसर।",
      "Hardware is physical equipment, e.g. a keyboard; software is programs/instructions, e.g. a word processor."
    ],
    [
      "विद्यालयको डिजिटल डाटा सुरक्षित राख्ने चार उपाय कारणसहित सुझाउनुहोस्।",
      "Recommend four measures to protect school digital data, with reasons.",
      "बलियो पासवर्ड—अनधिकृत पहुँच कम; नियमित ब्याकअप—पुनःप्राप्ति; अपडेट—कमजोरी सुधार; सीमित अनुमति—अनावश्यक पहुँच रोक्ने।",
      "Strong passwords reduce unauthorized access; backups enable recovery; updates fix vulnerabilities; limited permissions reduce unnecessary access."
    ]
  ],
  [
    "परमाणु संरचना र रासायनिक बन्ध",
    "Atomic Structure and Chemical Bond",
    [
      "ऋण आवेश भएको परमाणविक कण कुन हो?",
      "Which atomic particle is negatively charged?",
      [
        "प्रोटोन",
        "न्युट्रोन",
        "इलेक्ट्रोन",
        "नाभिक"
      ],
      [
        "Proton",
        "Neutron",
        "Electron",
        "Nucleus"
      ],
      2
    ],
    [
      "परमाणु सङ्ख्याले के जनाउँछ?",
      "What does atomic number indicate?",
      "प्रोटोनको सङ्ख्या।",
      "The number of protons."
    ],
    [
      "परमाणु सङ्ख्या ११ र द्रव्यमान सङ्ख्या २३ भएको तटस्थ परमाणुमा प्रोटोन र न्युट्रोन कति हुन्छन्?",
      "Find protons and neutrons in a neutral atom of atomic number 11 and mass number 23.",
      "११ प्रोटोन; २३−११=१२ न्युट्रोन।",
      "11 protons; 23−11=12 neutrons."
    ],
    [
      "Na र Cl को परमाणु सङ्ख्या ११ र १७ छ। तिनको इलेक्ट्रोन वितरण, बन्ने आयन र बन्धको प्रकार स्पष्ट गर्नुहोस्।",
      "Na and Cl have atomic numbers 11 and 17. Explain their electron arrangements, resulting ions and bond type.",
      "Na: 2,8,1; Cl: 2,8,7; Na⁺ र Cl⁻; इलेक्ट्रोन स्थानान्तरणबाट आयनिक बन्ध।",
      "Na: 2,8,1; Cl: 2,8,7; Na⁺ and Cl⁻; ionic bond through electron transfer."
    ]
  ],
  [
    "रासायनिक प्रतिक्रिया",
    "Chemical Reaction",
    [
      "रासायनिक समीकरण सन्तुलन गर्दा कुन नियम पालना गरिन्छ?",
      "Which law is followed when balancing a chemical equation?",
      [
        "द्रव्यमान संरक्षण",
        "ओमको नियम",
        "हुकको नियम",
        "परावर्तनको नियम"
      ],
      [
        "Conservation of mass",
        "Ohm's law",
        "Hooke's law",
        "Law of reflection"
      ],
      0
    ],
    [
      "अभिकारक के हो?",
      "What is a reactant?",
      "प्रतिक्रिया सुरु हुँदा परिवर्तन हुने पदार्थ।",
      "A substance consumed or transformed in a reaction."
    ],
    [
      "Mg + O₂ → MgO समीकरण सन्तुलित गर्नुहोस्।",
      "Balance Mg + O₂ → MgO.",
      "2Mg + O₂ → 2MgO।",
      "2Mg + O₂ → 2MgO."
    ],
    [
      "CaCO₃ → CaO + CO₂ र H₂ + O₂ → H₂O समीकरण सन्तुलित गरी प्रतिक्रिया प्रकार पहिचान गर्नुहोस्।",
      "Balance CaCO₃ → CaO + CO₂ and H₂ + O₂ → H₂O, and classify each reaction.",
      "CaCO₃ → CaO + CO₂, विघटन; 2H₂ + O₂ → 2H₂O, संयोजन।",
      "CaCO₃ → CaO + CO₂, decomposition; 2H₂ + O₂ → 2H₂O, combination."
    ]
  ],
  [
    "ग्यास",
    "Gases",
    [
      "श्वसनमा शरीरले मुख्यतः उपयोग गर्ने ग्यास कुन हो?",
      "Which gas is mainly used in aerobic respiration?",
      [
        "नाइट्रोजन",
        "अक्सिजन",
        "हिलियम",
        "आर्गन"
      ],
      [
        "Nitrogen",
        "Oxygen",
        "Helium",
        "Argon"
      ],
      1
    ],
    [
      "कार्बन डाइअक्साइडको रासायनिक सूत्र लेख्नुहोस्।",
      "Write the chemical formula of carbon dioxide.",
      "CO₂।",
      "CO₂."
    ],
    [
      "अक्सिजन र कार्बन डाइअक्साइडको एक-एक उपयोग लेख्नुहोस्।",
      "Give one use each of oxygen and carbon dioxide.",
      "अक्सिजन: चिकित्सकीय श्वसन सहायता; CO₂: पेय पदार्थ कार्बोनेसन।",
      "Oxygen: medical respiratory support; CO₂: carbonation of beverages."
    ],
    [
      "बन्द कोठामा हावा आवतजावत आवश्यक हुनुका चार वैज्ञानिक कारण लेख्नुहोस्।",
      "Explain four scientific reasons why ventilation is important in enclosed rooms.",
      "ताजा हावा आउँछ; श्वसनबाट बढेको CO₂ घटाउन मद्दत; आर्द्रता घटाउन सहयोग; भित्री प्रदूषक पातलो हुन्छन्।",
      "It brings in fresh air; helps reduce accumulated CO₂; helps control humidity; dilutes indoor pollutants."
    ]
  ],
  [
    "धातु र अधातु",
    "Metals and Non-metals",
    [
      "तलका मध्ये सामान्य तापक्रममा राम्रो विद्युत् चालक कुन हो?",
      "Which is a good electrical conductor at room temperature?",
      [
        "तामा",
        "गन्धक",
        "काठ",
        "प्लास्टिक"
      ],
      [
        "Copper",
        "Sulfur",
        "Wood",
        "Plastic"
      ],
      0
    ],
    [
      "एउटा तरल धातुको नाम लेख्नुहोस्।",
      "Name one metal that is liquid at ordinary room temperature.",
      "पारो।",
      "Mercury."
    ],
    [
      "धातु र अधातुका दुई सामान्य भौतिक फरक दिनुहोस्।",
      "State two common physical differences between metals and nonmetals.",
      "धातु सामान्यतः सुचालक र पिटेर पाता बनाउन सकिने हुन्छन्; अधिकांश ठोस अधातु कुचालक र भङ्गुर हुन्छन्।",
      "Metals are generally conductive and malleable; most solid nonmetals are poor conductors and brittle."
    ],
    [
      "तामाको तार, फलामको औजार, प्लास्टिकको आवरण र ग्रेफाइट इलेक्ट्रोडका उपयोगलाई तिनका गुणसँग जोडेर व्याख्या गर्नुहोस्।",
      "Relate the use of copper wire, iron tools, plastic insulation and graphite electrodes to their properties.",
      "तामा चालक र तन्य; फलाम बलियो; प्लास्टिक विद्युत् कुचालक; ग्रेफाइट विद्युत् चालक अधातु।",
      "Copper is conductive and ductile; iron is strong; plastic is electrically insulating; graphite is a conducting nonmetal."
    ]
  ],
  [
    "कार्बन र यसका यौगिक",
    "Carbon and its Compounds",
    [
      "मिथेनको सूत्र कुन हो?",
      "Which is the formula of methane?",
      [
        "CO₂",
        "CH₄",
        "C₂H₆",
        "H₂O"
      ],
      [
        "CO₂",
        "CH₄",
        "C₂H₆",
        "H₂O"
      ],
      1
    ],
    [
      "कार्बनको संयोजकता कति हुन्छ?",
      "What is the valency of carbon?",
      "चार।",
      "Four."
    ],
    [
      "हीरा र ग्रेफाइटका दुई फरक गुण लेख्नुहोस्।",
      "State two differing properties of diamond and graphite.",
      "हीरा कडा र सामान्यतः विद्युत् कुचालक; ग्रेफाइट नरम र विद्युत् चालक।",
      "Diamond is hard and normally electrically insulating; graphite is soft and electrically conducting."
    ],
    [
      "कार्बनले धेरै प्रकारका यौगिक बनाउने चार कारण वा संरचनात्मक विशेषता स्पष्ट गर्नुहोस्।",
      "Explain four reasons or structural features that allow carbon to form many compounds.",
      "चार संयोजकता; आफैँसँग शृङ्खला बनाउने; शाखायुक्त र चक्रीय संरचना; एकल, द्वि वा त्रिबन्ध बनाउन सक्ने।",
      "Tetravalency; catenation; branched and cyclic structures; ability to form single, double or triple bonds."
    ]
  ],
  [
    "कृषिमा प्रयोग हुने पदार्थ",
    "Materials used in Agriculture",
    [
      "NPK मा N ले के जनाउँछ?",
      "What does N represent in NPK?",
      [
        "सोडियम",
        "नाइट्रोजन",
        "निकेल",
        "निओन"
      ],
      [
        "Sodium",
        "Nitrogen",
        "Nickel",
        "Neon"
      ],
      1
    ],
    [
      "कम्पोस्ट मलको एउटा स्रोत लेख्नुहोस्।",
      "Name one source of compost.",
      "कुहिने वनस्पतिक अवशेष।",
      "Biodegradable plant residues."
    ],
    [
      "कम्पोस्ट र रासायनिक मलका दुई फरक लेख्नुहोस्।",
      "Give two differences between compost and chemical fertilizers.",
      "कम्पोस्टमा जैविक पदार्थ हुन्छ र पोषक तत्त्व बिस्तारै उपलब्ध हुन सक्छ; रासायनिक मलमा निश्चित पोषक तत्त्वको बढी सघन मात्रा हुन सक्छ।",
      "Compost adds organic matter and may release nutrients slowly; chemical fertilizers may contain more concentrated specified nutrients."
    ],
    [
      "माटोको उर्वरता कायम राख्दै कृषि प्रदूषण घटाउने चार उपाय लेख्नुहोस्।",
      "Suggest four measures to maintain soil fertility while reducing agricultural pollution.",
      "माटो परीक्षण; आवश्यक मात्र पोषक तत्त्व; कम्पोस्ट र बाली चक्र; जलस्रोत नजिक अनावश्यक मल/रसायन प्रयोग नगर्ने।",
      "Soil testing; apply only necessary nutrients; compost and crop rotation; avoid unnecessary fertilizer or chemical use near water sources."
    ]
  ]
];
export function grade9ScienceOriginalBank({grade,subject}={}){
 const empty={units:[],questions:[],teacherReviewRequired:true,officialCdcQuestions:false,exactGridVerified:false};
 if(grade!==9||cdcSubjectKey(subject)!=='science')return empty;
 const units=rows.map(([ne,en],i)=>({id:'smss_science_g9_u'+(i+1),unitCode:String(i+1),unitTitle:ne+' / '+en,unitTitleEn:en,topics:['अवधारणा / Concepts','छोटो उत्तर / Short answers','प्रयोग तथा विश्लेषण / Application and analysis'],sourceTitle:'Government-hosted Grade 9 Science English textbook contents',sourceUrl:SCIENCE_TEXTBOOK_URL,provenance:'Text-extracted textbook units; current 2082 grid and book review pending'}));
 const questions=rows.flatMap(([, ,mcq,vs,short,long],i)=>{
  const u=units[i], [qn,qe,on,oe,k]=mcq;
  const items=[
   [0,'mcq',1,'knowledge',qn,qe,on[k],oe[k],on,oe,'ABCD'[k]],
   [0,'very_short',1,'knowledge',...vs,[],[],''],
   [1,'short',2,'understanding',...short,[],[],''],
   [2,'long',4,'application',...long,[],[],'']
  ];
  return items.map(([t,questionType,marks,cognitiveLevel,questionText,questionTextEn,answer,answerEn,options,optionsEn,correctOption],j)=>({id:u.id+'_q'+j,gradeNumber:9,subject,unitCode:u.unitCode,unitId:u.id,unitTitle:u.unitTitle,topicId:u.id+'_'+t,topicName:u.topics[t],questionType,marks,cognitiveLevel,questionText,questionTextEn,answer,answerEn,options:[...options],optionsEn:[...optionsEn],correctOption,status:'active',bundled:true,teacherReviewRequired:true,officialCdcQuestion:false,sourceStatus:'SMSS_original_draft_not_CDC_published'}));
 });
 return {...empty,units,questions};
}
