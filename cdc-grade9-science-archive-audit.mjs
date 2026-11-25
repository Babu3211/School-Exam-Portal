/**
 * Grade 9 Compulsory Science: ARCHIVED 2078 Grid + Model arithmetic audit.
 * NOT confirmed as the applicable school-year-2083 examination Grid.
 *
 * Official archival file listed through the government PDF CDN:
 * https://giwmscdnone.gov.np/media/pdf_upload/RS11167_Specification%20Grid%20%28Grade%209%29%20Compulsory%20Science%20and%20Technology_nk1kpta.pdf
 *
 * Original PDF text was inspected but screenshot request timed out, therefore
 * mark the government PDF as text-verified ONLY. The CDC publication page
 * is dated 2082-05-08, but a distinct revised grid has not been established.
 * The older marks are for comparative audit, NOT
 * to create a CDC Exact 2083 school examination blueprint.
 */
export const ARCHIVED_G9_SCIENCE_2078=Object.freeze({
 grade:9,subject:'Science and Technology',sourceYearBS:2078,
 officialArchiveUrl:'https://giwmscdnone.gov.np/media/pdf_upload/RS11167_Specification%20Grid%20%28Grade%209%29%20Compulsory%20Science%20and%20Technology_nk1kpta.pdf',
 latestCdcPublicationUrl:'https://moecdc.gov.np/content/278/specialization-schedule-class-class-9-science-and/',
 sourceProvenance:'official_gov_pdf_searchable_text_screenshot_timeout',
 current2083Approved:false,oldPdfScreenshotInspected:false,
 fullMarks:75,durationMinutes:180,totalQuestionCount:40,
 groupMarks:Object.freeze([10,19,26,20]),
 // Unit codes 1-19, with original 2078 marks in their correct numerical order.
 unitMarks:Object.freeze([3,3,2,3,8,3,5,2,4,7,6,2,7,6,3,3,2,3,3]),
 unitNames:Object.freeze([
  'Scientific Study','Classification of Living Organisms','Life Cycle',
  'Evolution','Body Structure and Life Processes','Nature and Environment',
  'Force and Motion','Machines','Energy','Waves','Electricity','Universe',
  'Information and Communication Technology','Atomic Structure and Chemical Bond',
  'Chemical Reaction','Gases','Metals and Non-metals',
  'Carbon and Its Compounds','Chemicals Used in Daily Life'
 ]),
 // [count, marks each, [Knowledge, Understanding, Application, Higher] counts]
 groups:Object.freeze([
  Object.freeze({code:'mcq',count:10,marksEach:1,levelCounts:Object.freeze([2,4,2,2])}),
  Object.freeze({code:'very_short',count:9,marksEach:1,levelCounts:Object.freeze([2,4,2,1])}),
  Object.freeze({code:'short',count:14,marksEach:2,levelCounts:Object.freeze([2,3,5,4])}),
  Object.freeze({code:'long',count:7,marksEach:4,levelCounts:Object.freeze([1,2,2,2])})
 ]),
 cognitiveMarks:Object.freeze([12,22,22,19])
});
const sum=xs=>xs.reduce((a,b)=>a+b,0);
export function auditGrade9ScienceArchive({grade,subject}={}){
 const name=String(subject||'').trim().toLocaleLowerCase().replace(/\s+/g,' ');
 if(grade!==9||!/^(science|science and technology|science & technology|general science|विज्ञान|विज्ञान तथा प्रविधि|अनिवार्य विज्ञान(?: तथा प्रविधि)?)$/.test(name))
  return null;
 const data=ARCHIVED_G9_SCIENCE_2078;
 const marksByGroup=data.groups.map(g=>g.count*g.marksEach);
 const levels=[0,1,2,3].map(i=>sum(data.groups.map(g=>g.levelCounts[i]*g.marksEach)));
 const grouped=[
  data.unitMarks[0]+data.unitMarks[12],
  sum(data.unitMarks.slice(1,6)),
  sum(data.unitMarks.slice(6,12)),
  sum(data.unitMarks.slice(13,19))
 ];
 if(sum(marksByGroup)!==75||sum(data.unitMarks)!==75||
  sum(data.groups.map(g=>g.count))!==40||
  JSON.stringify(grouped)!==JSON.stringify(data.groupMarks)||
  JSON.stringify(levels)!==JSON.stringify(data.cognitiveMarks))
   throw Error('Historic Grade9 Science model arithmetic is inconsistent');
 return Object.freeze({
  grade,subject,archivedModel:data,oldModelMarks:marksByGroup,
  oldCognitiveMarks:levels,oldGroupedMarks:grouped,
  publicationFound:true,publicationDateBS:'2082-05-08',ministryRevisionReported:true,revisionEffectiveYearBS:2082,separateRevisedGridConfirmed:false,full2082GridInspected:false,
  currentCdcExactApproved:false,currentQuestionBankVerified:false,
  readyForLive:false,teacherReviewRequired:true,
  note:'2078 CDC government PDF is a historical reference. Ministry Educational Information 2081 reports revision effective 2082, but the revised numerical table has not been retrieved.'
 });
}
