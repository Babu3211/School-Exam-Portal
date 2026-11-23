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
