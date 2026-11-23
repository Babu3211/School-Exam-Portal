/**
 * CDC grid SOURCE lookup for SMSS V46, school year 2083.
 * An official publication URL is NOT a transcribed/validated mark grid.
 * This module never creates unitGrid rows and cannot auto-approve a blueprint.
 */
const specs=new Set(['specification_grid','specification_grid_and_model_questions',
 'specification_grid_model_questions_and_answer_key']);
const normal=s=>String(s||'').normalize('NFKC').toLocaleLowerCase()
 .replace(/[.,()[\]–—_/-]/g,' ').replace(/\s+/g,' ').trim();
export function cdcSubjectKey(subject){
 const s=normal(subject);
 if(!s)return '';
 if(/(optional|elective|ऐच्छिक|इच्छाधीन)/.test(s)){
  if(/(math|गणित)/.test(s))return 'optional_math';
  if(/(computer|कम्प्युटर|कम्प्यूटर)/.test(s))return 'optional_computer';
  if(/(econom|अर्थशास्त्र)/.test(s))return 'optional_economics';
 }
 if(/(science|विज्ञान)/.test(s))return 'science';
 if(/(social|सामाजिक)/.test(s))return 'social';
 if(/(health|physical|स्वास्थ्य|शारीरिक)/.test(s))return 'health';
 if(/(math|गणित)/.test(s))return 'math';
 if(/(english|अंग्रेजी|अङ्ग्रेजी)/.test(s))return 'english';
 if(/(nepali|नेपाली)/.test(s))return 'nepali';
 if(/(computer|कम्प्युटर|कम्प्यूटर)/.test(s))return 'optional_computer';
 if(/(econom|अर्थशास्त्र)/.test(s))return 'optional_economics';
 if(/(office|account|लेखा|कार्यालय)/.test(s))return 'accounting';
 return '';
}
function eligibleSource(source,grade,key){
 if(!source||!Array.isArray(source.grades)||!source.grades.includes(grade)||
  !specs.has(source.kind)||!key||
  !/^https:\/\/(?:www\.)?moecdc\.gov\.np\//i.test(source.url||''))return false;
 const name=normal(source.subject);
 // Broad multi-subject catalogues and generic grids are NOT specific evidence.
 if(name.includes(' / ')||name.includes('विषयगत पाठ्यक्रम'))return false;
 const sourceKey=cdcSubjectKey(source.subject);
 if(sourceKey!==key)return false;
 // Do not accidentally label an optional subject as compulsory.
 if(['math','english','nepali'].includes(key)&&
  /(optional|elective|ऐच्छिक|इच्छाधीन)/.test(name))return false;
 return true;
}
const score=(s,grade)=>{
 let p=0;
 if(s.grades.length===1)p+=8;
 if(String(s.status||'').includes('official_current'))p+=6;
 if(String(s.status||'').includes('content_not_yet_extracted'))p+=4;
 const y=String(s.version||'').match(/20(?:7[0-9]|8[0-9])/);
 if(y)p+=Number(y[0])-2070;
 if(s.kind==='specification_grid_model_questions_and_answer_key')p+=2;
 return p;
};
export function findCdcGridSources(register,grade,subject){
 if(!Number.isSafeInteger(grade)||grade<6||grade>10)return [];
 const key=cdcSubjectKey(subject);
 const all=Array.isArray(register?.sources)?register.sources:[];
 const results=all.filter(s=>eligibleSource(s,grade,key))
  .map(s=>({grade,subjectKey:key,title:s.subject,sourceUrl:s.url,
   gridVersion:String(s.version||''),sourceStatus:String(s.status||''),
   sourceOnly:true,verifiedGridRows:false,publicationType:s.kind,score:score(s,grade)}))
  .sort((a,b)=>b.score-a.score||a.sourceUrl.localeCompare(b.sourceUrl));
 const seen=new Set();
 return results.filter(s=>{if(seen.has(s.sourceUrl))return false;
  seen.add(s.sourceUrl);return true});
}
