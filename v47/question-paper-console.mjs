import {neError} from './nepali-feedback.mjs';
// School-verified, read-only CDC links and original SMSS practice questions.
// Never imports V46's project-global Firebase question-paper writer.
import {connectSchoolFirebase,startVerifiedSchoolActivity,enforceSchoolIdle} from './school-firebase-client.mjs';
import {verifySchoolSession} from './verified-school-session.mjs';
import {validateSchoolId} from './school-paths.mjs';
import {prepareCdcSourceCatalog,prepareReadOnlyPracticePaper,recommendedPracticeIndices,printReadOnlyPracticePaper} from './question-paper-cdc-preview.mjs';
import {exportPracticeDocx} from './practice-docx-export.mjs';
import {generateMathPractice,printMathPractice} from './optional-math-practice-preview.mjs';
import {grade9PracticeLanguages,grade9PracticeTopics,grade9PracticeCapacity,generateGrade9CurriculumPractice} from './grade9-curriculum-practice.mjs';
import {renderGrade9GridLibrary} from './cdc-grade9-grid-library.mjs';
import {computerGridReference,generateComputerPractice} from './computer-grid-practice.mjs';
import {practiceUnitOptions,generatePracticePreview} from './automatic-practice-preview.mjs';
import {listOriginalPracticeChoices,summarizeOriginalPracticeSelection,MAX_PRACTICE_SELECTION} from './practice-question-selection.mjs';
const $=id=>document.getElementById(id);
const requestedSchool=new URL(location.href).searchParams.get('schoolId');
const status=text=>{$('message').textContent=text};
let auth,authSdk,db,api,actor=null,school=null,schoolId=null,register=null,paper=null,practicePack=null,practiceChoices=[],selectedQuestions=new Set();
const PRACTICE_PACK_FILE=Object.freeze({8:'cdc-grade8-science-practice-pack-v1.json',10:'cdc-grade10-science-practice-pack-v1.json'});
let epoch=0,previewVersion=0,busy=false,loading=false;
let translations=null;const practiceHistory=new Map();
function clearPreview(){
 previewVersion++;paper=null;practicePack=null;translations=null;$('autoPracticeArea').hidden=true;$('autoPracticeUnits').replaceChildren();$('generatePractice').disabled=true;practiceChoices=[];selectedQuestions.clear();
 $('practiceSelection').hidden=true;$('practiceQuestionList').replaceChildren();
 $('practiceUnitFilter').replaceChildren();$('practiceTypeFilter').value='';
 $('updatePractice').disabled=true;$('practiceSelectionCount').textContent='No practice questions selected.';
 $('paperFrame').onload=null;$('paperFrame').removeAttribute('srcdoc');
 $('paperFrame').dataset.loadedVersion='';$('printPractice').disabled=true;$('downloadPracticeDocx').disabled=true;
 $('paperStatus').textContent='No practice preview prepared.';
}
function reset(){
 epoch++;clearPreview();actor=null;schoolId=null;school=null;register=null;loading=false;practiceHistory.clear();$('grade9CurriculumArea').hidden=true;$('grade9CurriculumTopics').replaceChildren();$('grade9CurriculumStatus').textContent='';$('grade9CurriculumCapacity').textContent='';$('generateGrade9Curriculum').disabled=true;$('mathPracticeArea').hidden=true;$('mathPracticeStatus').textContent='';$('grade9GridLibrary').replaceChildren();$('grade9GridLibraryStatus').textContent='';$('computerGridTable').replaceChildren();$('computerGenerateArea').hidden=true;$('computerGridStatus').textContent='';
 $('resourceArea').hidden=true;$('sourceList').replaceChildren();$('logout').disabled=true;
 $('identity').textContent='No verified school';$('sourceStatus').textContent='No sources loaded.';
}
const readDocument=async path=>{
 const snap=await api.getDocFromServer(api.doc(db,...path.split('/')));
 return snap.exists()?snap.data():null;
};
function assertSame(request,member){
 if(epoch!==request||actor!==member||schoolId!==member.schoolId||auth?.currentUser?.uid!==member.uid)
  throw Error('School Login changed during preview');
}
async function verifyAgain(request,member){
 assertSame(request,member);
 if(!await enforceSchoolIdle(auth,authSdk))throw Error('Login expired after inactivity');
 const fresh=await verifySchoolSession({schoolId:member.schoolId,uid:member.uid,readDocument});
 assertSame(request,member);
 if(fresh.role!==member.role)throw Error('School role changed');
}
const fetchJson=async name=>{
 const response=await fetch('./'+name,{cache:'no-store',credentials:'same-origin'});
 if(!response.ok)throw Error('Local V46 resource unavailable: '+name);
 return response.json();
};
function renderSources(){
 if(!register||!actor)return;
 const selected=$('grade').value;
 const catalog=prepareCdcSourceCatalog(register,{grade:selected||undefined});
 const root=$('sourceList');root.replaceChildren();
 for(const entry of catalog.sources){
  const div=document.createElement('div');div.className='source';
  const link=document.createElement('a');link.href=entry.url;link.target='_blank';link.rel='noopener noreferrer';
  link.textContent=entry.subject;
  const detail=document.createElement('small');
  detail.textContent='Class '+entry.grades.join(', ')+' · '+entry.version+' · '+entry.kind+' · '+entry.status;
  div.append(link,detail);root.append(div);
 }
 $('sourceStatus').textContent=catalog.sources.length+' V46 CDC source references. Last checked: '+String(catalog.checkedOn??'unknown')+'. Not a complete official blueprint.';
}
function displayPaper(){
 if(!paper||!actor)return;
 const version=++previewVersion,frame=$('paperFrame');
 const options={paper,showAnswers:$('showAnswers').checked};
 const html=paper.questionFormat==='cdc_optional_math_composite'?printMathPractice(options):printReadOnlyPracticePaper(options);
 frame.onload=null;delete frame.dataset.loadedVersion;
 $('printPractice').disabled=true;$('downloadPracticeDocx').disabled=true;
 $('paperStatus').textContent='Unreviewed preview loading. No paper saved.';
 frame.onload=()=>{
  if(version!==previewVersion||!paper||!actor||auth?.currentUser?.uid!==actor.uid)return;
  frame.dataset.loadedVersion=String(version);$('printPractice').disabled=false;$('downloadPracticeDocx').disabled=false;
  $('paperStatus').textContent='Class '+paper.grade+' — '+paper.questionCount+' original questions / '+paper.totalMarks+' marks. Teacher review required. NOT OFFICIAL.';
 };
 frame.srcdoc=html;
}
$('connect').onclick=async()=>{
 if(auth)return;
 try{
  ({auth,authSdk,db,api}=await connectSchoolFirebase());
  authSdk.onAuthStateChanged(auth,user=>{if(actor&&user?.uid!==actor.uid){reset();status('विद्यालय Login परिवर्तन भयो। पुनः प्रमाणित गर्नुहोस्।')}});
  $('connect').disabled=true;$('login').disabled=false;
  if(requestedSchool)try{$('schoolId').value=validateSchoolId(requestedSchool)}catch(e){status('विद्यालय ID अमान्य: '+neError(e))}
  status('V47 जडान भयो। School Login प्रमाणित गर्नुहोस्।');
 }catch(e){status('V47 जडान असफल: '+neError(e))}
};
$('login').onclick=async()=>{
 if(!auth||busy)return;
 reset();const request=epoch;busy=true;$('login').disabled=true;
 try{
  const sid=validateSchoolId($('schoolId').value.trim());
  const fresh=!auth.currentUser;
  const credential=fresh?await authSdk.signInWithEmailAndPassword(auth,$('email').value,$('password').value):{user:auth.currentUser};
  $('password').value='';
  const uid=credential.user.uid;
  const access=await verifySchoolSession({schoolId:sid,uid,readDocument});
  const schoolDoc=await readDocument('schools/'+sid);
  if(request!==epoch||auth.currentUser?.uid!==uid||!schoolDoc||schoolDoc.id!==sid||schoolDoc.active!==true)
   throw Error('School Login or membership changed');
  actor={uid,role:access.role,schoolId:sid,active:true};schoolId=sid;school=schoolDoc;
  if(fresh)startVerifiedSchoolActivity();
  $('identity').textContent=String(school.name??sid)+' · '+sid+' · '+access.role;
  $('logout').disabled=false;
  register=await fetchJson('cdc-source-register-2083.json');
  assertSame(request,actor);await verifyAgain(request,actor);
  $('resourceArea').hidden=false;renderSources();renderComputerGrid();$('mathPracticeArea').hidden=actor.role==='viewer';$('grade9CurriculumArea').hidden=actor.role==='viewer';renderGrade9CurriculumTopics();await loadGrade9GridLibrary(request,actor);
  status('स्रोत सूची खुल्यो। प्रश्नपत्र प्रकाशन वा Firestore Write हुँदैन।');
 }catch(e){
  if(request===epoch){reset();try{await authSdk.signOut(auth)}catch{}status('स्रोत खोल्न सकिएन: '+neError(e))}
 }finally{busy=false;$('login').disabled=!auth}
};
$('logout').onclick=async()=>{
 reset();
 try{if(auth)await authSdk.signOut(auth);status('Logout सफल भयो।')}
 catch(e){status('Logout असफल: '+neError(e))}
};
$('grade').onchange=()=>{if(actor&&register)renderSources()};
async function loadPractice(grade){
 if(loading||busy||!actor)return;
 const request=epoch,member=actor;clearPreview();const version=previewVersion;
 loading=true;$('preview8').disabled=true;$('preview10').disabled=true;
 try{
  await verifyAgain(request,member);
  const file=PRACTICE_PACK_FILE[grade];
  if(!file)throw Error('Only verified V46 Grade 8/10 practice references are available');
  const [pack,translationRegister]=await Promise.all([fetchJson(file),fetchJson('cdc-science-bilingual-mcq-v1.json')]);
  assertSame(request,member);
  const indices=recommendedPracticeIndices(pack);
  const result=prepareReadOnlyPracticePaper({
   schoolId:member.schoolId,schoolName:String(school.name??''),pack,questionIndices:indices
  });
  if(result.grade!==grade)throw Error('Practice grade mismatch');
  await verifyAgain(request,member);
  if(version!==previewVersion)throw Error('Practice selection changed');
  initializeQuestionSelection(pack,indices);
  translations=translationRegister.translations;
  $('autoPracticeArea').hidden=member.role==='viewer';renderAutoUnits();
  paper=result;displayPaper();
  status('Original SMSS अभ्यास प्रश्नको पूर्वावलोकन तयार छ। Teacher Review आवश्यक छ।');
 }catch(e){
  if(request===epoch&&actor===member&&version===previewVersion){
   clearPreview();$('paperStatus').textContent='अभ्यास प्रश्नको पूर्वावलोकन रोकियो: '+neError(e);
   status('अभ्यास प्रश्न लोड हुन सकेन: '+neError(e));
  }
 }finally{loading=false;if(request===epoch){$('preview8').disabled=false;$('preview10').disabled=false}}
}
$('preview8').onclick=()=>loadPractice(8);
$('preview10').onclick=()=>loadPractice(10);

function invalidateSelectedPreview(){
 previewVersion++;paper=null;
 const frame=$('paperFrame');
 frame.onload=null;frame.removeAttribute('srcdoc');delete frame.dataset.loadedVersion;
 $('printPractice').disabled=true;$('downloadPracticeDocx').disabled=true;
 $('paperStatus').textContent='Selection changed. Review the selected questions before printing.';
}
function selectionSummary(){
 if(!practicePack)return;
 const selected=[...selectedQuestions].sort((a,b)=>a-b);
 const sum=summarizeOriginalPracticeSelection(practicePack,selected);
 $('updatePractice').disabled=!sum.valid||busy||loading;
 $('practiceSelectionCount').textContent=sum.selected+' selected / '+sum.totalMarks+
  ' marks. Maximum '+sum.maxQuestions+' questions and '+sum.maxMarks+
  ' marks. '+(sum.valid?'Click Update Unapproved Preview to apply changes.':'Select at least one question within the limits.');
}
function showQuestionChoices(){
 if(!practicePack||!actor)return;
 const unit=$('practiceUnitFilter').value,type=$('practiceTypeFilter').value;
 const parent=$('practiceQuestionList');parent.replaceChildren();
 for(const item of practiceChoices){
  if(unit&&item.unitCode!==unit||type&&item.questionType!==type)continue;
  const label=document.createElement('label');label.className='practiceChoice';
  const input=document.createElement('input');input.type='checkbox';
  input.checked=selectedQuestions.has(item.index);
  input.setAttribute('aria-label','Select original practice question '+(item.index+1));
  const description=document.createElement('span');
  description.textContent='#'+(item.index+1)+' · '+item.unitTitle+' · '+item.topicName+
   ' · '+item.questionType.toUpperCase()+' · '+item.marks+' marks · '+item.questionText;
  input.onchange=()=>{
   if(input.checked&&selectedQuestions.size>=MAX_PRACTICE_SELECTION){
    input.checked=false;
    $('practiceSelectionCount').textContent='Maximum 40 original practice questions can be selected.';
    return;
   }
   if(input.checked)selectedQuestions.add(item.index);
   else selectedQuestions.delete(item.index);
   invalidateSelectedPreview();selectionSummary();
  };
  label.append(input,description);parent.append(label);
 }
 selectionSummary();
}
function initializeQuestionSelection(pack,indices){
 practicePack=pack;
 practiceChoices=listOriginalPracticeChoices(pack);
 selectedQuestions=new Set(indices);
 const unitFilter=$('practiceUnitFilter');unitFilter.replaceChildren();
 const all=document.createElement('option');all.value='';all.textContent='All curriculum units';unitFilter.append(all);
 for(const unit of pack.units){
  const o=document.createElement('option');o.value=String(unit.unitCode);
  o.textContent=String(unit.unitCode)+' · '+unit.unitTitle;unitFilter.append(o);
 }
 $('practiceTypeFilter').value='';$('practiceSelection').hidden=false;
 showQuestionChoices();
}
$('restoreRecommendedPractice').onclick=()=>{
 if(!practicePack||!actor)return;
 selectedQuestions=new Set(recommendedPracticeIndices(practicePack));
 invalidateSelectedPreview();showQuestionChoices();
 status('अभ्यास प्रश्नको पहिलेकै नमुना छनोट पुनः राखियो। Preview फेरि Update गर्नुहोस्।');
};
$('clearPracticeSelection').onclick=()=>{
 if(!practicePack||!actor)return;
 selectedQuestions.clear();invalidateSelectedPreview();showQuestionChoices();
 status('प्रश्न छनोट खाली गरिएको छ। कुनै प्रश्नपत्र Save गरिएको छैन।');
};
$('practiceUnitFilter').onchange=showQuestionChoices;
$('practiceTypeFilter').onchange=showQuestionChoices;
$('updatePractice').onclick=async()=>{
 if(busy||loading||!practicePack||!actor)return;
 const request=epoch,member=actor,pack=practicePack,version=previewVersion;
 const selected=[...selectedQuestions].sort((a,b)=>a-b);
 const summary=summarizeOriginalPracticeSelection(pack,selected);
 if(!summary.valid){selectionSummary();return}
 busy=true;$('updatePractice').disabled=true;
 try{
  await verifyAgain(request,member);
  if(pack!==practicePack||version!==previewVersion)throw Error('Practice selection changed while verifying');
  const fresh=prepareReadOnlyPracticePaper({schoolId:member.schoolId,schoolName:String(school.name??''),
    pack,questionIndices:selected});
  assertSame(request,member);
  if(fresh.grade!==pack.gradeNumber||version!==previewVersion||pack!==practicePack)
   throw Error('Practice selection changed before preview');
  paper=fresh;displayPaper();
  status('छनोट गरेका मौलिक अभ्यास प्रश्नको पूर्वावलोकन तयार भयो। यो आधिकारिक प्रश्नपत्र होइन।');
 }catch(e){
  if(request===epoch&&actor===member){invalidateSelectedPreview();status('अभ्यास प्रश्नको चयन रोकियो: '+neError(e))}
 }finally{busy=false;if(request===epoch)selectionSummary()}
};

function renderAutoUnits(){
 if(!practicePack||!translations||!actor||actor.role==='viewer')return;
 const root=$('autoPracticeUnits');root.replaceChildren();
 try{
  const units=practiceUnitOptions({pack:practicePack,bilingual:translations,language:$('autoPracticeLanguage').value});
  for(const unit of units){const label=document.createElement('label');label.className='practiceChoice';const input=document.createElement('input');input.type='checkbox';input.value=unit.id;input.disabled=!unit.available;input.checked=!!unit.available;input.onchange=()=>{invalidateSelectedPreview();$('autoPracticeStatus').textContent='Unit छनोट परिवर्तन भयो। पुनः Generate गर्नुहोस्।';};const span=document.createElement('span');span.textContent=unit.name+' ('+unit.available+')';label.append(input,span);root.append(label)}
  $('generatePractice').disabled=!units.some(u=>u.available);$('autoPracticeStatus').textContent='Unit र पूर्णाङ्क छानेर अभ्यास प्रश्नपत्र बनाउनुहोस्।';
 }catch(e){$('generatePractice').disabled=true;$('autoPracticeStatus').textContent='प्रश्न उपलब्ध छैनन्: '+neError(e)}
}
$('autoPracticeLanguage').onchange=()=>{invalidateSelectedPreview();renderAutoUnits()};
$('autoPracticeMarks').oninput=()=>{invalidateSelectedPreview();$('autoPracticeStatus').textContent='पूर्णाङ्क परिवर्तन भयो। पुनः Generate गर्नुहोस्।'};
$('generatePractice').onclick=async()=>{
 if(busy||loading||!actor||actor.role==='viewer'||!practicePack||!translations)return;
 const request=epoch,member=actor,pack=practicePack,version=previewVersion;
 const topicIds=[...$('autoPracticeUnits').querySelectorAll('input:checked')].map(x=>x.value);
 const fullMarks=Number($('autoPracticeMarks').value),language=$('autoPracticeLanguage').value;
 const key=JSON.stringify([member.schoolId,pack.gradeNumber,language,fullMarks,topicIds]);
 busy=true;$('generatePractice').disabled=true;
 try{
  await verifyAgain(request,member);
  if(pack!==practicePack||version!==previewVersion)throw Error('Practice selection changed');
  const previous=practiceHistory.get(key)??[];
  const fresh=generatePracticePreview({schoolId:member.schoolId,schoolName:String(school.name??''),pack,bilingual:translations,topicIds,fullMarks,language,avoidSignatures:previous});
  assertSame(request,member);
  if(version!==previewVersion)throw Error('Practice selection changed');
  practiceHistory.set(key,[...previous,fresh.signature].slice(-30));paper=fresh;displayPaper();
  $('autoPracticeStatus').textContent='छानिएका Unit बाट '+fullMarks+' पूर्णाङ्कको नयाँ अभ्यास प्रश्नपत्र बन्यो। शिक्षकबाट समीक्षा आवश्यक छ।';
 }catch(e){if(epoch===request&&actor===member){invalidateSelectedPreview();$('autoPracticeStatus').textContent='छनोट गरिएको भाषा, Unit र पूर्णाङ्कमा फरक प्रश्नपत्र बनाउन पर्याप्त प्रश्न छैनन् वा अनुरोध असफल भयो। '+neError(e)}}
 finally{busy=false;if(epoch===request)$('generatePractice').disabled=false}
};
async function loadGrade9GridLibrary(request,member){
 const root=$('grade9GridLibrary'),status=$('grade9GridLibraryStatus');
 root.replaceChildren();status.textContent='Grid स्रोत लोड हुँदैछ…';
 try{
  const data=await fetchJson('cdc-grade9-source-register-pinned.json');
  assertSame(request,member);
  if(data?.schemaVersion!==1||!Array.isArray(data.sources)||data.sources.length!==40||data.sources.some(s=>!s.grades?.includes(9)))throw Error('Grade 9 source register mismatch');
  renderGrade9GridLibrary(root,data);
  status.textContent='११ विषयका स्रोत र उपलब्ध तालिका। पूर्ण आधिकारिक प्रमाणीकरण बाँकी छ।';
 }catch(e){if(epoch===request&&actor===member){root.replaceChildren();status.textContent='Grid Library लोड हुन सकेन: '+neError(e)}}
}
function renderComputerGrid(){
 if(!actor)return;
 const grade=Number($('computerGridClass').value),grid=computerGridReference(grade),root=$('computerGridTable');
 root.replaceChildren();
 const make=(tag,content,parent)=>{const el=document.createElement(tag);if(content!==null)el.textContent=String(content);parent.append(el);return el;};
 make('p','Full Marks: '+grid.fullMarks+' · Duration: '+grid.durationMinutes+' minutes',root);
 const a=make('a','Open original CDC PDF',root);a.href=grid.sourceUrl;a.target='_blank';a.rel='noopener noreferrer';
 const table=make('table',null,root);table.className='grid-table';
 const head=make('tr',null,make('thead',null,table));
 ['Unit',...['Knowledge','Understanding','Application','Higher'].flatMap(level=>['MCQ','Short','Long'].map(type=>level+' '+type)),'Marks'].forEach(v=>make('th',v,head));
 const body=make('tbody',null,table);
 for(const row of grid.units){const tr=make('tr',null,body);[row.code+'. '+row.name,...row.counts,row.marks].forEach(v=>make('td',v,tr))}
 const total=make('tr',null,body);['Total',...Array.from({length:12},(_,i)=>grid.units.reduce((n,u)=>n+u.counts[i],0)),50].forEach(v=>make('td',v,total));
 make('p','Knowledge 20% · Understanding 30% · Application 30% · Higher 20%',root);
 $('computerGenerateArea').hidden=grade!==9||actor.role==='viewer';
 $('computerGridStatus').textContent=grade===9?'कक्षा ९ का मौलिक प्रश्नबाट Grid मिल्ने अभ्यासपत्र बनाउन सकिन्छ।':'कक्षा १० को Grid मात्र उपलब्ध छ; प्रश्न बैंक तयार भएको छैन।';
}
$('computerGridClass').onchange=()=>{invalidateSelectedPreview();renderComputerGrid()};
$('computerLanguage').onchange=()=>{invalidateSelectedPreview();$('computerGridStatus').textContent='भाषा परिवर्तन भयो। पुनः Generate गर्नुहोस्।'};
$('generateComputer').onclick=async()=>{
 if(busy||loading||!actor||actor.role==='viewer'||$('computerGridClass').value!=='9')return;
 const request=epoch,member=actor,language=$('computerLanguage').value;
 clearPreview();const version=previewVersion,key=JSON.stringify([member.schoolId,'computer9',language,50]);
 busy=true;$('generateComputer').disabled=true;
 try{
  await verifyAgain(request,member);
  if(version!==previewVersion||$('computerGridClass').value!=='9')throw Error('Grid selection changed');
  const previous=practiceHistory.get(key)??[];
  const fresh=generateComputerPractice({schoolId:member.schoolId,schoolName:String(school.name??''),language,avoidSignatures:previous});
  assertSame(request,member);
  if(version!==previewVersion)throw Error('Grid selection changed');
  practiceHistory.set(key,[...previous,fresh.signature].slice(-30));paper=fresh;displayPaper();
  $('computerGridStatus').textContent='५० पूर्णाङ्क, २५ प्रश्न र सबै Grid कोष्ठ मिलेको अभ्यासपत्र बन्यो। वास्तविक परीक्षा अघि शिक्षक समीक्षा आवश्यक छ।';
 }catch(e){if(epoch===request&&actor===member){invalidateSelectedPreview();$('computerGridStatus').textContent='प्रश्नपत्र बनाउन सकिएन: '+neError(e)}}
 finally{busy=false;if(epoch===request)$('generateComputer').disabled=false}
};
$('mathPracticeLanguage').onchange=()=>{invalidateSelectedPreview();$('mathPracticeStatus').textContent='भाषा परिवर्तन भयो। पुनः Generate गर्नुहोस्।'};
$('generateMathPractice').onclick=async()=>{
 if(busy||loading||!actor||actor.role==='viewer')return;
 const request=epoch,member=actor,language=$('mathPracticeLanguage').value;
 clearPreview();const version=previewVersion,key=JSON.stringify([member.schoolId,'math9',language,75]);
 busy=true;$('generateMathPractice').disabled=true;
 try{
  await verifyAgain(request,member);
  if(version!==previewVersion)throw Error('Math selection changed');
  const previous=practiceHistory.get(key)??[];
  const fresh=generateMathPractice({schoolId:member.schoolId,schoolName:String(school.name??''),language,avoidSignatures:previous});
  assertSame(request,member);
  if(version!==previewVersion)throw Error('Math selection changed');
  practiceHistory.set(key,[...previous,fresh.signature].slice(-30));paper=fresh;displayPaper();
  $('mathPracticeStatus').textContent='७५ पूर्णाङ्कको Grid मिलेको अभ्यासपत्र बन्यो। शिक्षक समीक्षा आवश्यक छ।';
 }catch(e){if(epoch===request&&actor===member){invalidateSelectedPreview();$('mathPracticeStatus').textContent='अभ्यासपत्र बनाउन सकिएन: '+neError(e)}}
 finally{busy=false;if(epoch===request)$('generateMathPractice').disabled=false}
};
function refreshGrade9Capacity(){
 const btn=$('generateGrade9Curriculum'),out=$('grade9CurriculumCapacity'),marks=$('grade9CurriculumMarks');
 btn.disabled=true;
 if(!actor||actor.role==='viewer'){out.textContent='';return}
 const key=$('grade9CurriculumSubject').value,language=$('grade9CurriculumLanguage').value;
 marks.max=key==='health'?'50':'75';
 const topicIds=[...$('grade9CurriculumTopics').querySelectorAll('input:checked')].map(x=>x.value);
 try{
  const result=grade9PracticeCapacity({key,language,topicIds,fullMarks:Number(marks.value)});
  const numbers=result.possible.join(', ');
  out.textContent=topicIds.length?'छानिएका '+result.topicCount+' Topic; उपलब्ध '+result.questionCount+' प्रश्न ('+result.availableMarks+' अङ्क)। मिल्न सक्ने पूर्णाङ्क: '+(numbers||'कुनै छैन')+'. '+(result.canGenerate?'छनोट मिल्यो; फरक प्रश्नपत्रका लागि प्रश्न पर्याप्त हुनुपर्छ।':'पूर्णाङ्क वा Topic परिवर्तन गर्नुहोस्।'):'कम्तीमा एउटा Topic छान्नुहोस्।';
  btn.disabled=!result.canGenerate;
 }catch(e){out.textContent='छनोट जाँच्न सकिएन: '+neError(e)}
}
function renderGrade9CurriculumTopics(){
 if(!actor||actor.role==='viewer')return;
 const key=$('grade9CurriculumSubject').value,lang=$('grade9CurriculumLanguage');
 const allowed=grade9PracticeLanguages(key);
 for(const o of lang.options)o.disabled=!allowed.includes(o.value);
 if(!allowed.includes(lang.value))lang.value=allowed.includes('both')?'both':allowed[0];
 const root=$('grade9CurriculumTopics');root.replaceChildren();
 try{
  const units=grade9PracticeTopics(key,lang.value);
  for(const unit of units){const h=document.createElement('h4');h.textContent=unit.name;root.append(h);
   for(const topic of unit.topics){const label=document.createElement('label');label.className='practiceChoice';const input=document.createElement('input');input.type='checkbox';input.value=topic.id;input.disabled=!topic.available;input.onchange=()=>{invalidateSelectedPreview();$('grade9CurriculumStatus').textContent='Topic छनोट परिवर्तन भयो।'};const span=document.createElement('span');span.textContent=topic.name+' ('+topic.available+')';label.append(input,span);root.append(label)}
  }
  $('grade9CurriculumStatus').textContent='आवश्यक Topic र पूर्णाङ्क छान्नुहोस्। उपलब्ध प्रश्न पर्याप्त नभए प्रणालीले रोक्छ।';refreshGrade9Capacity();
 }catch(e){$('grade9CurriculumStatus').textContent='स्रोत खोल्न सकिएन: '+neError(e)}
}
$('grade9CurriculumSubject').onchange=$('grade9CurriculumLanguage').onchange=()=>{invalidateSelectedPreview();renderGrade9CurriculumTopics()};
$('grade9CurriculumMarks').oninput=()=>{invalidateSelectedPreview();$('grade9CurriculumStatus').textContent='पूर्णाङ्क परिवर्तन भयो।'};
$('generateGrade9Curriculum').onclick=async()=>{
 if(busy||loading||!actor||actor.role==='viewer')return;
 const request=epoch,member=actor,key=$('grade9CurriculumSubject').value,language=$('grade9CurriculumLanguage').value,fullMarks=Number($('grade9CurriculumMarks').value);
 const topicIds=[...$('grade9CurriculumTopics').querySelectorAll('input:checked')].map(x=>x.value);
 clearPreview();const version=previewVersion,historyKey=JSON.stringify([member.schoolId,'grade9curriculum',key,language,fullMarks,topicIds]);
 busy=true;$('generateGrade9Curriculum').disabled=true;
 try{
  await verifyAgain(request,member);
  if(version!==previewVersion)throw Error('Selection changed');
  const previous=practiceHistory.get(historyKey)??[];
  const fresh=generateGrade9CurriculumPractice({schoolId:member.schoolId,schoolName:String(school.name??''),key,language,topicIds,fullMarks,avoidSignatures:previous});
  assertSame(request,member);if(version!==previewVersion)throw Error('Selection changed');
  practiceHistory.set(historyKey,[...previous,fresh.signature].slice(-30));paper=fresh;displayPaper();
  $('grade9CurriculumStatus').textContent='अभ्यासपत्र तयार भयो। वर्तमान CDC Grid प्रमाणीकरण बाँकी छ।';
 }catch(e){if(epoch===request&&actor===member){invalidateSelectedPreview();$('grade9CurriculumStatus').textContent='छनोटमा पर्याप्त फरक प्रश्न छैनन् वा अनुरोध असफल भयो: '+neError(e)}}
 finally{busy=false;if(epoch===request)refreshGrade9Capacity()}
};
$('showAnswers').onchange=()=>{if(paper)displayPaper()};
$('downloadPracticeDocx').onclick=async()=>{
 if(busy||loading||!paper||$('downloadPracticeDocx').disabled||!actor)return;
 const request=epoch,member=actor,version=previewVersion,selected=paper,frame=$('paperFrame');
 const check=()=>{assertSame(request,member);if(version!==previewVersion||paper!==selected||frame.dataset.loadedVersion!==String(version)||!frame.contentDocument)throw Error('Practice preview changed')};
 busy=true;$('downloadPracticeDocx').disabled=true;
 try{
  await verifyAgain(request,member);check();
  const bytes=await exportPracticeDocx({document:frame.contentDocument,paper:selected,assertCurrent:check});
  await verifyAgain(request,member);check();
  const blob=new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  try{a.href=url;a.download='UNREVIEWED-Class-'+selected.grade+'-Practice'+($('showAnswers').checked?'-Answers':'')+'.docx';document.body.append(a);a.click()}finally{a.remove();URL.revokeObjectURL(url)}
  status('अभ्यासपत्रको Word फाइल तयार भयो।');
 }catch(e){if(epoch===request&&actor===member){clearPreview();status('Word निर्यात रोकियो: '+neError(e))}}
 finally{busy=false;if(epoch===request&&paper===selected&&frame.dataset.loadedVersion===String(version))$('downloadPracticeDocx').disabled=false}
};
$('printPractice').onclick=async()=>{
 if(!paper||$('printPractice').disabled||!actor)return;
 const request=epoch,member=actor,version=previewVersion;
 try{
  await verifyAgain(request,member);
  const frame=$('paperFrame');
  if(version!==previewVersion||frame.dataset.loadedVersion!==String(version)||
     !frame.contentWindow)throw Error('Practice preview not ready for printing');
  frame.contentWindow.focus();frame.contentWindow.print();
 }catch(e){clearPreview();status('अभ्यास प्रश्नको छपाइ रोकियो: '+neError(e))}
};
if(requestedSchool)queueMicrotask(()=>$('connect').click());
