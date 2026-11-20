// Read-only V47 projection of V46 iemisEntryValues. No Firestore writes.
const rawNumber=value=>value===null||value===undefined||String(value).trim()===''?null:Number(value);
export function previewIemisEntryValues(schema,draft){
 if(draft.incompatible)throw new Error('This record has custom assessment components. Use the original single-subject view; existing scores were not replaced.');
 const primary=schema[0].key==='count';
 if(primary){
  const count=rawNumber(draft.values.count),got=rawNumber(draft.values.obtained);
  if(!draft.isAbsent&&count===null&&got===null)return null;
  if(count!==null&&(!Number.isInteger(count)||count<0||count>5000))throw new Error('No. of Learning Achievement must be a whole number from 0 to 5000.');
  if(!draft.isAbsent&&(count===null||got===null))throw new Error('Enter both the learning-achievement count and obtained marks.');
  const n=count??0,full=n*4;
  if(!draft.isAbsent&&(!Number.isInteger(got)||got<0||got>full))throw new Error(`Obtained Learning Achievement must be from 0 to ${full}.`);
  return {assessmentType:'learning-achievement',isAbsent:draft.isAbsent,scores:[
   {name:schema[0].name,fullMarks:n,obtained:draft.isAbsent?null:n},
   {name:schema[1].name,fullMarks:full,obtained:null},
   {name:schema[2].name,fullMarks:full,obtained:draft.isAbsent?null:got}
  ],totalFullMarks:full,totalObtained:draft.isAbsent?0:got};
 }
 const scores=schema.map(c=>{const v=rawNumber(draft.values[c.key]);if(!draft.isAbsent&&v!==null&&(!Number.isFinite(v)||v<0||v>c.max))throw new Error(`${c.label}: enter a mark from 0 to ${c.max}.`);return {name:c.name,fullMarks:c.max,obtained:draft.isAbsent?null:v};});
 if(!draft.isAbsent&&scores.every(s=>s.obtained===null))return null;
 return {assessmentType:'marks',isAbsent:draft.isAbsent,scores,totalFullMarks:scores.reduce((a,s)=>a+s.fullMarks,0),totalObtained:scores.reduce((a,s)=>a+(s.obtained??0),0)};
}
