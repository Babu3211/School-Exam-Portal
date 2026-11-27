import {validAssessmentDate2083} from './assessment-date-2083.mjs';
// CDC 2083 upper-primary guide, printed pp. 14–15: sum / (4 * assessed outcomes).
// Separate stage previews only: no assumed regular/remedial merge or final grade.
export function assessmentStagePercentage(ratings){
 if(typeof ratings!=='string'||!ratings.length||!/^[1-4_]+$/.test(ratings))throw Error('Invalid achievement ratings');
 const assessed=[...ratings].filter(v=>v!=='_'),sum=assessed.reduce((n,v)=>n+Number(v),0),count=assessed.length;
 return Object.freeze({sum,count,expected:ratings.length,denominator:count*4,percentage:count?sum/(count*4)*100:null});
}
export function formatAssessmentStagePercentage(s,ne=false){
 const digits=v=>ne?String(v).replace(/[0-9]/g,d=>'०१२३४५६७८९'[Number(d)]):String(v);
 return digits(s.count)+' / '+digits(s.expected)+(ne?' उपलब्धि':' assessed')+' · '+(s.percentage===null?'—':digits(s.sum)+' / '+digits(s.denominator)+' = '+digits(s.percentage.toFixed(2))+'%');
}

// V46 subject-summary review convention, NOT a CDC-certified stage-selection rule.
export function reviewCombinedAchievement(regular,support){
 assessmentStagePercentage(regular);assessmentStagePercentage(support);
 if(regular.length!==support.length)throw Error('Mismatched assessment stages');
 const effective=[...regular].map((v,i)=>support[i]!=='_'?support[i]:v).join('');
 const result=assessmentStagePercentage(effective);
 return Object.freeze({...result,complete:result.count===result.expected,grade:result.count===result.expected?upperAssessmentGrade(result.percentage):null});
}
// Printed CDC 2083 p.15. Grade is only for an explicitly complete review.
export function upperAssessmentGrade(percent){
 if(typeof percent!=='number'||!Number.isFinite(percent)||percent<0||percent>100)throw Error('Invalid achievement percentage');
 const [min,letter,point]=[[90,'A+',4],[80,'A',3.6],[70,'B+',3.2],[60,'B',2.8],[50,'C+',2.4],[40,'C',2],[35,'D',1.6],[0,'NG',null]].find(([min])=>percent>=min);
 return Object.freeze({letter,point});
}
export function formatCombinedAchievement(result,ne=false){
 const label=ne?'संयुक्त समीक्षा (V46 सारांश)':'Combined review (V46 summary)';
 return label+': '+formatAssessmentStagePercentage(result,ne)+' · '+(result.grade?result.grade.letter:(ne?'ग्रेड बाँकी':'Grade pending'));
}

// Annual review comparison uses the V46 annual chronological convention.
// V47 draft storage does not preserve per-row creation timestamps. Equal-date
// conflicting ratings therefore remain unresolved, rather than guessing.
export function reviewAnnualAchievement(regular,support,count){
 if(!Number.isInteger(count)||count<1||count>500)throw Error('Invalid annual review count');
 const values=d=>{if(!d)return '_'.repeat(count);assessmentStagePercentage(d.ratings);if(d.ratings.length!==count)throw Error('Mismatched annual review ratings');return d.ratings};
 const r=values(regular),s=values(support),date=(d,i)=>{const v=d.rowDates?.slice(i*10,i*10+10)||d.date;if(!validAssessmentDate2083(v))throw Error('Invalid annual review date');return v};
 let conflicts=0,different=0;
 const effective=[...r].map((v,i)=>{const w=s[i];if(v==='_')return w;if(w==='_')return v;const a=date(regular,i),b=date(support,i);if(a===b&&v!==w){conflicts++;return '_'}const selected=a>b?v:w;if(selected!==w)different++;return selected}).join('');
 const result=assessmentStagePercentage(effective),complete=result.count===count&&conflicts===0;
 return Object.freeze({...result,conflicts,different,complete,grade:complete?upperAssessmentGrade(result.percentage):null});
}
export function formatAnnualAchievement(result){return 'Annual date-order review: '+formatAssessmentStagePercentage(result)+' · '+(result.grade?.letter??'Grade pending')+' · '+result.conflicts+' unresolved same-date conflicts · '+result.different+' differences from stage-priority review';}

// CDC 2076 PDF pp.10,14: lower-primary letters are not upper-primary GPA.
// Annex 2 resolves the D interval; exactly 90 is not explicitly covered.
export function lowerAssessmentGrade(sum,count){
 if(!Number.isInteger(count)||count<1||!Number.isInteger(sum)||sum<0||sum>4*count)throw Error('Invalid lower assessment score');
 const n=sum*100,d=count*4;
 return n===90*d?null:n>90*d?'A*':n>=75*d?'A':n>=60*d?'B':n>=45*d?'C':n>=30*d?'D':'E';
}
// Compare complete regular/remedial blocks only. Never fill missing indicators
// from the other stage. Date-order versus remedial preference disagreements
// and partially entered peer blocks with complete evidence require review.
export function reviewLowerAchievement(regular,support,count,binary=false){
 if(!Number.isInteger(count)||count<1||count>500)throw Error('Invalid lower assessment count');
 const width=binary?4:1,pattern=binary?/^[01_]+$/:/^[1-4_]+$/;
 const values=d=>{if(!d)return '_'.repeat(count*width);if(typeof d.ratings!=='string'||d.ratings.length!==count*width||!pattern.test(d.ratings))throw Error('Invalid lower assessment ratings');return d.ratings};
 const r=values(regular),s=values(support);
 const date=(d,i)=>{const v=d.rowDates?.slice(i*10,i*10+10)||d.date;if(!validAssessmentDate2083(v))throw Error('Invalid lower assessment date');return v};
 let sum=0,assessed=0,conflicts=0,partial=0,different=0;
 for(let i=0;i<count;i++){
  const raw=[r.slice(i*width,(i+1)*width),s.slice(i*width,(i+1)*width)];
  const score=v=>v.includes('_')?null:[...v].reduce((n,x)=>n+Number(x),0);
  const [a,b]=raw.map(score);
  if(raw.some(v=>v.includes('_')&&/[^_]/.test(v))){partial++;continue}
  if(a===null&&b===null)continue;
  let chosen=a??b;
  if(a!==null&&b!==null){const x=date(regular,i),y=date(support,i);if(x===y&&a!==b){conflicts++;continue}chosen=x>y?a:b;if(chosen!==b)different++}
  sum+=chosen;assessed++;
 }
 return Object.freeze({sum,count:assessed,expected:count,conflicts,partial,different});
}
export function summarizeLowerAchievement(themes){
 if(!Array.isArray(themes)||!themes.length)throw Error('Missing lower assessment themes');
 const expected=themes.reduce((n,t)=>n+t.expected,0),available=themes.filter(t=>t.review!==null),total=k=>available.reduce((n,t)=>n+t.review[k],0);
 const count=total('count'),sum=total('sum'),conflicts=total('conflicts'),partial=total('partial'),different=total('different'),unavailable=themes.length-available.length;
 const complete=expected>0&&count===expected&&!conflicts&&!partial&&!different&&!unavailable;
 return Object.freeze({sum,count,expected,conflicts,partial,different,unavailable,percentage:count?sum/(4*count)*100:null,complete,grade:complete?lowerAssessmentGrade(sum,count):null});
}
