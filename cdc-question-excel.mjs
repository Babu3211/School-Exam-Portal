/**
 * SMSS V46 question bank Excel sheet format.
 * Template and parser are local-only; spreadsheet bytes are never sent to
 * an AI service. Imported questions remain subject to admin and teacher review.
 */
export const QUESTION_EXCEL_FIELDS=Object.freeze([
 ['unitCode','Unit Code'],
 ['unitTitle','Unit Title'],
 ['topicName','Topic'],
 ['questionType','Question Type'],
 ['marks','Marks'],
 ['cognitiveLevel','Cognitive Level'],
 ['questionText','Question (Nepali or English)'],
 ['questionTextEn','Question (English Translation)'],
 ['optionA','Option A'],
 ['optionB','Option B'],
 ['optionC','Option C'],
 ['optionD','Option D'],
 ['optionAEn','Option A (English)'],
 ['optionBEn','Option B (English)'],
 ['optionCEn','Option C (English)'],
 ['optionDEn','Option D (English)'],
 ['correctOption','Correct Option'],
 ['answer','Answer'],
 ['answerEn','Answer (English)'],
 ['sourceTitle','Source Title'],
 ['sourceUrl','Source URL']
]);
const norm=s=>String(s??'').trim();
export function parseQuestionExcelSheet(sheet){
 if(!sheet||typeof sheet.getRow!=='function'||!Number.isSafeInteger(sheet.rowCount))
  throw Error('Excel workbook must contain a Question Bank sheet');
 if(sheet.rowCount<1||sheet.rowCount>502)
  throw Error('Excel sheet may contain at most 500 questions');
 const columns=QUESTION_EXCEL_FIELDS;
 const header=sheet.getRow(1);
 for(let i=0;i<columns.length;i++)
  if(norm(header.getCell(i+1).text)!==columns[i][1])
   throw Error('Excel header mismatch at column '+(i+1)+': '+columns[i][1]);
 const rows=[];
 for(let number=2;number<=sheet.rowCount;number++){
  const row=sheet.getRow(number),out={};
  for(let i=0;i<columns.length;i++){
   const cell=row.getCell(i+1),value=cell.value;
   if(value&&typeof value==='object'&&
     ('formula' in value||'sharedFormula' in value))
    throw Error('Excel formulas are not allowed in question rows (row '+number+')');
   const text=norm(cell.text);
   if(text.length>3000)throw Error('Excel cell too long at row '+number);
   out[columns[i][0]]=text;
  }
  if(Object.values(out).every(s=>!s))continue;
  const options=['optionA','optionB','optionC','optionD'].map(k=>out[k]);
  const optionsEn=['optionAEn','optionBEn','optionCEn','optionDEn'].map(k=>out[k]);
  rows.push({
   unitCode:out.unitCode,unitTitle:out.unitTitle,topicName:out.topicName,
   questionType:out.questionType.toLowerCase(),marks:Number(out.marks),
   cognitiveLevel:out.cognitiveLevel.toLowerCase(),
   questionText:out.questionText,questionTextEn:out.questionTextEn,
   options:options.some(Boolean)?options:[],
   optionsEn:optionsEn.some(Boolean)?optionsEn:[],
   correctOption:out.correctOption.toUpperCase(),answer:out.answer,
   answerEn:out.answerEn,sourceTitle:out.sourceTitle,sourceUrl:out.sourceUrl
  });
 }
 if(!rows.length||rows.length>500)
  throw Error('Excel sheet must contain 1–500 question rows');
 return rows;
}

/**
 * Import ONLY an administrator-transcribed CDC unit grid from Excel.
 * No marks, questions, patterns, or official approval are fabricated here.
 * The caller must independently check the original CDC publication and
 * explicitly approve the grid before saving a blueprint.
 */
export const CDC_GRID_EXCEL_FIELDS=Object.freeze([
 ['unitCode','Unit Code'],
 ['type','Question Type'],
 ['marks','Marks Per Question'],
 ['count','Question Count'],
 ['cognitiveLevel','Cognitive Level']
]);
export function parseCdcGridExcelSheet(sheet){
 if(!sheet||typeof sheet.getRow!=='function'||!Number.isSafeInteger(sheet.rowCount))
  throw Error('A CDC Unit Grid worksheet is required');
 if(sheet.rowCount<1||sheet.rowCount>121)
  throw Error('CDC Grid may contain no more than 120 data rows');
 const header=sheet.getRow(1);
 for(const [i,field]of CDC_GRID_EXCEL_FIELDS.entries()){
  if(norm(header.getCell(i+1).text)!==field[1])
   throw Error('CDC Grid Excel header mismatch at column '+(i+1)+': '+field[1]);
 }
 const rows=[];
 for(let number=2;number<=sheet.rowCount;number++){
  const row=sheet.getRow(number),values=[];
  for(let col=1;col<=CDC_GRID_EXCEL_FIELDS.length;col++){
   const cell=row.getCell(col),raw=cell.value;
   if(raw&&typeof raw==='object'&&('formula' in raw||'sharedFormula' in raw))
    throw Error('CDC Grid Excel formulas are not allowed at row '+number);
   values.push(norm(cell.text));
  }
  if(values.every(v=>!v))continue;
  const [unitCode,type,markText,countText,cognitiveLevel]=values;
  const marks=Number(markText),count=Number(countText);
  if(!/^[0-9]{1,3}$/.test(unitCode)||
     !['mcq','short','long'].includes(type.toLowerCase())||
     !/^[0-9]+$/.test(markText)||!Number.isSafeInteger(marks)||marks<1||marks>100||
     !/^[0-9]+$/.test(countText)||!Number.isSafeInteger(count)||count<1||count>80||
     !['knowledge','understanding','application','higher'].includes(cognitiveLevel.toLowerCase()))
    throw Error('Invalid CDC Grid Excel Unit, Type, Marks, Count or Cognitive Level at row '+number);
  rows.push({unitCode,type:type.toLowerCase(),marks,count,cognitiveLevel:cognitiveLevel.toLowerCase()});
 }
 if(!rows.length||rows.length>120)throw Error('CDC Grid Excel needs 1–120 verified rows');
 return rows;
}
