// Normalize marks to a percentage irrespective of the configured full-mark scale.
// This does not assign CDC grades or GPA; those require separately verified policy.
export function calculateConfiguredPercentage(subject,entry){
 if(!subject||!entry)throw new TypeError('Subject and marks required');
 const fields=[['theory','theoryFullMarks'],['practical','practicalFullMarks']];
 let obtained=0,full=0;
 for(const [scoreKey,limitKey] of fields){
  const raw=subject[limitKey];
  if(raw===undefined||raw===null||raw==='')throw new Error('Examination Settings full marks required: '+limitKey);
  if((typeof raw!=='number'&&typeof raw!=='string')||(typeof raw==='string'&&!/^(?:\\d+(?:\\.\\d+)?|\\.\\d+)$/.test(raw.trim())))throw new Error('Invalid full marks: '+limitKey);
  const limit=Number(raw),score=entry[scoreKey];
  if(!Number.isFinite(limit)||limit<0||typeof score!=='number'||!Number.isFinite(score)||score<0||score>limit)throw new Error('Invalid or over-limit marks: '+scoreKey);
  obtained+=score;full+=limit;
 }
 if(full<=0)throw new Error('Total full marks must be greater than zero');
 return {obtainedMarks:obtained,fullMarks:full,percentage:obtained/full*100};
}
