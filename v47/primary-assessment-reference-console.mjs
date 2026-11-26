import {connectSchoolFirebase,enforceSchoolIdle,bindVerifiedModuleActivity} from './school-firebase-client.mjs';
import {validateSchoolId} from './school-paths.mjs';
import {verifySchoolSession} from './verified-school-session.mjs';
import {subjectsForGrade,assessmentThemeReference} from './primary-assessment-reference.mjs';
import {loadCompleteClassRoster} from './complete-class-roster.mjs';
import {readObservationPortfolio,exportObservationPortfolio,readIndicatorPortfolio,exportIndicatorPortfolio,readPortfolioPrintModel,exportPortfolioWord} from './primary-assessment-portfolio.mjs';
import {loadAssignedPrimarySubjects,loadPrimaryTeacherWorksheet,draftThemeSlots} from './primary-assessment-teacher-worksheet.mjs';
import {loadMathAssessmentDraft,saveMathAssessmentDraft,validateMathDraftValues} from './primary-assessment-math-draft.mjs';
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
  $('summary').textContent=ref.themeCount?(ref.rows.some(r=>r.status==='v46WorkingReference')?'V46 मा '+ref.themeCount+' गणित थिमका कार्यगत रुब्रिक उपलब्ध छन्। शब्दशः प्रमाणीकरण बाँकी छ।':'स्रोतमा '+ref.themeCount+' थिमको गणना उपलब्ध छ। शब्दशः फाराम र आधिकारिक मूल्याङ्कन प्रमाणीकरण बाँकी छ।'):'यस विषयको थिमगत गणना अझै सुरक्षित रूपमा सारिएको छैन। मूल मार्गदर्शन हेर्नुहोस्।';
  for(const item of ref.rows){
   const tr=document.createElement('tr');cell(tr,[item.theme,item.en&&item.en!==item.theme?item.en:''].filter(Boolean).join(' / '));cell(tr,item.count);cell(tr,item.indicators);cell(tr,item.scoreBlocks);cell(tr,item.fullMarks);
   const td=cell(tr,''),a=document.createElement('a');a.href=item.sourceUrl;a.target='_blank';a.rel='noopener noreferrer';a.textContent=(item.printedPage?'Printed p. ':'')+String(item.page);td.append(a);
   cell(tr,item.status==='v46WorkingReference'?'V46 कार्यगत पाठ — शब्दशः प्रमाणीकरण बाँकी':item.status==='guideMatched'?'स्रोत गणना मिलेको':'स्रोत सूचक गणना');$('rows').append(tr);
  }
  if(ref.themeCount){const tr=document.createElement('tr');for(const x of ['Total',ref.learningAchievements,ref.indicators,ref.scoreBlocks,ref.rawFullMarks,'—','सन्दर्भ मात्र'])cell(tr,x);$('totals').append(tr)}
 }catch(e){if(request===epoch){clear();$('status').textContent='स्रोत खोल्न सकिएन: '+neError(e)}}
}
function fill(){const previous=$('subject').value;$('subject').replaceChildren(...subjectsForGrade($('grade').value).map(([key,name])=>new Option(name,key)));if([...$('subject').options].some(o=>o.value===previous))$('subject').value=previous;void render()}
$('grade').onchange=fill;$('subject').onchange=()=>void render();
let teacherEpoch=0,worksheet=null,worksheetRequest=0,worksheetRevision=null;
function clearDraft(){
 worksheetRequest++;worksheetRevision=null;$('teacherSaveDraft').disabled=true;$('teacherDraftSaveStatus').textContent='';
 $('teacherDraftRows').replaceChildren();$('teacherDate').value='';$('teacherDraftTotal').textContent='';$('teacherThemeSource').hidden=true;
}
function resetTeacherWorksheet(){
 teacherEpoch++;worksheet=null;clearDraft();
 for(const id of ['teacherSubject','teacherStudent','teacherTheme']){$(id).replaceChildren();$(id).disabled=true}
 $('teacherOpenWorksheet').disabled=true;$('teacherDate').disabled=true;$('teacherWorksheetStatus').textContent='';
}
function clearTeacherModel(){
 teacherEpoch++;worksheet=null;clearDraft();
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
 $('teacherThemeSource').href=theme.sourceUrl;$('teacherThemeSource').hidden=false;
 const update=()=>{const fields=[...$('teacherDraftRows').querySelectorAll('select')];const used=fields.filter(el=>el.value!=='');$('teacherDraftTotal').textContent='Draft: '+used.length+'/'+fields.length+' · '+used.reduce((n,el)=>n+Number(el.value),0)+' / '+theme.fullMarks};
 for(const slot of slots){const tr=document.createElement('tr');const label=cell(tr,(slot.indicatorBlock?'Indicator Block ':'Achievement Slot ')+slot.number);if(slot.sourceText){for(const value of [slot.sourceText.title,slot.sourceText.titleEn,slot.sourceText.achievement].filter(Boolean)){const p=document.createElement('div');p.textContent=value;label.append(p)}if(slot.sourceText.criteria){for(const [i,criterion] of slot.sourceText.criteria.entries()){const p=document.createElement('div');p.textContent=(4-i)+' — '+criterion.join(' / ');label.append(p)}}}const td=cell(tr,'');const input=document.createElement('select');input.setAttribute('aria-label','Draft rating '+slot.number);input.append(new Option('—',''));for(let n=slot.min;n<=slot.max;n++)input.append(new Option(String(n),String(n)));input.onchange=update;td.append(input);$('teacherDraftRows').append(tr)}
 update();
 if(worksheet.key!=='mathematics'||!slots.every(s=>s.sourceText))return;
 const args=worksheetSelection(),request=worksheetRequest;
 const fields=[...$('teacherDraftRows').querySelectorAll('select')];
 fields.forEach(el=>el.disabled=true);$('teacherDate').disabled=true;
 $('teacherDraftSaveStatus').textContent='सुरक्षित Draft जाँच हुँदैछ…';
 try{
  await verify();args.assertCurrent();
  const saved=await loadMathAssessmentDraft(args);args.assertCurrent();
  worksheetRevision=saved?.revision??0;
  if(saved){$('teacherDate').value=saved.date;fields.forEach((el,i)=>el.value=saved.ratings[i]==='_'?'':saved.ratings[i]);update()}
  $('teacherDraftSaveStatus').textContent=saved?'Draft Revision '+saved.revision+' पुनः लोड भयो।':'नयाँ निजी Draft।';
  $('teacherSaveDraft').disabled=false;
 }catch(e){if(request===worksheetRequest)$('teacherDraftSaveStatus').textContent='Draft खोल्न सकिएन: '+neError(e)}
 finally{if(request===worksheetRequest){fields.forEach(el=>el.disabled=false);$('teacherDate').disabled=false}}
}
function worksheetSelection(){
 const request=worksheetRequest,member=actor,model=worksheet,studentId=$('teacherStudent').value,themeIndex=Number($('teacherTheme').value);
 const assertCurrent=()=>{if(request!==worksheetRequest||actor!==member||worksheet!==model||!member||auth.currentUser?.uid!==member.uid||$('teacherStudent').value!==studentId||Number($('teacherTheme').value)!==themeIndex)throw Error('Worksheet selection changed')};
 return {db,api,auth,actor:member,model,studentId,themeIndex,assertCurrent};
}
$('teacherSaveDraft').onclick=async()=>{
 if(worksheetRevision===null||$('teacherSaveDraft').disabled)return;
 const args=worksheetSelection(),request=worksheetRequest,expectedRevision=worksheetRevision;
 const fields=[...$('teacherDraftRows').querySelectorAll('select')],ratings=fields.map(el=>el.value||'_').join(''),date=$('teacherDate').value.trim();
 try{validateMathDraftValues({ratings,date,count:fields.length})}catch{
  $('teacherDraftSaveStatus').textContent='२०८३ सालको मिति YYYY-MM-DD ढाँचामा र कम्तीमा एउटा १–४ प्राप्ताङ्क राख्नुहोस्।';return;
 }
 $('teacherSaveDraft').disabled=true;fields.forEach(el=>el.disabled=true);$('teacherDate').disabled=true;
 try{
  await verify();args.assertCurrent();
  const saved=await saveMathAssessmentDraft({...args,ratings,date,expectedRevision});args.assertCurrent();
  worksheetRevision=saved.revision;$('teacherDraftSaveStatus').textContent='Draft Revision '+saved.revision+' सुरक्षित भयो। यो आधिकारिक मूल्याङ्कन होइन।';
  $('teacherSaveDraft').disabled=false;
 }catch(e){if(request===worksheetRequest){worksheetRevision=null;$('teacherDraftSaveStatus').textContent='Draft सुरक्षित भएको पुष्टि भएन। मिति र अङ्क जाँच्नुहोस्; विद्यार्थी वा थिम पुनः खोलेर सुरक्षित Revision जाँच्नुहोस्। '+neError(e)}}
 finally{if(request===worksheetRequest){fields.forEach(el=>el.disabled=false);$('teacherDate').disabled=false}}
};
$('teacherStudent').onchange=renderTeacherDraft;$('teacherTheme').onchange=renderTeacherDraft;
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
function clearPrint(){document.body.classList.remove('portfolio-printing');$('portfolioPrint').replaceChildren();$('portfolioPrint').hidden=true}
function resetPortfolio(){
 clearPrint();
 portfolioEpoch++;$('portfolioRows').replaceChildren();$('indicatorRows').replaceChildren();$('portfolioStudent').replaceChildren();$('portfolioStudent').disabled=true;$('portfolioRead').disabled=true;$('portfolioExport').disabled=true;$('indicatorRead').disabled=true;$('indicatorExport').disabled=true;$('portfolioWordOrdinary').disabled=$('portfolioPrintOrdinary').disabled=true;$('portfolioWordIndicators').disabled=$('portfolioPrintIndicators').disabled=true;$('portfolioStatus').textContent='';
}
$('portfolioGrade').onchange=resetPortfolio;
$('portfolioStudent').onchange=()=>{clearPrint();portfolioEpoch++;$('portfolioRows').replaceChildren();$('indicatorRows').replaceChildren();$('portfolioStatus').textContent='';$('portfolioRead').disabled=!$('portfolioStudent').value;$('portfolioExport').disabled=$('portfolioWordOrdinary').disabled=$('portfolioPrintOrdinary').disabled=!$('portfolioStudent').value;$('indicatorRead').disabled=$('indicatorExport').disabled=$('portfolioWordIndicators').disabled=$('portfolioPrintIndicators').disabled=!$('portfolioStudent').value||!['1','2','3'].includes($('portfolioGrade').value)};
$('portfolioRoster').onclick=async()=>{
 resetPortfolio();const request=portfolioEpoch,member=actor,grade=$('portfolioGrade').value;
 const check=()=>{if(request!==portfolioEpoch||actor!==member||!member||auth.currentUser?.uid!==member.uid||$('portfolioGrade').value!==grade)throw Error('Portfolio selection changed')};
 try{
  await verify();check();
  if(!['school_admin','viewer'].includes(member.role))throw Error('Admin or Viewer required');
  $('portfolioStatus').textContent='विद्यार्थी सूची लोड हुँदैछ…';
  const roster=await loadCompleteClassRoster({db,api,actor:member,schoolId:member.schoolId,classId:grade,activeOnly:true});check();await verify();check();
  $('portfolioStudent').replaceChildren(...roster.students.map(s=>new Option(String(s.nameEnglish??s.name??s.id),s.id)));
  $('portfolioStudent').disabled=false;$('portfolioRead').disabled=!$('portfolioStudent').value;$('portfolioExport').disabled=$('portfolioWordOrdinary').disabled=$('portfolioPrintOrdinary').disabled=!$('portfolioStudent').value;$('indicatorRead').disabled=$('indicatorExport').disabled=$('portfolioWordIndicators').disabled=$('portfolioPrintIndicators').disabled=!$('portfolioStudent').value||!['1','2','3'].includes($('portfolioGrade').value);$('portfolioStatus').textContent=roster.count+' विद्यार्थी उपलब्ध छन्।';
 }catch(e){if(request===portfolioEpoch){resetPortfolio();$('portfolioStatus').textContent='विद्यार्थी सूची खोल्न सकिएन: '+neError(e)}}
};
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
async function printPortfolio(kind){
 clearPrint();
 const request=++portfolioEpoch,member=actor,grade=$('portfolioGrade').value,studentId=$('portfolioStudent').value;
 const check=()=>{if(request!==portfolioEpoch||actor!==member||!member||auth.currentUser?.uid!==member.uid||$('portfolioGrade').value!==grade||$('portfolioStudent').value!==studentId)throw Error('Portfolio selection changed')};
 $('portfolioStatus').textContent='प्रिन्टका लागि सुरक्षित अभिलेख जाँच हुँदैछ…';
 try{
  await verify();check();
  const model=await readPortfolioPrintModel({db,api,actor:member,schoolId:member.schoolId,grade,studentId,assertCurrent:check},kind);
  await verify();check();
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
  check();root.hidden=false;document.body.classList.add('portfolio-printing');
  try{window.print()}finally{clearPrint()}
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
 actor={...session,active:true};
 authSdk.onAuthStateChanged(auth,user=>{if(actor&&user?.uid!==actor.uid){clear();$('status').textContent='लगइन परिवर्तन भयो। Dashboard बाट पुनः खोल्नुहोस्।'}});
 const response=await fetch('./primary-assessment-reference-2083.json',{cache:'no-store'});if(!response.ok)throw Error('Reference file unavailable');
 catalogue=await response.json();await verify();
 $('identity').textContent='Academic Year 2083 · V47 · '+sid;$('referenceArea').hidden=false;$('portfolioArea').hidden=!['school_admin','viewer'].includes(actor.role);$('teacherWorksheet').hidden=actor.role!=='teacher';$('status').textContent='विद्यालयको अनुमति पुष्टि भयो।';
 const member=actor;bindVerifiedModuleActivity(member,()=>actor===member);fill();
}catch(e){clear();$('status').textContent='Dashboard बाट प्रमाणित विद्यालयमा लगइन गरी पुनः खोल्नुहोस्: '+neError(e)}
