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
