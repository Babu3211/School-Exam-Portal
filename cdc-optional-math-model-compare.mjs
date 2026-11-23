/**
 * Model question / grid cross-check, not a copy of copyrighted questions.
 *
 * Grade 10, 2083 publication on the Government CDC site:
 * https://moecdc.gov.np/content/659/class-10th-optional-mathematics-specification-table--model/
 *
 * 2083 PDF text/mark-grid was inspected from a secondary-hosted reproduction:
 * https://aryalsuresh.com.np/wp-content/uploads/2026/06/Class-10-Optional-Mathematics-New-Curriculum-and-Specification-Grid.pdf
 *
 * The original CDC website does not expose a direct PDF link in its
 * machine-readable HTML, so do not label this as an independent direct
 * government PDF verification. Recheck the actual current CDC attachment
 * whenever available. No model question text is stored here.
 */
import {getCdcOptionalMathGuide} from './cdc-optional-math-2082.mjs';
export const CDC_G10_OPTIONAL_MATH_2083_MODEL=Object.freeze({
 gradeNumber:10,subject:'Optional Mathematics',publicationYearBS:2083,
 governmentPublicationUrl:'https://moecdc.gov.np/content/659/class-10th-optional-mathematics-specification-table--model/',
 comparisonCopyUrl:'https://aryalsuresh.com.np/wp-content/uploads/2026/06/Class-10-Optional-Mathematics-New-Curriculum-and-Specification-Grid.pdf',
 sourceConfidence:'secondary_hosted_pdf_copy_official_CDC_listing_confirmed',
 fullMarks:75,durationMinutes:180,
 groupCounts:Object.freeze({objective:11,WCA:12,CCA:4}),
 groupMarks:Object.freeze({objective:11,WCA:40,CCA:24}),
 contentAreaCodes:Object.freeze(['1','2','3','4','5','6']),
 contentAreaMarks:Object.freeze([17,17,20,7,7,7]),
 areaObjectiveCounts:Object.freeze([2,3,3,1,1,1]),
 areaWcaCounts:Object.freeze([3,3,3,1,1,1]),
 cognitivePercent:Object.freeze({knowledge:16,understanding:24,application:40,higher:20}),
 modelNumbering:Object.freeze({objectiveQuestionNumber:1,
  objectiveParts:Object.freeze(['A','B','C','D','E','F','G','H','I','J','K']),
  withinContentQuestionNumbers:Object.freeze([2,3,4,5,6,7,8,9,10,11,12,13]),
  crossContentQuestionNumbers:Object.freeze([14,15,16,17])})
});
export function compareCdc2083MathModelToBundledGrid(){
 const observed=CDC_G10_OPTIONAL_MATH_2083_MODEL;
 const grid=getCdcOptionalMathGuide({grade:10,subject:'Optional Mathematics'});
 const mismatches=[];
 const same=(label,found,expected)=>{
  if(JSON.stringify(found)!==JSON.stringify(expected))
   mismatches.push({label,found,expected});
 };
 same('fullMarks',grid.fullMarks,observed.fullMarks);
 same('durationMinutes',grid.durationMinutes,observed.durationMinutes);
 same('groupCodes',grid.questionGroups.map(x=>x.code),Object.keys(observed.groupCounts));
 same('groupCount',grid.questionGroups.map(x=>x.questionCount),Object.values(observed.groupCounts));
 same('groupMarks',grid.questionGroups.map(x=>x.totalMarks),Object.values(observed.groupMarks));
 same('unitCodes',grid.areas.map(x=>x.unitCode),observed.contentAreaCodes);
 same('unitMarks',grid.areas.map(x=>x.totalMarks),observed.contentAreaMarks);
 same('objectiveByUnit',grid.areas.map(x=>x.objectiveCount),observed.areaObjectiveCounts);
 same('wcaByUnit',grid.areas.map(x=>x.wcaQuestionCount),observed.areaWcaCounts);
 same('cognitionPercent',grid.cognitiveDistribution,observed.cognitivePercent);
 const count=Object.values(observed.groupCounts).reduce((a,b)=>a+b,0);
 const modelNumberCount=observed.modelNumbering.objectiveParts.length+
  observed.modelNumbering.withinContentQuestionNumbers.length+
  observed.modelNumbering.crossContentQuestionNumbers.length;
 same('questionItems',count,modelNumberCount);
 same('numberedMainQuestions',[
  observed.modelNumbering.objectiveQuestionNumber,
  ...observed.modelNumbering.withinContentQuestionNumbers,
  ...observed.modelNumbering.crossContentQuestionNumbers
 ],Array.from({length:17},(_,i)=>i+1));
 return {matches:mismatches.length===0,mismatches,
  comparisonCopyIsGovernmentAttachment:false,
  officialCDCPageVerified:true,gridRowsMatchModelCopy:mismatches.length===0,
  questionItems:count,numberedMainQuestions:17,
  sourceConfidence:observed.sourceConfidence};
}
