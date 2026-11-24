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
  }else if(key==='optional_computer'){
   const c=getBundledComputerGrid({grade:9,subject,fullMarks:50});fullMarks=c.fullMarks;durationMinutes=c.durationMinutes;
   status='Official structural transcription; teacher review pending';
   add('Unit-wise grid',['Unit','Level','Question type','Marks each','Count','Total'],c.unitGrid.map(x=>[c.unitNames[Number(x.unitCode)-1],x.cognitiveLevel,x.type,x.marks,x.count,x.marks*x.count]));
   add('Cognitive allocation (%)',['K','U','A','HA'],[levels.map(k=>c.cognitiveDistribution[k])]);
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
   if(evidence.unitMarks)add('Historical area/unit marks',['Unit','Marks'],numbered(evidence.unitMarks));
   if(evidence.questionCounts)add('Historical question distribution',['Type','Count','Marks each'],evidence.questionCounts.map((n,i)=>[(key==='science'?['MCQ','Very short','Short','Long']:['Very short','Short','Long'])[i],n,evidence.marksEach[i]]));
   if(evidence.cognitiveMarks)add('Historical cognitive marks',['K','U','A','HA'],[evidence.cognitiveMarks]);
   if(evidence.unitTypeMarks)add('Historical unit/type marks',['Unit','Very short','Short','Long'],evidence.unitTypeMarks.map((row,i)=>[i+1,...row]));
  }else if(key==='optional_environment'){
   fullMarks=75;durationMinutes=135;status='Official curriculum only; Grade 9 exact Grid unavailable';
   add('Curriculum assessment',['Theory','Practical','Written time (min)'],[[75,25,135]]);
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
   const link=make('a',src.kind==='curriculum'?'CDC curriculum (not Grid)':src.url.toLowerCase().endsWith('.pdf')?'Open original PDF':'Open CDC source',p);
   link.href=src.url;link.target='_blank';link.rel='noopener noreferrer';
   make('span',' — '+src.version+' · '+src.status,p);
   if(src.note)make('p',src.note,section);
  }
  if(!item.sources.length)make('p','No subject-specific official source registered.',section);
 }
}
