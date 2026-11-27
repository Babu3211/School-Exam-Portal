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
