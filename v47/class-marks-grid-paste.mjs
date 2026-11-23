// Pure, browser-safe spreadsheet grid paste planner. Never writes Firestore.
// The COMPLETE paste is checked against the current Examination Settings and
// the current rendered class roster before ANY DOM input is modified.
const numberPattern=/^(?:\d+(?:\.\d*)?|\.\d+)$/;
const studentIdPattern=/^[A-Za-z0-9_-]{1,128}$/;
const componentPattern=/^[A-Za-z][A-Za-z0-9_-]{0,63}$/;
export function planClassMarksGridPaste({text,studentRows,components,startRowIndex,startComponentIndex}){
 if(typeof text!=='string'||!text.length||text.length>300_000)
  throw new Error('Clipboard must contain at most 300,000 characters of tab-separated marks');
 if(!Array.isArray(studentRows)||!studentRows.length||studentRows.length>1500)
  throw new Error('Verified class roster required before pasting marks');
 if(!Array.isArray(components)||!components.length||components.length>6)
  throw new Error('Verified Examination Settings required before pasting marks');
 if(!Number.isSafeInteger(startRowIndex)||startRowIndex<0||startRowIndex>=studentRows.length||
    !Number.isSafeInteger(startComponentIndex)||startComponentIndex<0||startComponentIndex>=components.length)
  throw new Error('Paste starting cell is outside current marks grid');
 const uniqueStudents=new Set(),uniqueComponents=new Set();
 for(const row of studentRows){
  if(!row||typeof row.id!=='string'||!studentIdPattern.test(row.id)||
     uniqueStudents.has(row.id)||typeof row.absent!=='boolean')
   throw new Error('Duplicate or invalid student in displayed class roster');
  uniqueStudents.add(row.id);
 }
 for(const c of components){
  if(!c||typeof c.key!=='string'||!componentPattern.test(c.key)||
     uniqueComponents.has(c.key)||typeof c.fullMarks!=='number'||
     !Number.isFinite(c.fullMarks)||c.fullMarks<=0||c.fullMarks>100000)
   throw new Error('Invalid or duplicate Examination Settings component');
  uniqueComponents.add(c.key);
 }
 const clean=text.replace(/\r\n?/g,'\n').replace(/\n+$/,'');
 if(!clean)throw new Error('No marks to paste');
 const lines=clean.split('\n');
 if(startRowIndex+lines.length>studentRows.length)
  throw new Error('Pasted rows extend beyond the current class roster');
 const updates=[];
 for(let r=0;r<lines.length;r++){
  const student=studentRows[startRowIndex+r];
  if(student.absent)throw new Error('Cannot paste into absent student '+student.id);
  const cells=lines[r].split('\t');
  if(startComponentIndex+cells.length>components.length)
   throw new Error('Pasted columns extend beyond configured components at '+student.id);
  for(let k=0;k<cells.length;k++){
   const c=components[startComponentIndex+k],raw=cells[k].trim();
   if(raw!==''&&(!numberPattern.test(raw)||!Number.isFinite(Number(raw))||
      Number(raw)<0||Number(raw)>c.fullMarks))
    throw new Error('Invalid marks for '+student.id+' / '+c.name+': '+raw);
   updates.push(Object.freeze({
    rowIndex:startRowIndex+r,studentId:student.id,
    componentIndex:startComponentIndex+k,componentKey:c.key,value:raw
   }));
  }
 }
 return Object.freeze({updates:Object.freeze(updates),rows:lines.length,cells:updates.length,
  previewOnly:true,writeAuthorized:false,publicationAllowed:false});
}
