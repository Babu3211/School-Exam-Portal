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
    const visual=entries.find(x=>x.retrievalEvidence?.primaryVisualReview?.completeTaskMatrixVisuallyChecked===true)?.retrievalEvidence?.primaryVisualReview;
    if(visual?.officialExamApproved===false&&visual.grade9InstructionVisuallyChecked===true){
     status='मूल २०८० कक्षा १० तालिकाका पाँच पृष्ठ प्रमाणित; कक्षा ९ को आधार स्पष्ट, हालको संशोधन र कक्षा ९ अनुकूलन बाँकी';
     add('मूल CDC तालिका — परीक्षणीय पक्ष र अङ्कभार',['क्षेत्र क्र.सं.','परीक्षणीय पक्ष','तह','प्रश्न सङ्ख्या','उत्तर सङ्ख्या','अङ्क','पृष्ठ'],visual.taskRows.map(r=>[r[0],r[1],({K:'ज्ञान',U:'बोध',A:'प्रयोग',HA:'उच्च दक्षता'})[r[2]],...r.slice(3)].map(v=>typeof v==='number'?String(v).replace(/\d/g,d=>'०१२३४५६७८९'[Number(d)]):v)));
     add('मूल तालिकाको संज्ञानात्मक अङ्कभार',['ज्ञान','बोध','प्रयोग','उच्च दक्षता'],[visual.cognitiveMarks.map(v=>String(v).replace(/\d/g,d=>'०१२३४५६७८९'[Number(d)]))]);
     add('कक्षा ९ का लागि मूल निर्देशन',['विवरण'],[['कक्षा १० को तालिकालाई आधार मानी कक्षा ९ का सबै विषयक्षेत्र समेट्ने।'],['प्रश्न बनाउँदा पाठ नदोहोरिने गरी बनाउने।']]);
    }
   }
   if(key==='english'){
    add('Reading and writing marks',['Section','Marks'],[...(evidence.readingMarks||[]).map((n,i)=>['Reading '+(i+1),n]),...(evidence.writingMarks||[]).map((n,i)=>['Writing '+(i+1),n]),['Grammar',evidence.grammar?.total]]);
    const visual=entries.find(s=>s.retrievalEvidence?.primaryVisualReview?.chartVisualReviewComplete===true)?.retrievalEvidence?.primaryVisualReview;
    if(visual?.officialExamApproved===false){
     durationMinutes=visual.durationMinutes;
     status='Original Grades 9–10 English chart visually checked; current edition and Grade 9 model pending';
     add('Original CDC reading chart',['Reading','Text source','Approx. words','Question types','Marks'],visual.reading.map((r,i)=>[i+1,r.seen?'Textbook':'Unseen',r.words,r.types,r.marks]));
     add('Original CDC comprehension distribution',['Type','Items'],[...Object.entries(visual.comprehensionCounts),['Vocabulary (derived)',visual.vocabularyItemsDerived]]);
     add('Original CDC writing chart',['Task','Approx. words','Marks'],visual.writing.map(w=>[w.kind,w.words,w.marks]));
     add('Original CDC grammar areas',['Area'],visual.grammarAreas.map(x=>[x]));
     add('Original CDC chart constraints',['Rule'],[['Vocabulary only in Reading 4'],['Except short answers, avoid repeating question types within the seen pair and within the unseen pair'],['Writing task type must differ from reading text types'],['Contextual grammar MCQs have four options']]);
    }
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
    if(key==='social'&&evidence.cognitiveMatrixTextReview?.officialExamApproved===false){
     const v=evidence.cognitiveMatrixTextReview;
     const ne=n=>String(n).replace(/\d/g,d=>'०१२३४५६७८९'[Number(d)]);
     status=v.primaryVisualReview?.matchedUnitCountCells===90?'२०७८ को पुरानो तालिका: मूल सरकारी PDF को चित्रबाट अङ्कभार मिलेको; २०८२ संशोधित तालिका बाँकी':v.mirrorVisualReview?.matchedUnitCountCells===90?'२०७८ को पुरानो तालिका: मूल PDF को पाठ र प्रतिलिपिको चित्रबाट अङ्कभार मिलेको; २०८२ संशोधित तालिका बाँकी':'२०७८ को पुरानो तालिका: मूल PDF को पाठबाट अङ्कभार मिलेको; चित्र र २०८२ संशोधित तालिका बाँकी';
     if(v.mirrorVisualReview?.matchedUnitCountCells===90)add('प्रतिलिपिको चित्रबाट पुष्टि',['विवरण','नतिजा'],[['प्रश्न सङ्ख्याका कोष','९०'],['कार्यघण्टा','१२८'],['पूर्णाङ्क','७५'],['हालको संशोधित Grid पुष्टि','छैन']]);
     durationMinutes=180;
     add('पुरानो CDC तालिका — प्रश्न सङ्ख्या (ज्ञान/बोध, प्रयोग/सिर्जना, उच्च दक्षता)',['एकाइ','कार्यघण्टा','अति छोटो','छोटो','लामो','अङ्क'],v.unitNames.map((n,i)=>[n,ne(v.workingHours[i]),...[0,3,6].map(k=>v.unitTypeCategoryCounts[i].slice(k,k+3).map(ne).join(' / ')),ne(evidence.unitMarks[i])]));
     add('पुरानो तालिकाको संज्ञानात्मक अङ्कभार',['तह','अङ्क','प्रकाशित प्रतिशत'],v.categoryNames.map((n,i)=>[n,ne(v.cognitiveMarks[i]),ne(v.printedPercentages[i])+'%']));
     add('पुरानो तालिकाका विशेष निर्देशन',['एकाइ','निर्देशन'],[[v.unitNames[5],'लामो प्रश्नमा नक्साको वैकल्पिक प्रश्न'],[v.unitNames[7],'लामो प्रश्न सिर्जनात्मक सिपसँग सम्बन्धित']]);
    }
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
    const visual=entries.find(x=>x.economicsVisualReview?.matchedCells===72)?.economicsVisualReview;
    if(visual?.completeUnitMatrixVerified===true&&visual.officialExamApproved===false){
     status='Original 2082 unit Grid: all 72 count cells visually matched; conflicting prose and current edition review pending';
     add('Original PDF page 1: unit-wise question counts',['Area','Hours','K: V/S/L','U: V/S/L','A: V/S/L','HA: V/S/L','Marks'],e.areas.map((a,i)=>[a[0],visual.workingHours[i],...[0,3,6,9].map(k=>visual.unitLevelTypeCounts[i].slice(k,k+3).join(' / ')),visual.unitMarks[i]]));
    }
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
    const visual=entries.find(x=>x.accountingVisualReview?.completeMergedGroupMatrixVerified===true)?.accountingVisualReview;
    if(visual?.officialExamApproved===false){
     status='Original 2081 Grid: merged unit groups visually matched; current edition and full-document review pending';
     add('Original PDF page 1: grouped question counts',['Units (shared marks)','K: V/S/L','U: V/S/L','A: V/S/L','HA: V/S/L','Marks'],visual.unitGroups.map((g,i)=>[g.map(n=>n+'. '+e.units[n-1][0]).join(' / '),...[0,3,6,9].map(k=>visual.groupLevelTypeCounts[i].slice(k,k+3).join(' / ')),visual.groupMarks[i]]));
     add('Numerical questions (*)',['Units','Level','Type'],visual.starredNumericalQuestions.map(x=>[x.units.join(' / '),x.level,x.type]));
    }
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
    const crosswalk=entries.find(s=>s.environmentTextbookCrosswalk?.contentsVisuallyChecked===true)?.environmentTextbookCrosswalk;
    if(crosswalk?.officialExamApproved===false&&safeUrl(crosswalk.textbookUrl)){
     add('CDC textbook contents (not examination marks)',['Chapter','Title','Printed page'],crosswalk.chapters.map((c,i)=>[i+1,...c]));
     add('School areas vs textbook chapters (tentative topic alignment only)',['School area','Textbook chapter candidate(s)'],crosswalk.schoolAreas.map((name,i)=>[name,crosswalk.candidateChapters[i].join(' / ')]));
     add('Alternative energy textbook references (no separate chapter marks)',['Chapter','Printed page','Evidence'],crosswalk.alternativeEnergyEvidence.map(x=>[x.chapter,x.printedPage,x.description]));
     add('Crosswalk review limitations',['Field','Status'],[['School 2083 source','Indexed text only; direct access unavailable'],['Official chapter-to-grid mapping','Not verified'],['Transfer of periods or marks','Not permitted'],['Complete official Grid','No']]);
    }
   }
  }
  if(key==='health'){
   const h=entries.find(x=>x.healthCurriculumReview?.sourceYear===2082)?.healthCurriculumReview;
   if(h?.officialExamApproved===false){
    fullMarks=h.externalMarks;
    status='Official 2082 curriculum: assessment weights confirmed; separate specification Grid not retrieved';
    add('Curriculum assessment (not question Grid)',['Assessment','Marks'],[['External written assessment',h.externalMarks],['Internal assessment',h.internalMarks]]);
    add('External assessment area weight',['Area','Percent','Derived marks'],h.externalAreas);
    add('Curriculum working hours (not marks)',['Area (English)','Area (Nepali)','Theory hours','Practical hours'],h.units);
    add('Internal assessment components',['Component','Marks'],h.internalComponents);
    add('Practical assessment rubric',['Component','Marks'],h.practicalRubric);
    add('Unresolved Grid details',['Field','Verified'],[['Unit marks','No'],['Question-type counts','No'],['Cognitive mark allocation','No'],['Complete official Grid','No']]);
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
export function renderGrade9GridLibrary(root,register,offeredSubjects=null){
 if(!root)return;
 root.replaceChildren();
 const make=(tag,text,parent)=>{const e=root.ownerDocument.createElement(tag);if(text!==undefined)e.textContent=String(text);if(parent)parent.appendChild(e);return e;};
 make('p','Read-only: current CDC approval and school review are separate from reference tables. No changes to marks, questions or school data.',root);
 if(!register){make('p','Source register not available offline yet. Reopen after loading the portal.',root);return;}
 const offered=Array.isArray(offeredSubjects)?new Set(offeredSubjects.map(cdcSubjectKey)):null;
 const visible=grade9GridLibrary(register).filter(item=>!offered||offered.has(item.key));
 if(offered&&!visible.length)make('p','कक्षा ९ का तोकिएका विषयको Grid उपलब्ध छैन।',root);
 for(const item of visible){
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
