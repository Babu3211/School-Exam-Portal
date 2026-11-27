import './iemis-direct-transfer-keys.js';
import {createV47IemisReader} from './iemis-direct-saved-marks.mjs';
import {combineTerminalGradeSheets} from './iemis-grade-sheet-print-preview.mjs';
import {neError} from './nepali-feedback.mjs';
import {connectSchoolFirebase,startVerifiedSchoolActivity,enforceSchoolIdle,bindVerifiedModuleActivity} from './school-firebase-client.mjs';
import {verifySchoolSession} from './verified-school-session.mjs';
import {validateSchoolId} from './school-paths.mjs';
import {listScopedReportExams} from './scoped-legacy-report-exam.mjs';
import {loadVerifiedLegacyGradeReport} from './verified-legacy-grade-report.mjs';
import {loadSparkCommittedReport} from './spark-committed-report.mjs';
import {loadSparkDraftReport} from './spark-draft-report.mjs';
import {loadCommittedReportPreview} from './committed-report-client.mjs';
import {legacyGradePreviewExcel} from './legacy-grade-report-preview.mjs';
const $=id=>document.getElementById(id),status=s=>{$('message').textContent=s};
const reportMode=['number','entry'].includes(document.documentElement.dataset.report)?document.documentElement.dataset.report:'grade';
const requestedSchool=new URL(location.href).searchParams.get('schoolId');
let auth,authSdk,api,db,actor=null,schoolId=null,sessionSeq=0,reviewSeq=0,sheetSeq=0,loading=false,busy=false,report=null;
const readDocument=async path=>{const snap=await api.getDocFromServer(api.doc(db,...path.split('/')));return snap.exists()?snap.data():null};
const pairSelect=$('terminalSecondStudent');
function resetPair(){if(pairSelect){pairSelect.replaceChildren(new Option('Single Grade Sheet',''));pairSelect.disabled=true;$('terminalPairArea').hidden=true}}
function selectedPair(){return pairSelect?.value||''}
function sheetKey(){return JSON.stringify([$('student').value,selectedPair()])}
function selectedSheet(){return selectedPair()?combineTerminalGradeSheets(id=>report.printFor(id),[$('student').value,selectedPair()],$('term').value):report.printFor($('student').value)}
function clearReview(){
 resetPair();
 reviewSeq++;sheetSeq++;report=null;$('cancel').disabled=true;$('ledgerArea').hidden=true;$('sheetArea').hidden=true;
 $('student').replaceChildren();$('student').disabled=true;$('gradeOutput').replaceChildren();
 $('previewSheet').disabled=true;$('printSheet').disabled=true;$('exportExcel').disabled=true;
 $('sheetFrame').onload=null;delete $('sheetFrame').dataset.loadedStudent;delete $('sheetFrame').dataset.loadedSelection;$('sheetFrame').removeAttribute('srcdoc');$('sheetStatus').textContent='';
 $('progress').textContent='सम्पूर्ण कक्षाको पूर्वावलोकन लोड भएको छैन।';
}
function resetExamSelection(){ $('legacyExam').replaceChildren(new Option('Automatic (Term only)','')); $('legacyExam').disabled=true; $('legacyExamArea').hidden=$('reportSource').value!=='legacy'; }
function clearSession(){sessionSeq++;clearReview();$('reportSource').value='legacy';resetExamSelection();$('reportSource').querySelector('option[value="draft"]').disabled=true;actor=null;schoolId=null;$('reportArea').hidden=true;$('logout').disabled=true}
function assertCurrent(seq,review,member,klass,term){
 if(seq!==sessionSeq||review!==reviewSeq||actor!==member||schoolId!==member.schoolId||
  auth?.currentUser?.uid!==member.uid||$('schoolClass').value!==klass||$('term').value!==term)
  throw Error('School Login, class or term changed during review');
}
async function verifyAgain(member,seq,review,klass,term){
 assertCurrent(seq,review,member,klass,term);
 if(!await enforceSchoolIdle(auth,authSdk))throw Error('Login expired after inactivity');
 const session=await verifySchoolSession({schoolId:member.schoolId,uid:member.uid,readDocument});
 assertCurrent(seq,review,member,klass,term);
 if(session.role!==member.role)throw Error('School membership changed');
}
$('connect').onclick=async()=>{
 if(auth)return;
 try{
  ({auth,authSdk,db,api}=await connectSchoolFirebase());
  authSdk.onAuthStateChanged(auth,user=>{if(actor&&user?.uid!==actor.uid){clearSession();status('Login परिवर्तन भयो। पुनः प्रमाणित गर्नुहोस्।')}});
  $('connect').disabled=true;$('login').disabled=false;
  if(requestedSchool)try{$('schoolId').value=validateSchoolId(requestedSchool)}catch(e){status('विद्यालय छनोट अमान्य: '+neError(e))}
  status('V47 जडान भयो। School Login प्रमाणित गर्नुहोस्।');
 }catch(e){status('जडान असफल: '+neError(e))}
};
$('login').onclick=async()=>{
 if(busy||loading||!auth)return;
 clearSession();const seq=sessionSeq;busy=true;$('login').disabled=true;
 try{
  const sid=validateSchoolId($('schoolId').value.trim());
  const fresh=!auth.currentUser;
  const credential=fresh?await authSdk.signInWithEmailAndPassword(auth,$('email').value,$('password').value):{user:auth.currentUser};
  $('password').value='';const uid=credential.user.uid;
  const session=await verifySchoolSession({schoolId:sid,uid,readDocument});
  const school=await readDocument('schools/'+sid);
  if(seq!==sessionSeq||auth.currentUser?.uid!==uid||!school||school.id!==sid||school.active!==true)throw Error('School sign-in changed');
  actor={uid,schoolId:sid,role:session.role,active:true};schoolId=sid;
  $('reportSource').querySelector('option[value="draft"]').disabled=session.role!=='school_admin';
  if(fresh)startVerifiedSchoolActivity();{const activityMember=actor;bindVerifiedModuleActivity(activityMember,()=>actor===activityMember&&auth?.currentUser?.uid===activityMember.uid);}
  $('verifiedLabel').textContent=String(school.name??sid)+' · '+sid+' · '+session.role;
  $('reportArea').hidden=false;$('logout').disabled=false;status('विद्यालय प्रमाणित भयो।');
 }catch(e){if(seq===sessionSeq){clearSession();try{await authSdk.signOut(auth)}catch{}status('Login असफल: '+neError(e))}}
 finally{busy=false;$('login').disabled=!auth}
};
$('logout').onclick=async()=>{clearSession();try{if(auth)await authSdk.signOut(auth);status('Logout सफल भयो।')}catch(e){status('Logout असफल: '+neError(e))}};
const resetReportFilters=()=>{clearReview();resetExamSelection()};
$('schoolClass').onchange=resetReportFilters;$('term').onchange=resetReportFilters;$('reportSource').onchange=resetReportFilters;
$('legacyExam').onchange=clearReview;
$('loadLegacyExams').onclick=async()=>{
 if(!actor||busy||loading||$('reportSource').value!=='legacy')return;
 clearReview();resetExamSelection();const seq=sessionSeq,review=reviewSeq,member=actor,klass=$('schoolClass').value,term=$('term').value;
 const check=()=>{assertCurrent(seq,review,member,klass,term);if($('reportSource').value!=='legacy')throw Error('Report source changed')};
 $('loadLegacyExams').disabled=true;
 try{
  await verifyAgain(member,seq,review,klass,term);
  const rows=await listScopedReportExams({db,api,actor:member,schoolId:member.schoolId,classNo:klass,term,assertCurrent:check});check();
  for(const r of rows)$('legacyExam').append(new Option(r.label+' · '+r.id,r.id));
  $('legacyExam').append(new Option('Canonical term record',term));
  $('legacyExam').disabled=false;
  status(rows.length+' पुराना परीक्षा अभिलेख भेटिए। आवश्यक परे मूल परीक्षा छान्नुहोस्।');
 }catch(e){if(seq===sessionSeq&&review===reviewSeq)status('परीक्षा सूची खोल्न सकिएन: '+neError(e))}
 finally{$('loadLegacyExams').disabled=false}
};
$('cancel').onclick=()=>{clearReview();status('हेर्न मात्र मिल्ने समीक्षा रद्द भयो। कुनै अङ्क परिवर्तन गरिएको छैन।')};
function showSheet(){
 const seq=++sheetSeq,frame=$('sheetFrame'),studentId=$('student').value,selection=sheetKey();
 frame.onload=null;delete frame.dataset.loadedStudent;delete frame.dataset.loadedSelection;$('printSheet').disabled=true;
 if(!report){frame.removeAttribute('srcdoc');return}
 try{
  const doc=selectedSheet();
  if(!doc.ready){frame.removeAttribute('srcdoc');$('sheetStatus').textContent=doc.reason;return}
  $('sheetStatus').textContent='वाटरमार्कसहितको पूर्वावलोकन लोड हुँदैछ। आधिकारिक प्रयोगका लागि मान्य छैन।';
  frame.onload=()=>{
   if(sheetSeq!==seq||!report||sheetKey()!==selection)return;
   frame.dataset.loadedStudent=studentId;frame.dataset.loadedSelection=selection;
   $('printSheet').disabled=false;
   $('sheetStatus').textContent='पूर्वावलोकन मात्र — आधिकारिक प्रयोगका लागि मान्य छैन।';
  };
  frame.srcdoc=doc.html;
 }catch(e){frame.removeAttribute('srcdoc');$('sheetStatus').textContent=neError(e)}
}
$('load').onclick=async()=>{
 if(loading||busy||!actor)return;
 clearReview();const seq=sessionSeq,review=reviewSeq,member=actor,klass=$('schoolClass').value,term=$('term').value;
 const source=$('reportSource').value,selectedExamId=source==='legacy'?$('legacyExam').value||null:null;
 const check=()=>{assertCurrent(seq,review,member,klass,term);if($('reportSource').value!==source||source==='legacy'&&($('legacyExam').value||null)!==selectedExamId)throw Error('Report source changed')};
 loading=true;$('load').disabled=true;$('cancel').disabled=false;
 try{
  await verifyAgain(member,seq,review,klass,term);
  const data=source==='sparkCommitted'?await loadSparkCommittedReport({db,api,auth,actor:member,schoolId:member.schoolId,classNo:klass,term,assertCurrent:check,onProgress:s=>{check();$('progress').textContent=s}}):source==='draft'?await loadSparkDraftReport({db,api,auth,actor:member,schoolId:member.schoolId,classNo:klass,term,assertCurrent:check,onProgress:s=>{check();$('progress').textContent=s}}):source==='committed'
   ?await loadCommittedReportPreview({schoolId:member.schoolId,classNo:klass,term,
    getIdToken:()=>auth.currentUser.getIdToken(),fetchImpl:(...args)=>fetch(...args),assertCurrent:check})
   :source==='legacy'?await loadVerifiedLegacyGradeReport({db,api:{...api,getDocs:api.getDocsFromServer},auth,actor:member,schoolId:member.schoolId,
   classNo:klass,term,selectedExamId,readDocument,assertCurrent:check,
   onProgress:s=>{check();$('progress').textContent=s}}):null;
  if(!data)throw Error('Unknown report source');
  await verifyAgain(member,seq,review,klass,term);
  check();report=data;
  $('progress').textContent=data.rosterCount+' विद्यार्थी / '+data.subjectCount+' विषय — मिल्ने सबै अङ्क अभिलेख जाँचिए।';
  // iemisLedger HTML cells are escaped by the original V46 rendering module.
  const table=document.createElement('table'),thead=document.createElement('thead'),tbody=document.createElement('tbody');
  const selectedLedger=data.ledgers?.[reportMode];
  if(!selectedLedger)throw Error('Verified V46 ledger mode missing');
  thead.innerHTML=selectedLedger.head;tbody.innerHTML=selectedLedger.body;table.append(thead,tbody);
  $('gradeOutput').replaceChildren(table);$('ledgerArea').hidden=false;$('exportExcel').disabled=false;
  for(const st of data.students){const option=document.createElement('option');option.value=st.id;option.textContent=String(st.nameEnglish??st.name??st.id);$('student').append(option)}
  $('student').disabled=false;$('previewSheet').disabled=false;$('sheetArea').hidden=false;refreshPairOptions();showSheet();
  status((source==='sparkCommitted'?'V47 को प्रमाणित प्रकाशन अभिलेख':source==='draft'?'V47 का निजी सुरक्षित मस्यौदा':source==='committed'?'V47 का प्रकाशित अङ्क':'V46 IEMIS का शीर्षकगत अङ्क')+' बाट read-only पूर्वावलोकन तयार भयो। यो आधिकारिक नतिजा होइन।');
 }catch(e){if(seq===sessionSeq&&review===reviewSeq){clearReview();$('progress').textContent='पूर्वावलोकन रोकियो: '+neError(e);status('पूर्ण Grade Preview उपलब्ध छैन: '+neError(e))}}
 finally{loading=false;$('load').disabled=!actor;$('cancel').disabled=true}
};
function refreshPairOptions(){
 if(!pairSelect)return;
 const second=selectedPair(),first=$('student').value;
 const eligible=report&&['1st','2nd','3rd'].includes($('term').value)&&report.students.length>1;
 pairSelect.replaceChildren(new Option('Single Grade Sheet',''));
 if(eligible)for(const st of report.students){if(st.id!==first)pairSelect.append(new Option(String(st.nameEnglish??st.name??st.id),st.id))}
 if([...pairSelect.options].some(o=>o.value===second))pairSelect.value=second;
 pairSelect.disabled=!eligible;$('terminalPairArea').hidden=!eligible;
}
$('student').onchange=()=>{refreshPairOptions();showSheet()};$('previewSheet').onclick=showSheet;
if(pairSelect)pairSelect.onchange=showSheet;
$('printSheet').onclick=async()=>{
 if(!report||$('printSheet').disabled)return;
 const seq=sessionSeq,review=reviewSeq,member=actor,klass=$('schoolClass').value,term=$('term').value;
 try{
  await verifyAgain(member,seq,review,klass,term);
  const frame=$('sheetFrame'),studentId=$('student').value;
  if($('printSheet').disabled||frame.dataset.loadedStudent!==studentId||frame.dataset.loadedSelection!==sheetKey())
   throw Error('Grade Sheet preview is not loaded for this student');
  const print=selectedSheet();
  if(!print.ready)throw Error(print.reason);
  if(!frame.contentWindow)throw Error('Print frame unavailable');
  if(selectedPair()){
   const cards=frame.contentDocument?.querySelectorAll('.terminal-pair>.sheet');
   if(cards?.length!==2||[...cards].some(card=>card.getBoundingClientRect().height>198*96/25.4+1))throw Error('दुईवटा Grade Sheet एउटै पृष्ठमा अटेनन्। छुट्टाछुट्टै छाप्नुहोस्।');
  }
  frame.contentWindow.focus();frame.contentWindow.print();
 }catch(e){clearReview();status('छपाइ रोकियो: '+neError(e))}
};
$('exportExcel').onclick=async()=>{
 if(!report||$('exportExcel').disabled)return;
 const seq=sessionSeq,review=reviewSeq,member=actor,klass=$('schoolClass').value,term=$('term').value;
 $('exportExcel').disabled=true;
 try{
  await verifyAgain(member,seq,review,klass,term);
  const blob=legacyGradePreviewExcel(report,reportMode);
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  try{
   link.href=url;link.download='smss-v47-UNAPPROVED-'+({grade:'grade-ledger',number:'mark-ledger',entry:'mark-entry-ledger'}[reportMode])+'-'+member.schoolId+'-'+klass+'-'+term+(report.examId&&report.examId!==term?'-'+report.examId:'')+'.xlsx';
   document.body.append(link);link.click();
  }finally{link.remove();URL.revokeObjectURL(url)}
  status('Excel पूर्वावलोकन निकालियो। यो आधिकारिक Ledger होइन।');
 }catch(e){if(seq===sessionSeq&&review===reviewSeq){clearReview();status('Excel निर्यात रोकियो: '+neError(e))}}
 finally{if(seq===sessionSeq)$('exportExcel').disabled=!report}
};
if(requestedSchool)queueMicrotask(()=>$('connect').click());

// Direct IEMIS read is limited to a live, verified school admin report session.
// The reader rechecks membership, idle timeout, tenant, year and exam scope on every request.
if (!Object.hasOwn(globalThis,'__SMSS_IEMIS_READ_SAVED_V1__')) {
 Object.defineProperty(globalThis,'__SMSS_IEMIS_READ_SAVED_V1__',{value:createV47IemisReader({getWorkspace:()=>({auth,authSdk,api,db,actor,schoolId,sessionSeq}),verifySchoolSession,enforceSchoolIdle,T:globalThis.SmssIemisTransfer}),configurable:true,writable:false,enumerable:false});
}
