// V47 read-only schema projection of V46 iemis-entry.js; no writes or GPA calculations.
export const V47_IEMIS_TERMS=Object.freeze(['weekly','monthly','1st','2nd','3rd','final']);
export const V46_TERM_MAP=Object.freeze({'1st':'first','2nd':'second','3rd':'third','final':'annual'});
export function iemisComponentPreview(classValue,term,subject=''){
 const klass=String(classValue).trim();
 if(!/^(?:[1-9]|10)$/.test(klass))throw Error('Verified V46 IEMIS component preview is limited to Classes 1–10');
 if(!V47_IEMIS_TERMS.includes(term))throw Error('Unsupported V47 exam term');
 const n=Number(klass);
 if(n<=5)return [{key:'count',name:'No. of Learning Achievement',label:'No. Of Learning Achievement',max:5000},{key:'full',name:'Full Marks',label:'Full Marks',readonly:true},{key:'obtained',name:'Obtained Learning Achievement',label:'Obtained Learning Achievement'}];
 // Weekly/monthly are V47 extensions, not verified IEMIS terms: preview must not imply parity.
 if(!V46_TERM_MAP[term])throw Error('Weekly and Monthly have no verified V46 IEMIS component mapping yet');
 const computer=n>=9&&/computer|कम्प्युटर/i.test(subject);
 const part=n<=8||computer?4:3,practical=n<=8||computer?36:16,termMax=n<=8||computer?10:6;
 const v46term=V46_TERM_MAP[term],annual=v46term==='annual',names={first:'First',second:'Second',third:'Third'};
 return [{key:'participation',name:'Participation',label:`Participation(${part})`,max:part},{key:'practical',name:'Practical/Project',label:`Practical/Project(${practical})`,max:practical},{key:'term',name:annual?'Total of Term':names[v46term]+' Term Examination',label:`${annual?'Total of Term':names[v46term]+' Term Examination'}(${termMax})`,max:termMax},...(annual?[{key:'theory',name:'TH (Theory)',label:`Total of final marks(${n<=8||computer?50:75})`,max:n<=8||computer?50:75}]:[])];
}
