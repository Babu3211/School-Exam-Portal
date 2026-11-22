// Explicit subject-level assessment limits; never infer a scale from subject name.
export function validateSubjectMarkLimits(subject,entry){
 if(!subject||typeof subject!=='object'||!entry||typeof entry!=='object')throw new TypeError('Subject and mark entry required');
 const fields=[['theory','theoryFullMarks'],['practical','practicalFullMarks']];
 for(const [scoreKey,limitKey] of fields){
  const raw=subject?.[limitKey];
  if(raw===undefined)continue; // legacy subjects without this field retain existing behavior
  if(raw===null||raw==='')throw new Error('Invalid Examination Settings full marks: '+limitKey);
  if(typeof raw!=='number'&&typeof raw!=='string')throw new Error('Invalid Examination Settings full marks: '+limitKey);
  if(typeof raw==='string'&&!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(raw.trim()))throw new Error('Invalid Examination Settings full marks: '+limitKey);
  const limit=Number(raw);
  if(!Number.isFinite(limit)||limit<0)throw new Error('Invalid Examination Settings full marks: '+limitKey);
  const score=entry[scoreKey];
  if(typeof score!=='number'||!Number.isFinite(score)||score<0)throw new Error('Invalid entered '+scoreKey+' marks');
  if(score>limit)throw new Error('Entered '+scoreKey+' marks exceed Examination Settings full marks ('+limit+')');
 }
 return true;
}
