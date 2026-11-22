// Explicit subject-level assessment limits; never infer a scale from subject name.
export function validateSubjectMarkLimits(subject,entry){
 const fields=[['theory','theoryFullMarks'],['practical','practicalFullMarks']];
 for(const [scoreKey,limitKey] of fields){
  const raw=subject?.[limitKey];
  if(raw===undefined||raw===null||raw==='')continue; // legacy subjects retain existing behavior
  if(typeof raw!=='number'&&typeof raw!=='string')throw new Error('Invalid Examination Settings full marks: '+limitKey);
  if(typeof raw==='string'&&!/^(?:\\d+(?:\\.\\d+)?|\\.\\d+)$/.test(raw.trim()))throw new Error('Invalid Examination Settings full marks: '+limitKey);
  const limit=Number(raw);
  if(!Number.isFinite(limit)||limit<0)throw new Error('Invalid Examination Settings full marks: '+limitKey);
  if(entry[scoreKey]>limit)throw new Error('Entered '+scoreKey+' marks exceed Examination Settings full marks ('+limit+')');
 }
 return true;
}
