import {v46LowerMathReference} from './primary-assessment-v46-lower-math.mjs';
// Read-only source reference. Never use these theme denominators as IEMIS exam marks.
export const SUBJECTS=Object.freeze([
 ['nepali','Nepali'],['english','English'],['mathematics','Mathematics'],['serophero','Our Surroundings'],
 ['science','Science and Technology'],['socialstudies','Social Studies and Human Values Education'],
 ['healthphysicalcreativeart','Health, Physical Education and Creative Arts'],['hamrodhunibeshi','Mother Tongue or Local Subject']
]);
export function subjectsForGrade(grade){
 if(!['1','2','3','4','5'].includes(String(grade)))throw Error('Class 1–5 required');
 return SUBJECTS.filter(([key])=>Number(grade)<=3?!['science','socialstudies','healthphysicalcreativeart'].includes(key):key!=='serophero');
}
export function assessmentThemeReference({catalogue,grade,subject,year='2083'}){
 grade=String(grade);
 if(year!=='2083'||catalogue?.year!=='2083'||catalogue.sourceBlob!=='b300bc9d51ef3f2e026d9e6a3302d65da3e0979d'||!subjectsForGrade(grade).some(([key])=>key===subject))throw Error('Invalid assessment reference scope');
 const lowerMath=Number(grade)<=3&&subject==='mathematics';
 const list=lowerMath?v46LowerMathReference(grade):catalogue.rows[grade+':'+subject]||[],guideKey=Number(grade)<=3?'lower':'upper';
 const guide=catalogue.guides[guideKey];
 if(!guide||guide.edition!==(guideKey==='lower'?'2076':'2083')||!/^https:\/\//.test(guide.url))throw Error('Invalid guide reference');
 if(!Array.isArray(list)||list.some(r=>r.guide!==guideKey||!Number.isSafeInteger(r.count)||r.count<1||!Number.isSafeInteger(r.fullMarks)||!Number.isSafeInteger(r.page)||r.page<1||r.page>(lowerMath?163:149)||!r.theme))throw Error('Invalid theme reference');
 const seen=new Set();
 for(const r of list){
  if(seen.has(r.theme))throw Error('Duplicate theme');seen.add(r.theme);
  if(subject==='serophero'){
   if(r.status!=='guideCounts'||!Array.isArray(r.groups)||r.groups.length!==r.count||r.groups.some(n=>!Number.isInteger(n)||n<4||n%4)||r.groups.reduce((a,b)=>a+b,0)!==r.indicators||r.fullMarks!==r.indicators||r.scoreBlocks*4!==r.indicators)throw Error('Indicator block mismatch');
  }else if(r.status!==(lowerMath?'v46WorkingReference':'guideMatched')||r.fullMarks!==r.count*4||r.indicators!==null||r.scoreBlocks!==null)throw Error('Guide denominator mismatch');
 }
 return {grade,subject,guide,rows:list.map(r=>({...r,sourceUrl:lowerMath?guide.url:guide.url+'#page='+r.page})),themeCount:list.length,learningAchievements:list.length?list.reduce((n,r)=>n+r.count,0):null,rawFullMarks:list.length?list.reduce((n,r)=>n+r.fullMarks,0):null,indicators:subject==='serophero'&&list.length?list.reduce((n,r)=>n+r.indicators,0):null,scoreBlocks:subject==='serophero'&&list.length?list.reduce((n,r)=>n+r.scoreBlocks,0):null,officialAssessmentApproved:false,writeAuthorized:false};
}
