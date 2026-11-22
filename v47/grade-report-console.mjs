import {connectSchoolFirebase,startVerifiedSchoolActivity,enforceSchoolIdle} from './school-firebase-client.mjs';
import {verifySchoolSession} from './verified-school-session.mjs';
import {validateSchoolId} from './school-paths.mjs';
import {loadVerifiedLegacyGradeReport} from './verified-legacy-grade-report.mjs';
import {legacyGradePreviewExcel} from './legacy-grade-report-preview.mjs';
const $=id=>document.getElementById(id),status=s=>{$('message').textContent=s};
const requestedSchool=new URL(location.href).searchParams.get('schoolId');
let auth,authSdk,api,db,actor=null,schoolId=null,sessionSeq=0,reviewSeq=0,loading=false,busy=false,report=null;
const readDocument=async path=>{const snap=await api.getDoc(api.doc(db,...path.split('/')));return snap.exists()?snap.data():null};
function clearReview(){
 reviewSeq++;report=null;$('cancel').disabled=true;$('ledgerArea').hidden=true;$('sheetArea').hidden=true;
 $('student').replaceChildren();$('student').disabled=true;$('gradeOutput').replaceChildren();
 $('previewSheet').disabled=true;$('printSheet').disabled=true;$('exportExcel').disabled=true;
 $('sheetFrame').removeAttribute('srcdoc');$('sheetStatus').textContent='';
 $('progress').textContent='No complete-class preview loaded.';
}
function clearSession(){sessionSeq++;clearReview();actor=null;schoolId=null;$('reportArea').hidden=true;$('logout').disabled=true}
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
  if(requestedSchool)try{$('schoolId').value=validateSchoolId(requestedSchool)}catch(e){status('विद्यालय छनोट अमान्य: '+e.message)}
  status('V47 जडान भयो। School Login प्रमाणित गर्नुहोस्।');
 }catch(e){status('जडान असफल: '+e.message)}
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
  if(fresh)startVerifiedSchoolActivity();
  $('verifiedLabel').textContent=String(school.name??sid)+' · '+sid+' · '+session.role;
  $('reportArea').hidden=false;$('logout').disabled=false;status('विद्यालय प्रमाणित भयो।');
 }catch(e){if(seq===sessionSeq){clearSession();try{await authSdk.signOut(auth)}catch{}status('Login असफल: '+e.message)}}
 finally{busy=false;$('login').disabled=!auth}
};
$('logout').onclick=async()=>{clearSession();try{if(auth)await authSdk.signOut(auth);status('Logout सफल भयो।')}catch(e){status('Logout असफल: '+e.message)}};
$('schoolClass').onchange=clearReview;$('term').onchange=clearReview;
$('cancel').onclick=()=>{clearReview();status('Read-only review cancelled. कुनै अंक परिवर्तन गरिएको छैन।')};
function showSheet(){
 if(!report)return;
 try{
  const doc=report.printFor($('student').value);
  if(!doc.ready){$('printSheet').disabled=true;$('sheetFrame').removeAttribute('srcdoc');$('sheetStatus').textContent=doc.reason;return}
  $('sheetFrame').srcdoc=doc.html;$('printSheet').disabled=false;
  $('sheetStatus').textContent='PREVIEW ONLY — NOT VALID FOR OFFICIAL USE';
 }catch(e){$('printSheet').disabled=true;$('sheetFrame').removeAttribute('srcdoc');$('sheetStatus').textContent=e.message}
}
$('load').onclick=async()=>{
 if(loading||busy||!actor)return;
 clearReview();const seq=sessionSeq,review=reviewSeq,member=actor,klass=$('schoolClass').value,term=$('term').value;
 const check=()=>assertCurrent(seq,review,member,klass,term);
 loading=true;$('load').disabled=true;$('cancel').disabled=false;
 try{
  await verifyAgain(member,seq,review,klass,term);
  const data=await loadVerifiedLegacyGradeReport({db,api,auth,actor:member,schoolId:member.schoolId,
   classNo:klass,term,readDocument,assertCurrent:check,
   onProgress:s=>{check();$('progress').textContent=s}});
  check();report=data;
  $('progress').textContent=data.rosterCount+' students / '+data.subjectCount+' subjects — all compatible mark records checked.';
  // iemisLedger HTML cells are escaped by the original V46 rendering module.
  const table=document.createElement('table'),thead=document.createElement('thead'),tbody=document.createElement('tbody');
  thead.innerHTML=data.ledger.head;tbody.innerHTML=data.ledger.body;table.append(thead,tbody);
  $('gradeOutput').replaceChildren(table);$('ledgerArea').hidden=false;$('exportExcel').disabled=false;
  for(const st of data.students){const option=document.createElement('option');option.value=st.id;option.textContent=String(st.nameEnglish??st.name??st.id);$('student').append(option)}
  $('student').disabled=false;$('previewSheet').disabled=false;$('sheetArea').hidden=false;showSheet();
  status('V46 IEMIS component marks बाट read-only पूर्वावलोकन तयार भयो। यो आधिकारिक नतिजा होइन।');
 }catch(e){if(seq===sessionSeq&&review===reviewSeq){clearReview();$('progress').textContent='Preview blocked: '+e.message;status('पूर्ण Grade Preview उपलब्ध छैन: '+e.message)}}
 finally{loading=false;$('load').disabled=!actor;$('cancel').disabled=true}
};
$('student').onchange=showSheet;$('previewSheet').onclick=showSheet;
$('printSheet').onclick=async()=>{
 if(!report||$('printSheet').disabled)return;
 const seq=sessionSeq,review=reviewSeq,member=actor,klass=$('schoolClass').value,term=$('term').value;
 try{
  await verifyAgain(member,seq,review,klass,term);
  const print=report.printFor($('student').value);
  if(!print.ready)throw Error(print.reason);
  $('sheetFrame').contentWindow?.print();
 }catch(e){clearReview();status('Print blocked: '+e.message)}
};
$('exportExcel').onclick=async()=>{
 if(!report||$('exportExcel').disabled)return;
 const seq=sessionSeq,review=reviewSeq,member=actor,klass=$('schoolClass').value,term=$('term').value;
 $('exportExcel').disabled=true;
 try{
  await verifyAgain(member,seq,review,klass,term);
  const blob=legacyGradePreviewExcel(report);
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  try{
   link.href=url;link.download='smss-v47-UNAPPROVED-grade-ledger-'+member.schoolId+'-'+klass+'-'+term+'.xlsx';
   document.body.append(link);link.click();
  }finally{link.remove();URL.revokeObjectURL(url)}
  status('Excel पूर्वावलोकन निकालियो। आधिकारिक Grade Ledger होइन।');
 }catch(e){if(seq===sessionSeq&&review===reviewSeq){clearReview();status('Excel Export blocked: '+e.message)}}
 finally{if(seq===sessionSeq)$('exportExcel').disabled=!report}
};
if(requestedSchool)queueMicrotask(()=>$('connect').click());
