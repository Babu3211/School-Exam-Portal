import {CLASS_OPTIONS,EXAM_TERM_OPTIONS,UI_LABELS,NEPALI_MESSAGES} from './smss-ui-language-policy.mjs';
// Reusable English-only class/term options. Never change the persisted V46 value.
const toAscii=v=>String(v??'').replace(/[०-९]/g,d=>String('०१२३४५६७८९'.indexOf(d))).trim();
export function englishClassLabel(value){
 const raw=toAscii(value),s=raw.toLowerCase();
 if(['ecd','nursery','early childhood development'].includes(s))return 'ECD';
 if(['lkg','ukg'].includes(s))return s.toUpperCase();
 const m=raw.match(/^(?:कक्षा\s*|class\s*)?(\d{1,2})$/i);
 if(m&&Number(m[1])>=1&&Number(m[1])<=12)return 'Class '+Number(m[1]);
 return raw;
}
export function englishTermLabel(value){
 const raw=toAscii(value),s=raw.toLowerCase();
 const aliases={'weekly':'Weekly','साप्ताहिक':'Weekly','monthly':'Monthly','मासिक':'Monthly','प्रथम त्रैमासिक':'1st Term','पहिलो त्रैमासिक':'1st Term','दोस्रो त्रैमासिक':'2nd Term','द्वितीय त्रैमासिक':'2nd Term','तेस्रो त्रैमासिक':'3rd Term','तृतीय त्रैमासिक':'3rd Term','अन्तिम':'Final Term','वार्षिक':'Final Term','final':'Final Term','final term':'Final Term','1st term':'1st Term','2nd term':'2nd Term','3rd term':'3rd Term'};
 return aliases[s]||raw;
}
export function makeEnglishOptions(values,kind='class'){
 const label=kind==='term'?englishTermLabel:englishClassLabel;
 return Object.freeze(values.map(value=>Object.freeze({value:String(value),label:label(value)})));
}
export function standardClassOptions(){return makeEnglishOptions(CLASS_OPTIONS)}
export function standardTermOptions(){return makeEnglishOptions(EXAM_TERM_OPTIONS,'term')}
export function applyEnglishSelectLabels(select,kind='class'){
 if(!select||!select.options)throw new TypeError('Select element required');
 const label=kind==='term'?englishTermLabel:englishClassLabel;
 for(const option of select.options){if(option.value)option.textContent=label(option.value)}
 return select;
}
export function nepaliActionNotice(action,context={}){
 if(action==='importConfirm')return NEPALI_MESSAGES.importConfirm(context);
 if(action==='importSuccess')return NEPALI_MESSAGES.importSuccess(context);
 if(!(action in NEPALI_MESSAGES))throw new Error('Unknown notification');
 return NEPALI_MESSAGES[action];
}
export {UI_LABELS};
