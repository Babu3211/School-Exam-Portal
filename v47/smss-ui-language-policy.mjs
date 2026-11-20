// Shared SMSS V46/V47 UI language policy.
// UI controls and data headings: English. User-facing guidance: Nepali.
export const UI_LANGUAGE_POLICY=Object.freeze({controls:'en',options:'en',headings:'en',notifications:'ne',confirmations:'ne',instructions:'ne'});
export const CLASS_OPTIONS=Object.freeze(['ECD','LKG','UKG',...Array.from({length:12},(_,i)=>'Class '+(i+1))]);
export const EXAM_TERM_OPTIONS=Object.freeze(['Weekly','Monthly','1st Term','2nd Term','3rd Term','Final Term']);
export const UI_LABELS=Object.freeze({students:'Students Details',staff:'Teacher/Staff Details',class:'Class',section:'Section',exam:'Exam',term:'Term',search:'Search',import:'Import Excel',preview:'Import Preview',save:'Save',delete:'Delete',cancel:'Cancel',confirm:'Confirm'});
export const NEPALI_MESSAGES=Object.freeze({
 importConfirm:({count})=>`नयाँ विद्यार्थी ${count} जना आयात गर्ने हो? पुराना विद्यार्थी, प्राप्ताङ्क र हाजिरी परिवर्तन हुने छैनन्।`,
 importSuccess:({count})=>`${count} जना विद्यार्थी सफलतापूर्वक आयात भए।`,
 importFailed:'विद्यार्थी आयात हुन सकेन। विवरण जाँच गरी पुनः प्रयास गर्नुहोस्।',
 duplicate:'यो विद्यार्थीको विवरण पहिल्यै दर्ता भएको छ।',
 schoolMismatch:'Excel मा भएको विद्यालयको IEMIS नम्बर हालको विद्यालयसँग मिलेन।',
 deleteConfirm:'के तपाईं यो विवरण हटाउन निश्चित हुनुहुन्छ?',
 deleteSecondConfirm:'यो कार्य फिर्ता गर्न नसकिन सक्छ। फेरि पुष्टि गर्नुहोस्।',
 saved:'विवरण सफलतापूर्वक सुरक्षित भयो।',
 required:'आवश्यक विवरण पूरा गर्नुहोस्।'
});
export function uiLanguageFor(kind){return ['notification','confirmation','instruction','error','warning','success'].includes(kind)?'ne':'en'}
