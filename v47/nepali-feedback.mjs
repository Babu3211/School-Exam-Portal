// Presentation only. Do not alter persisted data, roles, rules or internal errors.
const errors={
 'auth/invalid-credential':'इमेल वा पासवर्ड मिलेन।','auth/wrong-password':'इमेल वा पासवर्ड मिलेन।','auth/user-not-found':'यो खाता दर्ता भएको छैन।','auth/invalid-email':'मान्य इमेल ठेगाना राख्नुहोस्।','auth/user-disabled':'यो खाता निष्क्रिय छ।','auth/email-already-in-use':'यो इमेल पहिल्यै दर्ता छ।','auth/too-many-requests':'धेरै प्रयास भएका छन्। केही समयपछि पुनः प्रयास गर्नुहोस्।','auth/network-request-failed':'इन्टरनेट जडान जाँचेर पुनः प्रयास गर्नुहोस्।','auth/operation-not-allowed':'यो लगइन विधि सक्षम गरिएको छैन। व्यवस्थापकलाई सम्पर्क गर्नुहोस्।','permission-denied':'यो काम गर्ने अनुमति छैन। आफ्नो विद्यालयको सदस्यता र भूमिका जाँच्नुहोस्।','unavailable':'सेवा हाल उपलब्ध छैन। पुनः प्रयास गर्नुहोस्।','resource-exhausted':'सेवाको प्रयोग सीमा पुगेको छ। व्यवस्थापकलाई सम्पर्क गर्नुहोस्।','failed-precondition':'आवश्यक पूर्वसर्त पूरा भएको छैन। व्यवस्थापकलाई सम्पर्क गर्नुहोस्।','deadline-exceeded':'अनुरोधको समयसीमा सकियो। फेरि प्रयास गर्नुहोस्।','not-found':'खोजिएको विवरण भेटिएन।','already-exists':'यो विवरण पहिल्यै दर्ता छ।','unauthenticated':'पहिले लगइन गर्नुहोस्।'
};
const exact={
 'Settings already exist. No changes made':'छानिएका Term मध्ये कुनैको सेटिङ पहिल्यै छ। कुनै नयाँ सेटिङ सिर्जना गरिएको छैन।',
 'Choose distinct examination terms':'फरक Term हरू मात्र छान्नुहोस्।',
 'School ID must be an IEMIS number string (5–20 digits)':'विद्यालयको IEMIS ID ५–२० अङ्कको हुनुपर्छ।',
 'Valid school name required':'विद्यालयको मान्य नाम राख्नुहोस्।',
 'School unavailable':'विद्यालय उपलब्ध छैन वा सक्रिय छैन। IEMIS ID र विद्यालयको अवस्था जाँच्नुहोस्।',
 'Membership unavailable':'यस विद्यालयमा सक्रिय सदस्यता प्रमाणित भएन। विद्यालयको प्रशासकलाई सम्पर्क गर्नुहोस्।',
 'Sign-in required':'पहिले लगइन गर्नुहोस्।',
 'Authentication changed during verification':'प्रमाणीकरण गर्दा लगइन परिवर्तन भयो। फेरि लगइन गर्नुहोस्।',
 'Cross-school profile rejected':'अर्को विद्यालयको विवरण प्रयोग गर्न मिल्दैन।',
 'Login changed during profile load':'विद्यालयको विवरण लोड गर्दा लगइन परिवर्तन भयो। फेरि लगइन गर्नुहोस्।',
 'School is no longer active':'विद्यालय अब सक्रिय छैन। व्यवस्थापकलाई सम्पर्क गर्नुहोस्।',
 'School not found or access denied':'विद्यालय भेटिएन वा अनुमति छैन।','School is inactive':'विद्यालय निष्क्रिय छ।','School inactive':'विद्यालय निष्क्रिय छ।','No school membership':'यस विद्यालयमा तपाईंको सदस्यता छैन।','Active School Admin membership required':'सक्रिय School Admin सदस्यता आवश्यक छ।','School Admin required':'School Admin अनुमति आवश्यक छ।','School Admin sign-in required':'School Admin बाट लगइन गर्नुहोस्।','Super Admin required':'Super Admin अनुमति आवश्यक छ।','School Admin permission required':'School Admin अनुमति आवश्यक छ।','Enter email and password':'इमेल र पासवर्ड राख्नुहोस्।','Enter a valid subject name and class':'मान्य विषयको नाम र कक्षा राख्नुहोस्।','Check student name, class and roll number':'विद्यार्थीको नाम, कक्षा र रोल नम्बर जाँच्नुहोस्।','Enter every scenario value':'अनुमानका सबै विवरण भर्नुहोस्।','Login expired':'लगइनको समय सकियो। फेरि लगइन गर्नुहोस्।','School membership changed':'विद्यालयको सदस्यता परिवर्तन भएको छ। फेरि लगइन गर्नुहोस्।','School session changed':'विद्यालयको सत्र परिवर्तन भएको छ। फेरि लगइन गर्नुहोस्।','Session changed':'सत्र परिवर्तन भएको छ। फेरि लगइन गर्नुहोस्।'
};
export function neError(error){
 const code=typeof error?.code==='string'?error.code.replace(/^firestore\//,''):'';
 if(Object.hasOwn(errors,code))return errors[code];
 const message=typeof error==='string'?error:error?.message;
 if(typeof message==='string'&&Object.hasOwn(exact,message))return exact[message];
 return 'अनुरोध पूरा भएन। विवरण र अनुमति जाँचेर पुनः प्रयास गर्नुहोस्।';
}
const registry={'Document ID is not a valid IEMIS number':'विद्यालयको ID मान्य IEMIS नम्बर होइन','School ID does not match document ID':'विद्यालयको ID अभिलेखसँग मिलेन','IEMIS code does not match document ID':'IEMIS नम्बर अभिलेखको ID सँग मिलेन','Missing or invalid school name':'विद्यालयको नाम छुटेको वा अमान्य छ','Invalid active status':'सक्रिय अवस्था अमान्य छ','Invalid registry record':'विद्यालयको दर्ता अभिलेख अमान्य छ'};
export const neRegistryIssue=issue=>Object.hasOwn(registry,issue)?registry[issue]:'विद्यालयको विवरण जाँच आवश्यक छ';
