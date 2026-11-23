/**
 * CDC ORIGINAL Grade 9/10 Optional Computer Science Specification Grids.
 * Transcribed from the original government PDF first-page tables, with
 * question type, marks, cognitive level and unit numbers rechecked against
 * both the unit totals and the published 20/30/30/20 domain distribution.
 * School teachers must still review each generated paper and answer key.
 *
 * IMPORTANT: This is NOT for computer engineering, general ICT or other subjects.
 * No Firestore records are created or overwritten by this module.
 */
import {aggregateExactCdcGrid,validateExactCdcUnitGrid} from './cdc-exact-grid.mjs';
const official={
 9:{
  "unitNames": [
    "Computer System",
    "Number System",
    "Block Programming",
    "Web Technology",
    "Internet and Social Media",
    "Digital Citizenship and Cyber Security",
    "Programming Concept (Python)"
  ],
  "sourceUrl": "https://giwmscdnone.gov.np/media/pdf_upload/2082-04-29%20Specification%20grid%20and%20Model%20Questions-Computer%20Science%20Grade%209_khtkxrc.pdf",
  "curriculumVersion": "2082-04-29 Computer Science Grade 9",
  "unitRows": [
    [
      1,
      "knowledge",
      "mcq",
      1,
      1
    ],
    [
      1,
      "knowledge",
      "long",
      4,
      1
    ],
    [
      1,
      "understanding",
      "short",
      2,
      1
    ],
    [
      1,
      "application",
      "mcq",
      1,
      1
    ],
    [
      1,
      "application",
      "short",
      2,
      1
    ],
    [
      1,
      "higher",
      "mcq",
      1,
      1
    ],
    [
      2,
      "understanding",
      "short",
      2,
      1
    ],
    [
      2,
      "application",
      "short",
      2,
      1
    ],
    [
      3,
      "knowledge",
      "mcq",
      1,
      1
    ],
    [
      3,
      "understanding",
      "long",
      4,
      1
    ],
    [
      4,
      "understanding",
      "mcq",
      1,
      1
    ],
    [
      4,
      "application",
      "mcq",
      1,
      1
    ],
    [
      4,
      "application",
      "short",
      2,
      1
    ],
    [
      4,
      "higher",
      "long",
      4,
      1
    ],
    [
      5,
      "knowledge",
      "mcq",
      1,
      1
    ],
    [
      5,
      "understanding",
      "short",
      2,
      1
    ],
    [
      5,
      "higher",
      "short",
      2,
      1
    ],
    [
      6,
      "understanding",
      "long",
      4,
      1
    ],
    [
      6,
      "higher",
      "mcq",
      1,
      1
    ],
    [
      7,
      "knowledge",
      "mcq",
      1,
      1
    ],
    [
      7,
      "knowledge",
      "short",
      2,
      1
    ],
    [
      7,
      "application",
      "mcq",
      1,
      1
    ],
    [
      7,
      "application",
      "short",
      2,
      1
    ],
    [
      7,
      "application",
      "long",
      4,
      1
    ],
    [
      7,
      "higher",
      "short",
      2,
      1
    ]
  ]
},
 10:{
  "unitNames": [
    "Computer Network and Communication",
    "Database Management System",
    "Multimedia",
    "Programming in Python",
    "AI and Contemporary Technologies"
  ],
  "sourceUrl": "https://giwmscdnone.gov.np/media/pdf_upload/Computer%20Science%20grid_9080yt7.pdf",
  "curriculumVersion": "CDC Grade 10 Computer Science - official published grid",
  "unitRows": [
    [
      1,
      "knowledge",
      "mcq",
      1,
      1
    ],
    [
      1,
      "understanding",
      "mcq",
      1,
      1
    ],
    [
      1,
      "understanding",
      "short",
      2,
      1
    ],
    [
      1,
      "understanding",
      "long",
      4,
      1
    ],
    [
      1,
      "application",
      "mcq",
      1,
      1
    ],
    [
      1,
      "application",
      "short",
      2,
      1
    ],
    [
      2,
      "knowledge",
      "mcq",
      1,
      1
    ],
    [
      2,
      "knowledge",
      "short",
      2,
      1
    ],
    [
      2,
      "knowledge",
      "long",
      4,
      1
    ],
    [
      2,
      "application",
      "mcq",
      1,
      1
    ],
    [
      3,
      "knowledge",
      "mcq",
      1,
      1
    ],
    [
      3,
      "understanding",
      "short",
      2,
      1
    ],
    [
      3,
      "understanding",
      "long",
      4,
      1
    ],
    [
      3,
      "application",
      "mcq",
      1,
      1
    ],
    [
      4,
      "knowledge",
      "mcq",
      1,
      1
    ],
    [
      4,
      "application",
      "short",
      2,
      2
    ],
    [
      4,
      "application",
      "long",
      4,
      1
    ],
    [
      4,
      "higher",
      "mcq",
      1,
      1
    ],
    [
      4,
      "higher",
      "short",
      2,
      1
    ],
    [
      5,
      "understanding",
      "short",
      2,
      1
    ],
    [
      5,
      "application",
      "short",
      2,
      1
    ],
    [
      5,
      "higher",
      "mcq",
      1,
      1
    ],
    [
      5,
      "higher",
      "short",
      2,
      1
    ],
    [
      5,
      "higher",
      "long",
      4,
      1
    ]
  ]
}
};
export function isCdcComputerSubject(subject){
 const text=String(subject||'').trim().toLocaleLowerCase().normalize('NFKC');
 if(!text||/(engineering|hardware|इन्जिनियरिङ|सिभिल|networking\s+only)/i.test(text))return false;
 if(/^(computer|computer science|optional computer|optional computer science|elective computer|elective computer science)$/i.test(text))return true;
 return /(computer science|optional computer|elective computer|कम्प्युटर विज्ञान|कम्प्यूटर विज्ञान|ऐच्छिक कम्प्युटर|ऐच्छिक कम्प्यूटर|कम्प्युटर साइन्स|कम्प्यूटर साइन्स)/i.test(text);
}
function makeGrid(gradeNumber){
 const source=official[gradeNumber];
 const unitGrid=source.unitRows.map(([unitCode,cognitiveLevel,type,marks,count])=>
  ({unitCode:String(unitCode),cognitiveLevel,type,marks,count}));
 const calculation=aggregateExactCdcGrid(unitGrid);
 if(calculation.fullMarks!==50||calculation.questionCount!==25||
  ['knowledge','understanding','application','higher'].some(
   (k,i)=>Math.abs(calculation.distribution[k]-[20,30,30,20][i])>0.001))
  throw Error('Bundled CDC Computer Science source grid integrity check failed');
 const blueprint={
  gradeNumber,subject:'Computer Science',fullMarks:50,durationMinutes:120,
  pattern:calculation.pattern,unitGrid,
  cognitiveDistribution:calculation.distribution,
  unitNames:[...source.unitNames],sourceUrl:source.sourceUrl,
  sourceTitle:'CDC Computer Science Grade '+gradeNumber+' Specification Grid',
  curriculumVersion:source.curriculumVersion,
  verifiedBy:'Original CDC PDF transcription cross-check (SMSS development)',
  originalGovernmentPdf:true,schoolReviewRequired:true,
  active:true,gridOrigin:'bundled_official_cdc_pdf',
  subjectScope:'Optional Computer Science, not Computer Engineering'
 };
 // Strict grid validation: all 50 marks, every unit/slot and aggregate row.
 validateExactCdcUnitGrid(blueprint,50,{gradeNumber});
 return Object.freeze(blueprint);
}
export const bundledComputerGrid9=makeGrid(9);
export const bundledComputerGrid10=makeGrid(10);
export function getBundledComputerGrid({grade,subject,fullMarks}){
 if(![9,10].includes(grade)||Number(fullMarks)!==50||
    !isCdcComputerSubject(subject))return null;
 const grid=grade===9?bundledComputerGrid9:bundledComputerGrid10;
 return {...grid,subject,unitGrid:grid.unitGrid.map(r=>({...r})),
  pattern:grid.pattern.map(r=>({...r})),
  cognitiveDistribution:{...grid.cognitiveDistribution}};
}
export function bundledComputerUnitTopics(grade,subject){
 const grid=getBundledComputerGrid({grade,subject,fullMarks:50});
 if(!grid)return [];
 return grid.unitNames.map((unitTitle,i)=>({
  id:'cdc_official_computer_g'+grade+'_u'+(i+1),
  unitCode:String(i+1),unitTitle,topics:[unitTitle],
  sourceTitle:grid.sourceTitle,sourceUrl:grid.sourceUrl,
  provenance:'CDC official specification grid - unit names'
 }));
}
