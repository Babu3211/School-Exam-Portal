import {connectSchoolFirebase,enforceSchoolIdle,bindVerifiedModuleActivity} from './school-firebase-client.mjs';
import {validateSchoolId} from './school-paths.mjs';
import {verifySchoolSession} from './verified-school-session.mjs';
import {subjectsForGrade,assessmentThemeReference} from './primary-assessment-reference.mjs';
import {loadCompleteClassRoster} from './complete-class-roster.mjs';
import {readObservationPortfolio,exportObservationPortfolio,readIndicatorPortfolio,exportIndicatorPortfolio,readPortfolioPrintModel,exportPortfolioWord} from './primary-assessment-portfolio.mjs';
import {readSchoolSubjectCatalog} from './subject-catalog-view.mjs';
import {loadAssignedPrimarySubjects,loadPrimaryTeacherWorksheet,loadAdminAssessmentWorksheet,primarySubjectKey,draftThemeSlots} from './primary-assessment-teacher-worksheet.mjs';
import {scoreSeroferoDraft} from './primary-assessment-v46-serofero-text.mjs';
import {todayAssessmentDate2083} from './assessment-date-2083.mjs';
import {loadMathAssessmentDraft,saveMathAssessmentDraft,validateMathDraftValues} from './primary-assessment-math-draft.mjs';
import {readSavedAssessmentDraftReport,exportSavedAssessmentDraft} from './primary-assessment-draft-export.mjs';
import {neError} from './nepali-feedback.mjs';
const $=id=>document.getElementById(id);
let actor=null,catalogue=null,auth,authSdk,db,api,epoch=0,portfolioEpoch=0;
const cell=(row,value)=>{const td=document.createElement('td');td.textContent=value??'—';row.append(td);return td};
function clear(){resetTeacherWorksheet();$('teacherWorksheet').hidden=true;resetPortfolio();$('portfolioArea').hidden=true;epoch++;actor=null;catalogue=null;$('referenceArea').hidden=true;$('rows').replaceChildren();$('totals').replaceChildren();$('identity').textContent='Academic Year 2083 · V47'}
async function verify(){
 const selected=actor,request=epoch;
 if(!selected||!await enforceSchoolIdle(auth,authSdk))throw Error('Login required');
 const session=await verifySchoolSession({schoolId:selected.schoolId,uid:selected.uid,readDocument:async path=>{const snap=await api.getDocFromServer(api.doc(db,...path.split('/')));return snap.exists()?snap.data():null}});
 if(request!==epoch||actor!==selected||auth.currentUser?.uid!==selected.uid||session.role!==selected.role)throw Error('School session changed');
}
async function render(){
 const request=++epoch,selected=actor;
 $('rows').replaceChildren();$('totals').replaceChildren();$('summary').textContent='स्रोत जाँच हुँदैछ…';
 try{
  await verify();if(request!==epoch||actor!==selected)return;
  const ref=assessmentThemeReference({catalogue,grade:$('grade').value,subject:$('subject').value});
  $('guideLink').href=ref.guide.url;$('officialLink').href=ref.guide.officialPage;
  $('summary').textContent=ref.themeCount?(ref.rows.some(r=>r.status==='v46WorkingReference')?'V46 मा '+ref.themeCount+' थिमका कार्यगत स्रोत उपलब्ध छन्। शब्दशः प्रमाणीकरण बाँकी छ।':'स्रोतमा '+ref.themeCount+' थिमको गणना उपलब्ध छ। शब्दशः फाराम र आधिकारिक मूल्याङ्कन प्रमाणीकरण बाँकी छ।'):'यस विषयको थिमगत गणना अझै सुरक्षित रूपमा सारिएको छैन। मूल मार्गदर्शन हेर्नुहोस्।';
  for(const item of ref.rows){
   const tr=document.createElement('tr');cell(tr,[item.theme,item.en&&item.en!==item.theme?item.en:''].filter(Boolean).join(' / '));cell(tr,item.count);cell(tr,item.indicators);cell(tr,item.scoreBlocks);cell(tr,item.fullMarks);
   const td=cell(tr,''),a=document.createElement('a');a.href=item.sourceUrl;a.target='_blank';a.rel='noopener noreferrer';a.textContent=item.page===null?'Guide':(item.printedPage?'Printed p. ':'')+String(item.page);td.append(a);
   cell(tr,item.status==='v46WorkingReference'?(item.sourceRows?'V46 कार्यगत पाठ — शब्दशः प्रमाणीकरण बाँकी':'V46 गणना मात्र — पाठ मिलान बाँकी'):item.status==='guideMatched'?'स्रोत गणना मिलेको':'स्रोत सूचक गणना');$('rows').append(tr);
  }
  if(ref.themeCount){const tr=document.createElement('tr');for(const x of ['Total',ref.learningAchievements,ref.indicators,ref.scoreBlocks,ref.rawFullMarks,'—','सन्दर्भ मात्र'])cell(tr,x);$('totals').append(tr)}
 }catch(e){if(request===epoch){clear();$('status').textContent='स्रोत खोल्न सकिएन: '+neError(e)}}
}
function fill(){const previous=$('subject').value;$('subject').replaceChildren(...subjectsForGrade($('grade').value).map(([key,name])=>new Option(name,key)));if([...$('subject').options].some(o=>o.value===previous))$('subject').value=previous;void render()}
$('grade').onchange=fill;$('subject').onchange=()=>void render();
let teacherEpoch=0,worksheet=null,worksheetRequest=0,worksheetRevision=null;
const usesLanguageStages=model=>['1','2','3'].includes(model?.grade)&&['nepali','english','serophero'].includes(model?.key);
function setDraftExportEnabled(enabled){for(const id of ['teacherDraftPrint','teacherDraftWord','teacherDraftExcel'])$(id).disabled=!enabled}
function clearDraft(){
 setDraftExportEnabled(false);worksheetRequest++;worksheetRevision=null;$('teacherSaveDraft').disabled=true;$('teacherDraftSaveStatus').textContent='';
 $('teacherDraftRows').replaceChildren();$('teacherDraftHead').replaceChildren();$('teacherDate').value='';$('teacherDraftTotal').textContent='';$('teacherThemeSource').hidden=true;
}
function resetTeacherWorksheet(){
 teacherEpoch++;worksheet=null;clearDraft();$('teacherStageWrap').hidden=true;$('teacherStage').value='regular';
 for(const id of ['teacherSubject','teacherStudent','teacherTheme']){$(id).replaceChildren();$(id).disabled=true}
 $('teacherOpenWorksheet').disabled=true;$('teacherDate').disabled=true;$('teacherWorksheetStatus').textContent='';
}
function clearTeacherModel(){
 teacherEpoch++;worksheet=null;clearDraft();$('teacherStageWrap').hidden=true;$('teacherStage').value='regular';
 for(const id of ['teacherStudent','teacherTheme']){$(id).replaceChildren();$(id).disabled=true}
 $('teacherDate').disabled=true;
}
$('teacherGrade').onchange=resetTeacherWorksheet;
$('teacherSubject').onchange=()=>{clearTeacherModel();$('teacherOpenWorksheet').disabled=!$('teacherSubject').value};
$('teacherLoadSubjects').onclick=async()=>{
 resetTeacherWorksheet();const request=teacherEpoch,member=actor,grade=$('teacherGrade').value;
 const check=()=>{if(request!==teacherEpoch||actor!==member||!member||auth.currentUser?.uid!==member.uid||$('teacherGrade').value!==grade)throw Error('Worksheet selection changed')};
 try{await verify();check();
 const list=await loadAssignedPrimarySubjects({db,api,actor:member,schoolId:member.schoolId,grade,catalogue,assertCurrent:check});
 check();$('teacherSubject').replaceChildren(...list.map(s=>new Option(s.name,s.id)));
 $('teacherSubject').disabled=!list.length;$('teacherOpenWorksheet').disabled=!list.length;
 $('teacherWorksheetStatus').textContent=list.length+' प्रमाणित विषय उपलब्ध छन्।';
 }catch(e){if(request===teacherEpoch)$('teacherWorksheetStatus').textContent='विषय खोल्न सकिएन: '+neError(e)}
};
async function renderTeacherDraft(){
 clearDraft();if(!worksheet||!$('teacherStudent').value||$('teacherTheme').value==='')return;
 const slots=draftThemeSlots(worksheet,Number($('teacherTheme').value));
 const theme=worksheet.themes[Number($('teacherTheme').value)];
 $('teacherStageWrap').hidden=!usesLanguageStages(worksheet);
 $('teacherDate').value=todayAssessmentDate2083();
 $('teacherThemeSource').href=theme.sourceUrl;$('teacherThemeSource').hidden=false;
 const binary=worksheet.key==='serophero';
 const key=worksheet.key,lower=['1','2','3'].includes(worksheet.grade),nepaliOnly=['nepali','socialstudies','serophero'].includes(key),ne=nepaliOnly;
 const digits=n=>ne?String(n).replace(/[0-9]/g,d=>'०१२३४५६७८९'[Number(d)]):String(n);
 const nepaliForm=lower&&key==='nepali',englishForm=lower&&key==='english',mathForm=lower&&key==='mathematics';
 const sourceReady=slots.every(s=>s.sourceText),indicatorForm=binary&&sourceReady;
 const staged=usesLanguageStages(worksheet)&&sourceReady,activeStage=$('teacherStage').value,peerStage=activeStage==='regular'?'support':'regular';
 const stageLabel=usesLanguageStages(worksheet)?($('teacherStage').value==='regular'?(ne?'नियमित मूल्याङ्कन':'Regular Assessment'):(ne?'थप सहायतापछिको मूल्याङ्कन':'Assessment after Remedial Class')):(ne?'मूल्याङ्कन':'Assessment');
 const labels=indicatorForm?['थिम','मुख्य सिकाइ उपलब्धि','उपलब्धि सूचक','सकेको / नसकेको','मिति','अङ्कन / ४','मूल्याङ्कन साधन']:nepaliForm?['सिकाइ उपलब्धि','परीक्षण गर्ने पक्ष','साधन','मिति','अङ्कन / ४']:englishForm?['SN','Areas / Skills','Learning outcomes','Date (BS)','Achievement / 4']:mathForm?['Learning achievement / सिकाइ उपलब्धि','Criteria / अङ्कन आधार','Date (BS) / मिति','Achievement / 4']:ne?['सिकाइ उपलब्धि','मिति','अङ्कन / ४']:['Learning achievement','Date (BS)','Achievement / 4'];
 const head=$('teacherDraftHead');head.replaceChildren();const top=document.createElement('tr');const th=document.createElement('th');th.colSpan=labels.length;th.textContent=stageLabel+' — '+[theme.theme,theme.en&&theme.en!==theme.theme?theme.en:''].filter(Boolean).join(' / ');top.append(th);head.append(top);const heading=document.createElement('tr');
 if(staged){
  const count=indicatorForm?3:2,lead=labels.slice(0,3),stageColumns=indicatorForm?['सकेको / नसकेको','मिति','अङ्कन / ४']:labels.slice(-2);
  th.colSpan=lead.length+2*count+(indicatorForm?1:0);
  th.textContent=[theme.theme,theme.en&&theme.en!==theme.theme?theme.en:''].filter(Boolean).join(' / ');
  const sub=document.createElement('tr');
  const headingCell=(tr,label,span=1,rows=1)=>{const el=document.createElement('th');el.textContent=label;el.colSpan=span;el.rowSpan=rows;tr.append(el);return el};
  for(const label of lead)headingCell(heading,label,1,2);
  for(const stage of ['regular','support']){
   const label=stage==='regular'?(ne?'नियमित मूल्याङ्कन':'Regular Assessment'):(ne?'थप सहायतापछिको मूल्याङ्कन':'Assessment after Remedial Class');
   const el=headingCell(heading,label,count);el.dataset.assessmentStage=stage;el.className=stage===activeStage?'assessment-active-stage':'assessment-peer-stage';
   for(const label of stageColumns)headingCell(sub,label);
  }
  if(indicatorForm)headingCell(heading,'मूल्याङ्कन साधन',1,2);
  head.append(heading,sub);
 }else{for(const label of labels){const el=document.createElement('th');el.scope='col';el.textContent=label;heading.append(el)}head.append(heading)}
 const makeDate=(tr,span=1)=>{const td=cell(tr,'');td.rowSpan=span;const field=document.createElement('input');field.className='assessment-row-date';field.setAttribute('aria-label',ne?'मूल्याङ्कन मिति (वि.सं.)':'Assessment date (BS)');field.placeholder='2083-MM-DD';field.maxLength=10;td.append(field);return field};
 const scoreCells=[],peerRatings=[],peerDates=[],peerScores=[];
 const peerCell=(tr,list,span=1)=>{const td=cell(tr,'—');td.rowSpan=span;td.className='assessment-peer-value';list.push(td);return td};
 const showPeer=saved=>{const values=saved?.ratings??'';peerRatings.forEach((td,i)=>{const v=values[i];td.textContent=!v||v==='_'?'—':indicatorForm?(v==='1'?'सकेको':'नसकेको'):digits(v)});peerDates.forEach((td,i)=>{const used=indicatorForm?/[01]/.test(values.slice(i*4,i*4+4)):/[1-4]/.test(values[i]??'');td.textContent=saved&&used?(saved.rowDates?.slice(i*10,i*10+10)||saved.date):'—'});if(indicatorForm&&saved){const result=scoreSeroferoDraft(values);peerScores.forEach((td,i)=>td.textContent=result.blocks[i]===null?'—':digits(result.blocks[i])+' / ४')}};
 const update=()=>{const fields=[...$('teacherDraftRows').querySelectorAll('select')];if(indicatorForm&&fields.length&&fields.length%4===0){const score=scoreSeroferoDraft(fields.map(el=>el.value||'_').join(''));scoreCells.forEach((el,i)=>el.textContent=score.blocks[i]===null?'—':digits(score.blocks[i])+' / ४');$('teacherDraftTotal').textContent='पूरा सूचक समूह: '+digits(score.completed)+'/'+digits(score.blocks.length)+' · '+digits(score.total)+' / '+digits(theme.fullMarks);return;}const used=fields.filter(el=>el.value!=='');$('teacherDraftTotal').textContent='Draft: '+used.length+'/'+fields.length+' · '+used.reduce((n,el)=>n+Number(el.value),0)+' / '+theme.fullMarks};
 const rating=(tr,slot)=>{const td=cell(tr,'');const input=document.createElement('select');input.setAttribute('aria-label','Draft rating '+slot.number);input.append(new Option('—',''));for(let n=slot.min;n<=slot.max;n++)input.append(new Option(digits(n),String(n)));input.onchange=update;td.append(input);return input};
 const addText=(td,values)=>{for(const value of values.filter(Boolean)){const el=document.createElement('div');el.textContent=value;td.append(el)}};
 for(const [index,slot] of slots.entries()){
  const row=slot.sourceText;
  if(indicatorForm){
   for(let i=0;i<4;i++){
    const tr=document.createElement('tr');
    if(index===0&&i===0){const td=cell(tr,theme.theme);td.rowSpan=slots.length*4;td.className='assessment-group'}
    if(i===0&&(index===0||slots[index-1].sourceText.outcome!==row.outcome)){let span=1;while(index+span<slots.length&&slots[index+span].sourceText.outcome===row.outcome)span++;const td=cell(tr,digits(row.outcome)+'. '+row.title);td.rowSpan=span*4;td.className='assessment-group'}
    cell(tr,digits((row.block-1)*4+i+1)+'. '+row.indicators[i]);
    const active=()=>{const td=cell(tr,''),input=document.createElement('select');input.setAttribute('aria-label','सूचक '+slot.number+'.'+(i+1));input.append(new Option('—',''),new Option('सकेको','1'),new Option('नसकेको','0'));input.onchange=update;td.append(input);
    if(i===0){makeDate(tr,4);const score=cell(tr,'—');score.rowSpan=4;score.className='assessment-block-score';scoreCells.push(score)}};
    const peer=()=>{peerCell(tr,peerRatings);if(i===0){peerCell(tr,peerDates,4);peerCell(tr,peerScores,4)}};
    if(staged&&activeStage==='support')peer();active();if(staged&&activeStage==='regular')peer();
    const tool=row.tools[i];cell(tr,tool==='मूल फाराममा खाली'?'':tool);
    $('teacherDraftRows').append(tr);
   }
   continue;
  }
  const tr=document.createElement('tr');
  if(englishForm){cell(tr,String(slot.number));cell(tr,row?.aspect??'—');cell(tr,row?.title??'Source text unavailable')}
  else{
   const label=cell(tr,digits(slot.number)+'.');addText(label,row?[row.title,row.titleEn,row.achievement]:[ne?'स्रोत पाठ उपलब्ध छैन':'Source text unavailable']);
   if(nepaliForm){cell(tr,row?.aspect??'—');cell(tr,row?.tool??'—')}
   else if(mathForm){const td=cell(tr,'');if(row?.criteria)addText(td,row.criteria.map((c,i)=>(4-i)+' — '+c.join(' / ')))}
   else if(row)addText(label,[row.aspect,row.tool]);
  }
  const active=()=>{makeDate(tr);rating(tr,slot)},peer=()=>{peerCell(tr,peerDates);peerCell(tr,peerRatings)};
  if(staged&&activeStage==='support')peer();active();if(staged&&activeStage==='regular')peer();$('teacherDraftRows').append(tr);
 }
 update();
 if(!['mathematics','science','socialstudies','nepali','english','healthphysicalcreativeart','serophero'].includes(worksheet.key)||(Number(worksheet.grade)<=3&&worksheet.key!=='mathematics'&&!usesLanguageStages(worksheet))||!slots.every(s=>s.sourceText))return;
 const args=worksheetSelection(),request=worksheetRequest;
 const fields=[...$('teacherDraftRows').querySelectorAll('select')],dates=[...$('teacherDraftRows').querySelectorAll('.assessment-row-date')];
 fields.forEach(el=>el.disabled=true);dates.forEach(el=>el.disabled=true);$('teacherDate').disabled=true;
 $('teacherDraftSaveStatus').textContent='सुरक्षित Draft जाँच हुँदैछ…';
 try{
  await verify();args.assertCurrent();
  const [saved,other]=await Promise.all([loadMathAssessmentDraft(args),staged?loadMathAssessmentDraft({...args,stage:peerStage}):Promise.resolve(null)]);args.assertCurrent();
  if(staged)showPeer(other);
  setDraftExportEnabled(!!saved||!!other);
  worksheetRevision=saved?.revision??0;
  if(saved){$('teacherDate').value=saved.date;fields.forEach((el,i)=>el.value=saved.ratings[i]==='_'?'':saved.ratings[i]);if(saved.rowDates)dates.forEach((el,i)=>el.value=saved.rowDates.slice(i*10,(i+1)*10));update()}
  $('teacherDraftSaveStatus').textContent=saved?'Draft Revision '+saved.revision+' पुनः लोड भयो।':'नयाँ निजी Draft।';
  $('teacherSaveDraft').disabled=false;
 }catch(e){if(request===worksheetRequest)$('teacherDraftSaveStatus').textContent='Draft खोल्न सकिएन: '+neError(e)}
 finally{if(request===worksheetRequest){fields.forEach(el=>el.disabled=false);dates.forEach(el=>el.disabled=false);$('teacherDate').disabled=false}}
}
function worksheetSelection(){
 const request=worksheetRequest,member=actor,model=worksheet,studentId=$('teacherStudent').value,themeIndex=Number($('teacherTheme').value),stage=usesLanguageStages(model)?$('teacherStage').value:undefined;
 const assertCurrent=()=>{if(request!==worksheetRequest||actor!==member||worksheet!==model||!member||auth.currentUser?.uid!==member.uid||$('teacherStudent').value!==studentId||Number($('teacherTheme').value)!==themeIndex||(usesLanguageStages(model)&&$('teacherStage').value!==stage))throw Error('Worksheet selection changed')};
 return {db,api,auth,actor:member,model,studentId,themeIndex,stage,assertCurrent};
}
$('teacherSaveDraft').onclick=async()=>{
 if(worksheetRevision===null||$('teacherSaveDraft').disabled)return;
 const args=worksheetSelection(),request=worksheetRequest,expectedRevision=worksheetRevision;
 const fields=[...$('teacherDraftRows').querySelectorAll('select')],ratings=fields.map(el=>el.value||'_').join(''),date=$('teacherDate').value.trim(),dates=[...$('teacherDraftRows').querySelectorAll('.assessment-row-date')],rowDates=dates.map(el=>el.value.trim()||date).join('');
 try{validateMathDraftValues({ratings,date,count:fields.length,binary:args.model.key==='serophero',rowDates})}catch{
  $('teacherDraftSaveStatus').textContent=(args.model.key==='serophero'?'२०८३ सालको मान्य मिति र कम्तीमा एउटा सूचकको सकेको/नसकेको अवस्था राख्नुहोस्।':'२०८३ सालको मान्य मिति YYYY-MM-DD ढाँचामा र कम्तीमा एउटा १–४ प्राप्ताङ्क राख्नुहोस्।');return;
 }
 $('teacherSaveDraft').disabled=true;fields.forEach(el=>el.disabled=true);dates.forEach(el=>el.disabled=true);$('teacherDate').disabled=true;
 try{
  await verify();args.assertCurrent();
  const saved=await saveMathAssessmentDraft({...args,ratings,date,rowDates,expectedRevision});args.assertCurrent();
  worksheetRevision=saved.revision;setDraftExportEnabled(true);dates.forEach((el,i)=>el.value=saved.rowDates.slice(i*10,(i+1)*10));$('teacherDraftSaveStatus').textContent='Draft Revision '+saved.revision+' सुरक्षित भयो। यो आधिकारिक मूल्याङ्कन होइन।';
  $('teacherSaveDraft').disabled=false;
 }catch(e){if(request===worksheetRequest){worksheetRevision=null;$('teacherDraftSaveStatus').textContent='Draft सुरक्षित भएको पुष्टि भएन। मिति र अङ्क जाँच्नुहोस्; विद्यार्थी वा थिम पुनः खोलेर सुरक्षित Revision जाँच्नुहोस्। '+neError(e)}}
 finally{if(request===worksheetRequest){fields.forEach(el=>el.disabled=false);dates.forEach(el=>el.disabled=false);$('teacherDate').disabled=false}}
};
$('teacherStudent').onchange=renderTeacherDraft;$('teacherTheme').onchange=renderTeacherDraft;$('teacherStage').onchange=renderTeacherDraft;
$('teacherOpenWorksheet').onclick=async()=>{
 clearTeacherModel();const request=teacherEpoch,member=actor,grade=$('teacherGrade').value,subjectId=$('teacherSubject').value;
 const check=()=>{if(request!==teacherEpoch||actor!==member||!member||auth.currentUser?.uid!==member.uid||$('teacherGrade').value!==grade||$('teacherSubject').value!==subjectId)throw Error('Worksheet selection changed')};
 try{await verify();check();const result=await loadPrimaryTeacherWorksheet({db,api,actor:member,schoolId:member.schoolId,grade,subjectId,catalogue,assertCurrent:check});check();worksheet=result;
 $('teacherStudent').replaceChildren(...result.students.map(s=>new Option(s.name+(s.section?' / '+s.section:''),s.id)));
 $('teacherTheme').replaceChildren(...result.themes.map((t,i)=>new Option([t.theme,t.en&&t.en!==t.theme?t.en:''].filter(Boolean).join(' / '),String(i))));
 $('teacherStudent').disabled=false;$('teacherTheme').disabled=false;$('teacherDate').disabled=false;
 renderTeacherDraft();$('teacherWorksheetStatus').textContent=result.students.length+' विद्यार्थी र '+result.themes.length+' थिम उपलब्ध छन्। '+(result.themes.every(t=>t.sourceRows)?'V46 को उपलब्धि पाठ उपलब्ध छ; शब्दशः प्रमाणीकरण बाँकी। ':'सबै थिमको शब्दशः पाठ अझै उपलब्ध छैन। ')+'अस्थायी फाराम मात्र।';
 }catch(e){if(request===teacherEpoch){clearTeacherModel();$('teacherWorksheetStatus').textContent='फाराम खोल्न सकिएन: '+neError(e)}}
};
async function outputTeacherDraft(kind){
 const args=worksheetSelection(),request=worksheetRequest;
 try{await verify();args.assertCurrent();
 if(kind==='print'){
  const model=await readSavedAssessmentDraftReport(args);await verify();args.assertCurrent();
  renderSavedPrintModel(model);
  $('teacherDraftSaveStatus').textContent='सुरक्षित Draft मात्र: Print वा Save as PDF छान्नुहोस्।';
 }else{
  const file=await exportSavedAssessmentDraft(args,kind);await verify();args.assertCurrent();
  const url=URL.createObjectURL(file.blob),a=document.createElement('a');a.href=url;a.download=file.filename;
  try{document.body.append(a);a.click()}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}
  $('teacherDraftSaveStatus').textContent='सुरक्षित Draft को फाइल तयार भयो। सम्पादन गरेर Save नगरेका अङ्क समावेश छैनन्।';
 }
 }catch(e){if(request===worksheetRequest)$('teacherDraftSaveStatus').textContent='फाइल तयार भएन: '+neError(e)}
}
$('teacherDraftPrint').onclick=()=>void outputTeacherDraft('print');$('teacherDraftWord').onclick=()=>void outputTeacherDraft('word');$('teacherDraftExcel').onclick=()=>void outputTeacherDraft('excel');
function clearPrint(){document.body.classList.remove('portfolio-printing');$('portfolioPrint').replaceChildren();$('portfolioPrint').hidden=true}
let adminReviewEpoch=0,adminReviewModel=null;
function clearAdminReview(){adminReviewEpoch++;adminReviewModel=null;$('adminDraftTheme').replaceChildren();$('adminDraftRows').replaceChildren();$('adminDraftHead').replaceChildren();$('adminDraftStatus').textContent='';for(const id of ['adminDraftRead','adminDraftPrint','adminDraftWord','adminDraftExcel'])$(id).disabled=true;}
function resetPortfolio(){
 clearAdminReview();$('adminDraftTeacher').replaceChildren();$('adminDraftSubject').replaceChildren();$('adminDraftLoad').disabled=true;clearPrint();
 portfolioEpoch++;$('portfolioRows').replaceChildren();$('indicatorRows').replaceChildren();$('portfolioStudent').replaceChildren();$('portfolioStudent').disabled=true;$('portfolioRead').disabled=true;$('portfolioExport').disabled=true;$('indicatorRead').disabled=true;$('indicatorExport').disabled=true;$('portfolioWordOrdinary').disabled=$('portfolioPrintOrdinary').disabled=true;$('portfolioWordIndicators').disabled=$('portfolioPrintIndicators').disabled=true;$('portfolioStatus').textContent='';
}
$('portfolioGrade').onchange=resetPortfolio;
$('portfolioStudent').onchange=()=>{clearAdminReview();$('adminDraftLoad').disabled=!$('portfolioStudent').value;clearPrint();portfolioEpoch++;$('portfolioRows').replaceChildren();$('indicatorRows').replaceChildren();$('portfolioStatus').textContent='';$('portfolioRead').disabled=!$('portfolioStudent').value;$('portfolioExport').disabled=$('portfolioWordOrdinary').disabled=$('portfolioPrintOrdinary').disabled=!$('portfolioStudent').value;$('indicatorRead').disabled=$('indicatorExport').disabled=$('portfolioWordIndicators').disabled=$('portfolioPrintIndicators').disabled=!$('portfolioStudent').value||!['1','2','3'].includes($('portfolioGrade').value)};
$('portfolioRoster').onclick=async()=>{
 resetPortfolio();const request=portfolioEpoch,member=actor,grade=$('portfolioGrade').value;
 const check=()=>{if(request!==portfolioEpoch||actor!==member||!member||auth.currentUser?.uid!==member.uid||$('portfolioGrade').value!==grade)throw Error('Portfolio selection changed')};
 try{
  await verify();check();
  if(!['school_admin','viewer'].includes(member.role))throw Error('Admin or Viewer required');
  $('portfolioStatus').textContent='विद्यार्थी सूची लोड हुँदैछ…';
  const roster=await loadCompleteClassRoster({db,api,actor:member,schoolId:member.schoolId,classId:grade,activeOnly:true});check();await verify();check();
  $('portfolioStudent').replaceChildren(...roster.students.map(s=>new Option(String(s.nameEnglish??s.name??s.id),s.id)));
  $('portfolioStudent').disabled=false;$('adminDraftLoad').disabled=!$('portfolioStudent').value;$('portfolioRead').disabled=!$('portfolioStudent').value;$('portfolioExport').disabled=$('portfolioWordOrdinary').disabled=$('portfolioPrintOrdinary').disabled=!$('portfolioStudent').value;$('indicatorRead').disabled=$('indicatorExport').disabled=$('portfolioWordIndicators').disabled=$('portfolioPrintIndicators').disabled=!$('portfolioStudent').value||!['1','2','3'].includes($('portfolioGrade').value);$('portfolioStatus').textContent=roster.count+' विद्यार्थी उपलब्ध छन्।';
 }catch(e){if(request===portfolioEpoch){resetPortfolio();$('portfolioStatus').textContent='विद्यार्थी सूची खोल्न सकिएन: '+neError(e)}}
};
$('adminDraftTeacher').onchange=clearAdminReview;$('adminDraftSubject').onchange=clearAdminReview;
$('adminDraftTheme').onchange=()=>{$('adminDraftRows').replaceChildren();$('adminDraftHead').replaceChildren();$('adminDraftStatus').textContent='';};
$('adminDraftLoad').onclick=async()=>{
 clearAdminReview();const request=adminReviewEpoch,member=actor,grade=$('portfolioGrade').value,studentId=$('portfolioStudent').value;
 const check=()=>{if(request!==adminReviewEpoch||actor!==member||member?.role!=='school_admin'||auth.currentUser?.uid!==member.uid||$('portfolioGrade').value!==grade||$('portfolioStudent').value!==studentId)throw Error('Review selection changed')};
 try{await verify();check();const [subjects,teachers]=await Promise.all([readSchoolSubjectCatalog({db,api,actor:member,schoolId:member.schoolId,schoolClass:grade,assertCurrent:check}),api.getDocsFromServer(api.query(api.collection(db,'schools',member.schoolId,'members'),api.where('role','==','teacher'),api.where('active','==',true),api.limit(101)))]);check();
 if(teachers.docs.length>100||teachers.docs.some(d=>d.data().schoolId!==member.schoolId||d.data().uid!==d.id||d.data().role!=='teacher'||d.data().active!==true))throw Error('Teacher list invalid');
 $('adminDraftTeacher').replaceChildren(...teachers.docs.map(d=>new Option(d.id,d.id)));
 $('adminDraftSubject').replaceChildren(...subjects.filter(s=>s.active===true&&primarySubjectKey(s.name)).map(s=>new Option(s.name,s.id)));
 $('adminDraftStatus').textContent='शिक्षक र विषय छानेर Open Review थिच्नुहोस्।';
 }catch(e){if(request===adminReviewEpoch)$('adminDraftStatus').textContent=neError(e)}
};
function adminDraftSelection(){
 const request=adminReviewEpoch,member=actor,grade=$('portfolioGrade').value,studentId=$('portfolioStudent').value,teacherUid=$('adminDraftTeacher').value,subjectId=$('adminDraftSubject').value;
 const check=()=>{if(request!==adminReviewEpoch||actor!==member||member?.role!=='school_admin'||auth.currentUser?.uid!==member.uid||$('portfolioGrade').value!==grade||$('portfolioStudent').value!==studentId||$('adminDraftTeacher').value!==teacherUid||$('adminDraftSubject').value!==subjectId)throw Error('Review selection changed')};
 return {db,api,auth,actor:member,schoolId:member?.schoolId,grade,studentId,teacherUid,subjectId,catalogue,assertCurrent:check};
}
$('adminDraftOpen').onclick=async()=>{
 clearAdminReview();const args=adminDraftSelection(),request=adminReviewEpoch;
 try{await verify();args.assertCurrent();const model=await loadAdminAssessmentWorksheet(args);args.assertCurrent();adminReviewModel=model;
 $('adminDraftTheme').replaceChildren(...model.themes.map((t,i)=>new Option(t.theme,String(i))));
 for(const id of ['adminDraftRead','adminDraftPrint','adminDraftWord','adminDraftExcel'])$(id).disabled=false;
 $('adminDraftStatus').textContent='थिम छान्नुहोस्। सुरक्षित Draft मात्र हेर्न मिल्छ।';
 }catch(e){if(request===adminReviewEpoch)$('adminDraftStatus').textContent='Draft खोल्न सकिएन: '+neError(e)}
};
async function adminDraftOutput(kind){
 const selection=adminDraftSelection(),request=adminReviewEpoch,themeIndex=Number($('adminDraftTheme').value),model=adminReviewModel;
 const args={...selection,model,themeIndex,reviewTeacherUid:selection.teacherUid,assertCurrent:()=>{selection.assertCurrent();if(adminReviewModel!==model||Number($('adminDraftTheme').value)!==themeIndex)throw Error('Review theme changed')}};
 try{await verify();args.assertCurrent();
 if(kind==='view'||kind==='print'){
  const report=await readSavedAssessmentDraftReport(args);await verify();args.assertCurrent();
  if(kind==='print')renderSavedPrintModel(report);
  else{const h=$('adminDraftHead'),b=$('adminDraftRows');h.replaceChildren();b.replaceChildren();const tr=document.createElement('tr');for(const label of report.headers){const th=document.createElement('th');th.textContent=label;tr.append(th)}h.append(tr);for(const row of report.rows){const tr=document.createElement('tr');for(const v of row)cell(tr,v);b.append(tr)}}
 }else{const file=await exportSavedAssessmentDraft(args,kind);await verify();args.assertCurrent();const url=URL.createObjectURL(file.blob),a=document.createElement('a');a.href=url;a.download=file.filename;try{document.body.append(a);a.click()}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}}
 $('adminDraftStatus').textContent='सुरक्षित Draft मात्र — आधिकारिक मूल्याङ्कन होइन।';
 }catch(e){if(request===adminReviewEpoch){$('adminDraftRows').replaceChildren();$('adminDraftHead').replaceChildren();$('adminDraftStatus').textContent='Draft तयार भएन: '+neError(e)}}
}
for(const [id,kind] of [['adminDraftRead','view'],['adminDraftPrint','print'],['adminDraftWord','word'],['adminDraftExcel','excel']])$(id).onclick=()=>void adminDraftOutput(kind);
$('portfolioRead').onclick=async()=>{
 const request=++portfolioEpoch,member=actor,grade=$('portfolioGrade').value,studentId=$('portfolioStudent').value;
 $('portfolioRows').replaceChildren();$('indicatorRows').replaceChildren();$('portfolioStatus').textContent='अभिलेख जाँच हुँदैछ…';
 const check=()=>{if(request!==portfolioEpoch||actor!==member||!member||auth.currentUser?.uid!==member.uid||$('portfolioGrade').value!==grade||$('portfolioStudent').value!==studentId)throw Error('Portfolio selection changed')};
 try{
  await verify();check();
  const result=await readObservationPortfolio({db,api,actor:member,schoolId:member.schoolId,grade,studentId,assertCurrent:check});check();
  for(const r of result.rows){const tr=document.createElement('tr');for(const val of [r.subject,[r.unit,r.unitEn].filter(Boolean).join(' / '),[r.topic,r.topicAlt].filter(Boolean).join(' / '),r.stage==='regular'?'Regular':r.stage==='support'?'Additional Support':'—',r.date,r.level,r.method,r.evidence,r.feedback])cell(tr,val||'—');$('portfolioRows').append(tr)}
  $('portfolioStatus').textContent=result.rows.length+' साधारण अभिलेख भेटिए।'+(result.historical?' हालको कक्षा/सेक्सनसँग नमिलेका '+result.historical+' ऐतिहासिक अभिलेख यस सूचीमा समावेश छैनन्।':'');
 }catch(e){if(request===portfolioEpoch){$('portfolioRows').replaceChildren();$('indicatorRows').replaceChildren();$('portfolioStatus').textContent='Portfolio खोल्न सकिएन: '+neError(e)}}
};
$('indicatorRead').onclick=async()=>{
 const request=++portfolioEpoch,member=actor,grade=$('portfolioGrade').value,studentId=$('portfolioStudent').value;
 $('indicatorRows').replaceChildren();$('portfolioStatus').textContent='चार-सूचक अभिलेख जाँच हुँदैछ…';
 const check=()=>{if(request!==portfolioEpoch||actor!==member||!member||auth.currentUser?.uid!==member.uid||$('portfolioGrade').value!==grade||$('portfolioStudent').value!==studentId)throw Error('Portfolio selection changed')};
 try{
  await verify();check();
  const result=await readIndicatorPortfolio({db,api,actor:member,schoolId:member.schoolId,grade,studentId,assertCurrent:check});check();
  for(const row of result.rows){const tr=document.createElement('tr');for(const v of [row.subject,row.unit,row.outcomeId,row.stage==='regular'?'Regular':'Additional Support',row.date,...row.indicators.map(x=>x?'✓':'✗'),row.score,row.usedTools.join(' / ')])cell(tr,v);$('indicatorRows').append(tr)}
  $('portfolioStatus').textContent=result.rows.length+' सुरक्षित चार-सूचक अभिलेख भेटिए।'+(result.historical?' '+result.historical+' ऐतिहासिक अभिलेख छुट्टै छन्।':'')+' यो अन्तिम विषयगत ग्रेड होइन।';
 }catch(e){if(request===portfolioEpoch){$('indicatorRows').replaceChildren();$('portfolioStatus').textContent='चार-सूचक अभिलेख खोल्न सकिएन: '+neError(e)}}
};
$('portfolioExport').onclick=async()=>{
 const request=++portfolioEpoch,member=actor,grade=$('portfolioGrade').value,studentId=$('portfolioStudent').value;
 const check=()=>{if(request!==portfolioEpoch||actor!==member||!member||auth.currentUser?.uid!==member.uid||$('portfolioGrade').value!==grade||$('portfolioStudent').value!==studentId)throw Error('Portfolio selection changed')};
 $('portfolioStatus').textContent='Excel का लागि अभिलेख पुनः जाँच हुँदैछ…';
 try{
  await verify();check();
  const file=await exportObservationPortfolio({db,api,actor:member,schoolId:member.schoolId,grade,studentId,assertCurrent:check});check();
  await verify();check();
  const url=URL.createObjectURL(file.blob),a=document.createElement('a');a.href=url;a.download=file.filename;
  try{document.body.append(a);a.click()}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}
  $('portfolioStatus').textContent=file.count+' साधारण अभिलेखको Excel तयार भयो। यो आधिकारिक मूल्याङ्कन प्रतिवेदन होइन।';
 }catch(e){if(request===portfolioEpoch){$('portfolioRows').replaceChildren();$('indicatorRows').replaceChildren();$('portfolioStatus').textContent='Excel तयार भएन: '+neError(e)}}
};
$('indicatorExport').onclick=async()=>{
 const request=++portfolioEpoch,member=actor,grade=$('portfolioGrade').value,studentId=$('portfolioStudent').value;
 const check=()=>{if(request!==portfolioEpoch||actor!==member||!member||auth.currentUser?.uid!==member.uid||$('portfolioGrade').value!==grade||$('portfolioStudent').value!==studentId)throw Error('Portfolio selection changed')};
 $('portfolioStatus').textContent='चार-सूचक Excel का लागि अभिलेख जाँच हुँदैछ…';
 try{
  await verify();check();
  const file=await exportIndicatorPortfolio({db,api,actor:member,schoolId:member.schoolId,grade,studentId,assertCurrent:check});check();
  await verify();check();
  const url=URL.createObjectURL(file.blob),a=document.createElement('a');a.href=url;a.download=file.filename;
  try{document.body.append(a);a.click()}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}
  $('portfolioStatus').textContent=file.count+' चार-सूचक अभिलेखको Excel तयार भयो। यो आधिकारिक मूल्याङ्कन प्रतिवेदन होइन।';
 }catch(e){if(request===portfolioEpoch){$('indicatorRows').replaceChildren();$('portfolioStatus').textContent='Excel तयार भएन: '+neError(e)}}
};
async function wordPortfolio(kind){
 const request=++portfolioEpoch,member=actor,grade=$('portfolioGrade').value,studentId=$('portfolioStudent').value;
 const check=()=>{if(request!==portfolioEpoch||actor!==member||!member||auth.currentUser?.uid!==member.uid||$('portfolioGrade').value!==grade||$('portfolioStudent').value!==studentId)throw Error('Portfolio selection changed')};
 $('portfolioStatus').textContent='Word का लागि सुरक्षित अभिलेख जाँच हुँदैछ…';
 try{
  await verify();check();
  const file=await exportPortfolioWord({db,api,actor:member,schoolId:member.schoolId,grade,studentId,assertCurrent:check},kind);
  await verify();check();
  const url=URL.createObjectURL(file.blob),a=document.createElement('a');a.href=url;a.download=file.filename;
  try{document.body.append(a);a.click()}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}
  $('portfolioStatus').textContent=file.count+' अभिलेखको Word तयार भयो। यो आधिकारिक मूल्याङ्कन होइन।';
 }catch(e){if(request===portfolioEpoch)$('portfolioStatus').textContent='Word तयार भएन: '+neError(e)}
}
$('portfolioWordOrdinary').onclick=()=>void wordPortfolio('observations');
$('portfolioWordIndicators').onclick=()=>void wordPortfolio('indicators');
function renderSavedPrintModel(model){
 clearPrint();
  const root=$('portfolioPrint');
  const add=(tag,value,parent=root)=>{const el=document.createElement(tag);el.textContent=value;parent.append(el);return el};
  add('h1',model.title);
  add('p','SMSS Exam Portal V47 · School ID: '+model.schoolId+' · Academic Year: '+model.year);
  add('p','Student: '+(model.studentName||model.studentId)+' · Student ID: '+model.studentId+' · Class: '+model.grade+(model.section?' · Section: '+model.section:''));
  add('p',model.notice);
  add('p','Records: '+model.rows.length+' · Excluded historical records: '+model.historical);
  const table=add('table',''),head=add('thead','',table),tr=add('tr','',head);
  for(const v of model.headers)add('th',v,tr);
  const body=add('tbody','',table);
  for(const row of model.rows){const r=add('tr','',body);for(const v of row)add('td',v??'—',r)}
  root.hidden=false;document.body.classList.add('portfolio-printing');
  try{window.print()}finally{clearPrint()}
}
async function printPortfolio(kind){
 clearPrint();
 const request=++portfolioEpoch,member=actor,grade=$('portfolioGrade').value,studentId=$('portfolioStudent').value;
 const check=()=>{if(request!==portfolioEpoch||actor!==member||!member||auth.currentUser?.uid!==member.uid||$('portfolioGrade').value!==grade||$('portfolioStudent').value!==studentId)throw Error('Portfolio selection changed')};
 $('portfolioStatus').textContent='प्रिन्टका लागि सुरक्षित अभिलेख जाँच हुँदैछ…';
 try{
  await verify();check();
  const model=await readPortfolioPrintModel({db,api,actor:member,schoolId:member.schoolId,grade,studentId,assertCurrent:check},kind);
  await verify();check();
  renderSavedPrintModel(model);
  $('portfolioStatus').textContent='प्रिन्ट संवादमा Print वा Save as PDF छान्नुहोस्। यो आधिकारिक मूल्याङ्कन होइन।';
 }catch(e){if(request===portfolioEpoch){clearPrint();$('portfolioStatus').textContent='प्रिन्ट तयार भएन: '+neError(e)}}
}
$('portfolioPrintOrdinary').onclick=()=>void printPortfolio('observations');
$('portfolioPrintIndicators').onclick=()=>void printPortfolio('indicators');
window.addEventListener('afterprint',clearPrint);
try{
 ({auth,authSdk,db,api}=await connectSchoolFirebase());
 const sid=validateSchoolId(new URL(location.href).searchParams.get('schoolId')||'');
 const uid=auth.currentUser?.uid;if(!uid)throw Error('Login required');
 const session=await verifySchoolSession({schoolId:sid,uid,readDocument:async path=>{const snap=await api.getDocFromServer(api.doc(db,...path.split('/')));return snap.exists()?snap.data():null}});
 if(auth.currentUser?.uid!==uid)throw Error('Login changed');
 actor={...session,active:true};$('adminDraftArea').hidden=actor.role!=='school_admin';
 authSdk.onAuthStateChanged(auth,user=>{if(actor&&user?.uid!==actor.uid){clear();$('status').textContent='लगइन परिवर्तन भयो। Dashboard बाट पुनः खोल्नुहोस्।'}});
 const response=await fetch('./primary-assessment-reference-2083.json',{cache:'no-store'});if(!response.ok)throw Error('Reference file unavailable');
 catalogue=await response.json();await verify();
 $('identity').textContent='Academic Year 2083 · V47 · '+sid;$('referenceArea').hidden=false;$('portfolioArea').hidden=!['school_admin','viewer'].includes(actor.role);$('teacherWorksheet').hidden=actor.role!=='teacher';$('status').textContent='विद्यालयको अनुमति पुष्टि भयो।';
 const member=actor;bindVerifiedModuleActivity(member,()=>actor===member);fill();
}catch(e){clear();$('status').textContent='Dashboard बाट प्रमाणित विद्यालयमा लगइन गरी पुनः खोल्नुहोस्: '+neError(e)}
