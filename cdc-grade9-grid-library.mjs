/** Read-only Grade 9 Grid library. Sources and reference rows never grant approval. */
import {cdcSubjectKey} from './cdc-grid-source-index.mjs';
import {getBundledComputerGrid} from './cdc-verified-computer-grids.mjs';
import {getCdcOptionalMathGuide} from './cdc-optional-math-2082.mjs';
const subjects=[
 ['nepali','Nepali'],['english','English'],['math','Compulsory Mathematics'],
 ['science','Science and Technology'],['social','Social Studies'],
 ['optional_math','Optional Mathematics'],['optional_computer','Optional Computer Science'],
 ['optional_environment','Environmental Science'],['optional_economics','Economics'],
 ['accounting','Office Operation and Accounting'],['health','Health and Physical Education']
];
const safeUrl=url=>/^https:\/\/(?:moecdc\.gov\.np|www\.moecdc\.gov\.np|lib\.moecdc\.gov\.np|giwmscdnone\.gov\.np|giwmscdntwo\.gov\.np)\//i.test(url||'');
const levels=['knowledge','understanding','application','higher'];
const numbered=(values)=>values.map((marks,i)=>[i+1,marks]);
export function grade9GridLibrary(register){
 const all=Array.isArray(register?.sources)?register.sources:[];
 return subjects.map(([key,subject])=>{
  const entries=all.filter(s=>s.grades?.includes(9)&&cdcSubjectKey(s.subject)===key&&safeUrl(s.url)&&/^(?:historical_)?specification_grid|^curriculum$/.test(s.kind));
  const sources=[...new Map(entries.map(s=>[s.url,{url:s.url,kind:s.kind,version:s.version,status:s.status,note:s.note||''}])).values()];
  const evidence=entries.find(s=>s.retrievalEvidence?.numericReferenceCrosscheck)?.retrievalEvidence?.numericReferenceCrosscheck;
  let status='Official Grid unavailable or not extracted',tables=[],fullMarks=null,durationMinutes=null;
  const add=(title,columns,rows)=>tables.push({title,columns,rows});
  if(key==='optional_math'){
   const m=getCdcOptionalMathGuide({grade:9,subject});fullMarks=m.fullMarks;durationMinutes=m.durationMinutes;
   status='Official structural transcription; teacher review pending';
   add('Question groups',['Group','Count','Marks'],m.questionGroups.map(g=>[g.code,g.questionCount,g.totalMarks]));
   add('Area / cognitive marks',['Area','Objective K/U/A/HA','WCA K/U/A/HA','CCA K/U/A/HA','Total'],m.areas.map(a=>[a.unitTitle,...['objective','WCA','CCA'].map(g=>a.marksByGroup[g].join(' / ')),a.totalMarks]));
   add('Cognitive allocation (%)',['K','U','A','HA'],[levels.map(k=>m.cognitiveDistribution[k])]);
   const textReview=entries.find(x=>x.structuralTextReview)?.structuralTextReview;
   if(textReview){
    status='Original 2082 PDF extracted totals matched; independent complete visual and teacher review pending';
    add('Original PDF text cross-check',['Field','Marks / hours / percentage'],[['Full marks',textReview.fullMarks],['Working hours',textReview.workingHours],['Objective / WCA / CCA',textReview.groupMarks.join(' / ')],['K / U / A / HA (%)',textReview.cognitivePercent.join(' / ')]]);
   }
   const visual=entries.find(x=>x.structuralVisualReview?.matchedCells===72)?.structuralVisualReview;
   if(visual){
    status='Original 2082 Grid: all 72 cells visually matched; current edition and teacher review pending';
    add('Visual source cross-check',['Area','Working hours','WCA question count','Full marks'],m.areas.map((a,i)=>[a.unitTitle,visual.workingHours[i],visual.wcaQuestionCounts[i],visual.unitMarks[i]]));
   }
  }else if(key==='optional_computer'){
   const c=getBundledComputerGrid({grade:9,subject,fullMarks:50});fullMarks=c.fullMarks;durationMinutes=c.durationMinutes;
   status='Official structural transcription; teacher review pending';
   add('Unit-wise grid',['Unit','Level','Question type','Marks each','Count','Total'],c.unitGrid.map(x=>[c.unitNames[Number(x.unitCode)-1],x.cognitiveLevel,x.type,x.marks,x.count,x.marks*x.count]));
   add('Cognitive allocation (%)',['K','U','A','HA'],[levels.map(k=>c.cognitiveDistribution[k])]);
   const visual=entries.find(x=>x.structuralVisualReview?.matchedCells===84)?.structuralVisualReview;
   if(visual){
    status='Original 2082 Grid: all 84 cells visually matched; current edition and teacher review pending';
    add('Visual source cross-check',['Unit','Working hours','Full marks'],c.unitNames.map((n,i)=>[n,visual.workingHours[i],visual.unitMarks[i]]));
   }
  }else if(evidence){
   status=key==='nepali'?'Partial revised marks; complete official verification pending':'Historical/source comparison only; current Grid verification pending';
   fullMarks=evidence.fullMarks||null;durationMinutes=evidence.durationMinutes||null;
   if(key==='nepali'){
    const q=evidence.secondaryCorroboration;
    if(q?.areaMarks)add('Independent 2080 reference — not approved',['Area','Marks'],['शब्दभण्डार','वर्णविन्यास','भाषिक संरचना','पठनबोध','निर्देशित रचना','व्यावहारिक लेखन','बुँदा टिपोट','सारांश','पाठगत बोध','भावविस्तार','समीक्षात्मक उत्तर','निबन्ध'].map((n,i)=>[n,q.areaMarks[i]]));
    if(evidence.extractedTaskMarks)add('Government PDF partial text extraction',['Task','Marks'],Object.entries(evidence.extractedTaskMarks));
    if(q?.cognitiveMarks)add('Independent reference cognitive marks',['K','U','A','HA'],[q.cognitiveMarks]);
   }
   if(key==='english'){
    add('Reading and writing marks',['Section','Marks'],[...(evidence.readingMarks||[]).map((n,i)=>['Reading '+(i+1),n]),...(evidence.writingMarks||[]).map((n,i)=>['Writing '+(i+1),n]),['Grammar',evidence.grammar?.total]]);
   }
   if(key==='english'&&evidence.grammar){
    const g=evidence.grammar;
    add('Historical grammar detail',['Question type','Count','Marks each','Total'],[
     ['Transformation',g.transformationCount,g.transformationMarksEach,g.transformationCount*g.transformationMarksEach],
     ['Contextual MCQ',g.contextualMcqCount,g.contextualMcqMarksEach,g.contextualMcqCount*g.contextualMcqMarksEach]
    ]);
   }
   if(key==='math'&&Number.isSafeInteger(evidence.groupCount)&&Number.isSafeInteger(evidence.subitemCount)){
    add('Historical question structure',['Groups','Subitems','Total marks'],[[evidence.groupCount,evidence.subitemCount,evidence.fullMarks]]);
   }
   if(key==='science'&&Array.isArray(evidence.typeLevelCounts)){
    const types=['MCQ','Very short','Short','Long'];
    add('Historical question count by cognitive level',['Type','K','U','A','HA','Count','Marks each','Total marks'],evidence.typeLevelCounts.map((row,i)=>{
     const count=row.reduce((n,v)=>n+v,0);
     return [types[i],...row,count,evidence.marksEach[i],count*evidence.marksEach[i]];
    }));
   }
   const historical=entries.find(x=>x.historicalVisualReview)?.historicalVisualReview;
   if(key==='math'&&historical){
    add('Historical 2078 visual comparison: cognitive items / marks',['Area','Hours','K items / marks','U items / marks','A items / marks','HA items / marks','Question groups'],['Sets','Arithmetic','Mensuration','Algebra','Geometry','Statistics and Probability','Trigonometry'].map((name,i)=>[name,historical.workingHours[i],...historical.itemCounts[i].map((count,j)=>count+' / '+historical.levelMarks[i][j]),historical.groupCounts[i]]));
   }
   if(key==='science'&&historical){
    add('Historical 2078 visual comparison: unit hours and marks',['Unit','Working hours','Marks'],historical.unitMarks.map((marks,i)=>[i+1,historical.workingHours[i],marks]));
    add('Historical content-group marks',['Group','Marks'],historical.contentGroupMarks.map((marks,i)=>[i+1,marks]));
   }
   if(evidence.unitMarks)add('Historical area/unit marks',['Unit','Marks'],numbered(evidence.unitMarks));
   if(evidence.questionCounts)add('Historical question distribution',['Type','Count','Marks each'],evidence.questionCounts.map((n,i)=>[(key==='science'?['MCQ','Very short','Short','Long']:['Very short','Short','Long'])[i],n,evidence.marksEach[i]]));
   if(evidence.cognitiveMarks)add('Historical cognitive marks',['K','U','A','HA'],[evidence.cognitiveMarks]);
   if(evidence.unitTypeMarks)add('Historical unit/type marks',['Unit','Very short','Short','Long'],evidence.unitTypeMarks.map((row,i)=>[i+1,...row]));
  }else if(key==='optional_economics'){
   const e=entries.find(x=>x.economicsTextReview)?.economicsTextReview;
   if(e&&e.officialExamApproved===false){
    fullMarks=e.fullMarks;durationMinutes=e.durationMinutes;
    status='Official 2082 model and summary text agree; conflicting extracted prose and unit cells need visual review';
    add('Official PDF text: area totals (partial review)',['Area','Marks'],e.areas);
    add('Model and summary question distribution',['Type','Count','Marks each','Total'],e.types.map((type,i)=>[type,e.questionCounts[i],e.marksEach[i],e.questionCounts[i]*e.marksEach[i]]));
    add('Extracted cognitive summary',['Level',...e.types,'Total marks'],e.levelTypeCounts.map((row,i)=>[e.levelNames[i],...row,row.reduce((n,v,j)=>n+v*e.marksEach[j],0)]));
    add('Model alternative questions (one response per question)',['Question number','Unit'],e.alternativeQuestionNumbers.map((n,i)=>[n,e.alternativeUnitNumbers[i]]));
    add('Unresolved source extraction discrepancies',['Field','Extracted notes','Model / summary'],e.extractedProseConflicts);
   }
  }else if(key==='accounting'){
   const e=entries.find(x=>x.accountingTextReview)?.accountingTextReview;
   if(e&&e.officialExamApproved===false){
    fullMarks=e.fullMarks;durationMinutes=e.durationMinutes;
    status='Official 2081 PDF model and summary text confirmed; complete unit/cognitive cells need visual review';
    add('Official PDF text: topic working hours (not unit marks)',['Topic','Working hours'],e.units);
    add('Model and summary question distribution',['Type','Count','Marks each','Total'],e.types.map((type,i)=>[type,e.questionCounts[i],e.marksEach[i],e.questionCounts[i]*e.marksEach[i]]));
    add('Model alternative questions',['Question number','One response required'],e.modelAlternativeQuestionNumbers.map(n=>[n,'Yes']));
    add('Extracted specification rules',['Rule','Value'],[['Maximum short alternatives',e.maxShortAlternatives],['Maximum long alternatives',e.maxLongAlternatives],['Knowledge maximum (%)',e.knowledgeMaxPercent],['Higher ability minimum (%)',e.higherAbilityMinPercent],['Long alternatives same numerical/theoretical nature',e.longAlternativeSameNature?'Yes':'No']]);
    if(safeUrl(e.textSourceUrl)&&!sources.some(x=>x.url===e.textSourceUrl))sources.push({url:e.textSourceUrl,kind:'specification_grid',version:'2081',status:'Alternative government CDN text source; image inspection pending',note:'Question structure confirmed from model and summary. Merged unit marks not inferred from text.'});
   }
  }else if(key==='optional_environment'){
   fullMarks=75;durationMinutes=135;status='Official curriculum only; Grade 9 exact Grid unavailable';
   add('Curriculum assessment',['Theory','Practical','Written time (min)'],[[75,25,135]]);
   const school=entries.find(s=>s.schoolSyllabus2080Evidence)?.schoolSyllabus2080Evidence;
   if(school?.sourceType==='third_party_school_syllabus_text'&&school.officialCdcSource===false&&school.officialExamApproved===false){
    status='Official curriculum + non-official school pattern; Grade 9 exact Grid unavailable';
    add('School syllabus 2080: scored questions only (not CDC Grid)',['Type','Count','Marks each','Total'],school.types.map((type,j)=>[type,school.questionCounts[j],school.marksEach[j],school.questionCounts[j]*school.marksEach[j]]));
    add('School syllabus periods — not marks or textbook chapter mapping',['School unit','Periods'],school.periods.map((n,j)=>[j+1,n]));
    add('School syllabus alternatives — not implemented in reference drafts',['Type','School unit','Topic'],school.alternativeRules.map(a=>[a.type,a.sourceUnit,a.topic]));
    add('Unresolved source differences',['Field','Value'],[['School syllabus units',school.sourceUnitCount],['Portal textbook units',school.portalTextbookUnitCount],['Verified unit mapping','No'],['Complete official Grid','No']]);
   }
  }
  if(key==='science'){
   const school=entries.find(x=>x.schoolScreenshotEvidence)?.schoolScreenshotEvidence;
   if(school?.sourceType==='user_supplied_school_grid_screenshot'&&school.yearBS===2079&&school.officialCdcSource===false&&school.officialExamApproved===false){
    add('BESS 2079 school screenshot — not current CDC Grid',['Source row','Area','Unit','Portal textbook unit','Marks'],school.units.map(u=>[u.sourceRow,u.area,u.title,u.portalUnit,u.marks]));
    add('BESS 2079 group-wise weightage',['Area','Marks'],Object.entries(school.areaMarks));
    add('BESS 2079 question counts by cognitive level',['Type','K','U','A','HA','Marks each'],school.questionTypes.map((type,i)=>[type,...school.typeLevelCounts[i],school.marksEach[i]]));
   }
  }
  const revision=entries.find(x=>x.revisionNoticeEvidence?.effectiveSchoolYear===2082)?.revisionNoticeEvidence;
  if(['science','math'].includes(key)&&revision&&safeUrl(revision.url)&&revision.revisedNumericalGridRetrieved===false){
   status='Historical 2078 Grid; Ministry reports revision effective 2082; revised table not retrieved';
   add('Ministry revision notice (not a specification Grid)',['Effective year','Open-ended questions reported','Revised numerical table retrieved'],[[revision.effectiveSchoolYear,revision.openEndedQuestionsReported?'Yes':'Not recorded','No']]);
   if(!sources.some(x=>x.url===revision.url))sources.push({url:revision.url,kind:'revision_notice',version:'Educational Information 2081',status:'Revision notice only; not numerical Grid approval',note:'Ministry publication reports revision effective school year 2082. Printed page '+revision.printedPage+'. The revised unit and cognitive marks remain unavailable.'});
  }
  return {key,subject,status,fullMarks,durationMinutes,tables,sources,currentCdcExactApproved:false,readyForLive:false};
 });
}
export function renderGrade9GridLibrary(root,register){
 if(!root)return;
 root.replaceChildren();
 const make=(tag,text,parent)=>{const e=root.ownerDocument.createElement(tag);if(text!==undefined)e.textContent=String(text);if(parent)parent.appendChild(e);return e;};
 make('p','Read-only: current CDC approval and school review are separate from reference tables. No changes to marks, questions or school data.',root);
 if(!register){make('p','Source register not available offline yet. Reopen after loading the portal.',root);return;}
 for(const item of grade9GridLibrary(register)){
  const section=make('details',undefined,root);
  make('summary',item.subject+' — '+item.status,section);
  if(item.fullMarks!==null)make('p','Full marks: '+item.fullMarks+(item.durationMinutes!==null?' | Minutes: '+item.durationMinutes:''),section);
  for(const table of item.tables){
   make('h4',table.title,section);
   const wrap=make('div',undefined,section);wrap.className='qp-table-wrap';
   const el=make('table',undefined,wrap);el.className='qp-table';
   const head=make('tr',undefined,make('thead',undefined,el));
   table.columns.forEach(c=>make('th',c,head));
   const body=make('tbody',undefined,el);
   table.rows.forEach(row=>{const tr=make('tr',undefined,body);row.forEach(c=>make('td',c??'—',tr));});
  }
  if(!item.tables.length)make('p','No verified numerical table available. Do not infer missing rows.',section);
  for(const src of item.sources){
   const p=make('p',undefined,section);
   const link=make('a',src.kind==='curriculum'?'CDC curriculum (not Grid)':src.kind==='revision_notice'?'Ministry revision notice (not Grid)':src.url.toLowerCase().endsWith('.pdf')?'Open original PDF':'Open CDC source',p);
   link.href=src.url;link.target='_blank';link.rel='noopener noreferrer';
   make('span',' — '+src.version+' · '+src.status,p);
   if(src.note)make('p',src.note,section);
  }
  if(!item.sources.length)make('p','No subject-specific official source registered.',section);
 }
}
