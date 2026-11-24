import {neError} from './nepali-feedback.mjs';
// School-verified, read-only CDC links and original SMSS practice questions.
// Never imports V46's project-global Firebase question-paper writer.
import {connectSchoolFirebase,startVerifiedSchoolActivity,enforceSchoolIdle} from './school-firebase-client.mjs';
import {verifySchoolSession} from './verified-school-session.mjs';
import {validateSchoolId} from './school-paths.mjs';
import {prepareCdcSourceCatalog,prepareReadOnlyPracticePaper,recommendedPracticeIndices,printReadOnlyPracticePaper} from './question-paper-cdc-preview.mjs';
import {listOriginalPracticeChoices,summarizeOriginalPracticeSelection,MAX_PRACTICE_SELECTION} from './practice-question-selection.mjs';
const $=id=>document.getElementById(id);
const requestedSchool=new URL(location.href).searchParams.get('schoolId');
const status=text=>{$('message').textContent=text};
let auth,authSdk,db,api,actor=null,school=null,schoolId=null,register=null,paper=null,practicePack=null,practiceChoices=[],selectedQuestions=new Set();
const PRACTICE_PACK_FILE=Object.freeze({8:'cdc-grade8-science-practice-pack-v1.json',10:'cdc-grade10-science-practice-pack-v1.json'});
let epoch=0,previewVersion=0,busy=false,loading=false;
function clearPreview(){
 previewVersion++;paper=null;practicePack=null;practiceChoices=[];selectedQuestions.clear();
 $('practiceSelection').hidden=true;$('practiceQuestionList').replaceChildren();
 $('practiceUnitFilter').replaceChildren();$('practiceTypeFilter').value='';
 $('updatePractice').disabled=true;$('practiceSelectionCount').textContent='No practice questions selected.';
 $('paperFrame').onload=null;$('paperFrame').removeAttribute('srcdoc');
 $('paperFrame').dataset.loadedVersion='';$('printPractice').disabled=true;
 $('paperStatus').textContent='No practice preview prepared.';
}
function reset(){
 epoch++;clearPreview();actor=null;schoolId=null;school=null;register=null;loading=false;
 $('resourceArea').hidden=true;$('sourceList').replaceChildren();$('logout').disabled=true;
 $('identity').textContent='No verified school';$('sourceStatus').textContent='No sources loaded.';
}
const readDocument=async path=>{
 const snap=await api.getDoc(api.doc(db,...path.split('/')));
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
 const html=printReadOnlyPracticePaper({paper,showAnswers:$('showAnswers').checked});
 frame.onload=null;delete frame.dataset.loadedVersion;
 $('printPractice').disabled=true;
 $('paperStatus').textContent='Unreviewed preview loading. No paper saved.';
 frame.onload=()=>{
  if(version!==previewVersion||!paper||!actor||auth?.currentUser?.uid!==actor.uid)return;
  frame.dataset.loadedVersion=String(version);$('printPractice').disabled=false;
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
  $('resourceArea').hidden=false;renderSources();
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
  const pack=await fetchJson(file);
  assertSame(request,member);
  const indices=recommendedPracticeIndices(pack);
  const result=prepareReadOnlyPracticePaper({
   schoolId:member.schoolId,schoolName:String(school.name??''),pack,questionIndices:indices
  });
  if(result.grade!==grade)throw Error('Practice grade mismatch');
  await verifyAgain(request,member);
  if(version!==previewVersion)throw Error('Practice selection changed');
  initializeQuestionSelection(pack,indices);
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
 $('printPractice').disabled=true;
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

$('showAnswers').onchange=()=>{if(paper)displayPaper()};
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
