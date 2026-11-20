// V47 read-only field schema adapted from the verified V46 IEMIS entry format.
// No persistence, GPA or grade calculations. Do not treat this as an approved marks writer.
export const V47_IEMIS_TERMS=Object.freeze(['weekly','monthly','1st','2nd','3rd','final']);
export function iemisComponentPreview(classValue,term,subject=''){
 const klass=String(classValue).trim();
 if(!/^(?:[1-9]|10)$/.test(klass))throw Error('Verified V46 IEMIS component preview is limited to Classes 1–10');
 if(!V47_IEMIS_TERMS.includes(term))throw Error('Unsupported V47 exam term');
 const n=Number(klass);
 if(n<=5)return [{key:'count',label:'No. Of Learning Achievement',max:5000},{key:'full',label:'Full Marks (count × 4)',readonly:true},{key:'obtained',label:'Obtained Learning Achievement'}];
 const computer=n>=9&&/computer|कम्प्युटर/i.test(subject);
 const part=n<=8||computer?4:3,practical=n<=8||computer?36:16,termMax=n<=8||computer?10:6;
 // V46 uses the annual/final schema with an additional TH component.
 const annual=term==='final';
 return [{key:'participation',label:'Participation',max:part},{key:'practical',label:'Practical/Project',max:practical},{key:'term',label:annual?'Total of Term':'Term Examination',max:termMax},...(annual?[{key:'theory',label:'Total of final marks',max:n<=8||computer?50:75}]:[])];
}
