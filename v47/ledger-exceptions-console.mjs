import {neError} from './nepali-feedback.mjs';
import {assertLedgerReviewExportable} from './ledger-review-gate.mjs';
import {validateSchoolId} from './school-paths.mjs';
import {buildRawLedgerPreview} from './raw-ledger-preview.mjs';
import {excelWorkbook} from './excel-workbook.mjs';
import {validateLedgerReviewPage} from './ledger-review-page-guard.mjs';
import {connectSchoolFirebase,startVerifiedSchoolActivity,bindVerifiedModuleActivity} from './school-firebase-client.mjs';
import {verifySchoolSession} from './verified-school-session.mjs';
const $=id=>document.getElementById(id),status=message=>{$('message').textContent=message};
let auth,authSdk,api,db,actor,schoolId,epoch=0,busy=false,preview=null;
function reset(){epoch++;actor=null;schoolId=null;preview=null;busy=false;$('cancel').disabled=true;$('work').hidden=true;$('logout').disabled=true;$('export').disabled=true;$('rows').replaceChildren();$('summary').textContent='No review loaded';$('issues').textContent='';}
function lock(value){busy=value;$('cancel').disabled=!value;$('load').disabled=value||!actor;$('export').disabled=value||!preview||!actor;$('logout').disabled=!actor;$('schoolClass').disabled=value;$('term').disabled=value;}
$('connect').onclick=async()=>{try{
 ({auth,authSdk,db,api}=await connectSchoolFirebase());
 authSdk.onAuthStateChanged(auth,user=>{if(actor&&user?.uid!==actor.uid){reset();status('लगइन परिवर्तन भयो। फेरि लगइन गर्नुहोस्।')}});
 $('connect').disabled=true;$('login').disabled=false;
 status('छुट्टै V47 Firebase परियोजनामा जडान भयो।');
}catch(error){status('जडान असफल: '+neError(error))}};
$('login').onclick=async()=>{
 if(busy||!auth)return;
 reset();const attempt=epoch;$('login').disabled=true;
 let freshSignIn=false,loginUid=null;
 try{
  const id=validateSchoolId($('schoolId').value.trim());
  freshSignIn=!auth.currentUser;
  const credential=freshSignIn
   ?await authSdk.signInWithEmailAndPassword(auth,$('email').value,$('password').value)
   :{user:auth.currentUser};
  $('password').value='';
  loginUid=credential.user.uid;
  if(attempt!==epoch){if(freshSignIn&&auth.currentUser?.uid===loginUid)await authSdk.signOut(auth);return}
  const session=await verifySchoolSession({schoolId:id,uid:loginUid,readDocument:async path=>{
   const snap=await api.getDoc(api.doc(db,...path.split('/')));
   return snap.exists()?snap.data():null;
  }});
  if(attempt!==epoch||auth.currentUser?.uid!==loginUid){if(freshSignIn&&auth.currentUser?.uid===loginUid)await authSdk.signOut(auth);return}
  if(!['school_admin','teacher','viewer'].includes(session.role))throw new Error('School membership required');
  const school=await api.getDoc(api.doc(db,'schools',id));
  if(attempt!==epoch||auth.currentUser?.uid!==loginUid)return;
  if(!school.exists()||school.data().active!==true||school.data().id!==id)throw new Error('School unavailable');
  actor={schoolId:id,role:session.role,active:true,uid:loginUid};schoolId=id;
  if(freshSignIn)startVerifiedSchoolActivity();{const activityMember=actor;bindVerifiedModuleActivity(activityMember,()=>actor===activityMember&&auth?.currentUser?.uid===activityMember.uid);}
  $('heading').textContent='Missing marks — '+String(school.data().name??id);
  $('work').hidden=false;lock(false);
  status('लगइन सफल भयो। कक्षा र परीक्षा अवधि छानेर समीक्षा गर्नुहोस्।');
 }catch(error){
  if(attempt===epoch){reset();try{if(auth?.currentUser)await authSdk.signOut(auth)}catch{}status('लगइन असफल: '+neError(error))}
 }finally{$('login').disabled=false}
};
$('logout').onclick=async()=>{reset();try{await authSdk.signOut(auth);status('सफलतापूर्वक लगआउट भयो।')}catch(e){status('लगआउट असफल: '+neError(e))}};
async function confirmMembership(expectedSchoolId,expectedUid){
 const session=await verifySchoolSession({schoolId:expectedSchoolId,uid:expectedUid,readDocument:async path=>{
  const snap=await api.getDoc(api.doc(db,...path.split('/')));
  return snap.exists()?snap.data():null;
 }});
 if(auth?.currentUser?.uid!==expectedUid||actor?.uid!==expectedUid||
  actor?.schoolId!==expectedSchoolId||actor?.role!==session.role)
  throw new Error('School access changed; sign in again');
 return true;
}
const REVIEW_LIMITS=Object.freeze({students:2000,subjects:300,subject_assignments:20000,marks:20000,component_marks:20000});
async function fetchAll(collection,schoolClass,term,attempt){const expectedActor=actor,expectedSchoolId=schoolId,expectedUid=actor?.uid;const maxRecords=REVIEW_LIMITS[collection];if(!maxRecords)throw new Error('Unsupported review collection');let cursor=null,rows=[];do{const filters=[api.where('class','==',schoolClass)];if(collection==='marks'||collection==='component_marks')filters.push(api.where('term','==',term));filters.push(api.orderBy('__name__'),api.limit(100));if(cursor)filters.push(api.startAfter(cursor));const snap=await api.getDocs(api.query(api.collection(db,'schools',schoolId,collection),...filters));if(attempt!==epoch||actor!==expectedActor||schoolId!==expectedSchoolId||auth?.currentUser?.uid!==expectedUid||$('schoolClass').value!==schoolClass||$('term').value!==term)throw new Error('Review changed or signed out');const checked=validateLedgerReviewPage({docs:snap.docs,schoolId:expectedSchoolId,schoolClass,term,collection,previousId:cursor?.id??null});rows.push(...checked);$('summary').textContent='Loading '+collection+': '+rows.length+' records read (maximum '+maxRecords+' for '+collection+')…';if(rows.length>maxRecords)throw new Error('Review exceeds '+maxRecords+' '+collection+' records; export disabled to avoid incomplete results');if(attempt!==epoch||actor!==expectedActor||schoolId!==expectedSchoolId||auth?.currentUser?.uid!==expectedUid)throw new Error('Review session changed');cursor=snap.docs.length===100?snap.docs.at(-1):null}while(cursor);return rows}
$('cancel').onclick=()=>{if(!busy)return;epoch++;preview=null;lock(false);$('rows').replaceChildren();$('summary').textContent='Review cancelled; no partial results retained';$('issues').textContent='';status('समीक्षा रद्द भयो। कुनै अभिलेख परिवर्तन भएको छैन।')};
function invalidate(){epoch++;preview=null;busy=false;lock(false);$('export').disabled=true;$('rows').replaceChildren();$('summary').textContent='Selection changed; reload review';$('issues').textContent=''}
$('schoolClass').onchange=invalidate;$('term').onchange=invalidate;
$('load').onclick=async()=>{if(busy||!actor)return;const attempt=++epoch,schoolClass=$('schoolClass').value,term=$('term').value;preview=null;lock(true);$('rows').replaceChildren();$('summary').textContent='Loading class-scoped records…';try{const [students,subjects,assignments,rawMarks,componentMarks]=await Promise.all([fetchAll('students',schoolClass,term,attempt),fetchAll('subjects',schoolClass,term,attempt),fetchAll('subject_assignments',schoolClass,term,attempt),fetchAll('marks',schoolClass,term,attempt),fetchAll('component_marks',schoolClass,term,attempt)]);if(attempt!==epoch||!actor)return;await confirmMembership(schoolId,actor.uid);if(attempt!==epoch||!actor)return;const result=buildRawLedgerPreview({schoolClass,term,students,subjects,assignments,rawMarks,componentMarks,allPagesLoaded:true});let exportAllowed=true,exportBlockReason='';try{assertLedgerReviewExportable(result)}catch(error){exportAllowed=false;exportBlockReason=error.message}preview=exportAllowed?result:null;for(const item of result.invalidOrMissingDetails){const tr=document.createElement('tr');for(const value of [item.studentName+' ('+item.studentId+')',item.subjectName+' ('+item.subjectId+')',item.reason]){const td=document.createElement('td');td.textContent=value;tr.append(td)}$('rows').append(tr)}$('summary').textContent=result.summary.students+' students, '+result.summary.assignedPairs+' assigned pairs, '+result.summary.invalidOrMissingPairs+' missing/invalid pairs';$('issues').textContent='Audit issues: '+(result.issues.join(', ')||'none')+'. Diagnostic only; no official grades.';status(exportAllowed?'Read-only class review loaded. No records modified.':'Read-only diagnostics loaded, but Excel export blocked: '+exportBlockReason)}catch(e){if(attempt===epoch){preview=null;$('summary').textContent='Review incomplete; export disabled';status('समीक्षा असफल: '+neError(e))}}finally{if(attempt===epoch)lock(false)}};
$('export').onclick=async()=>{if(!actor||busy||!preview)return;const attempt=epoch,expectedSchoolId=schoolId,expectedUid=actor.uid,selectedActor=actor,selectedPreview=preview;lock(true);try{await confirmMembership(expectedSchoolId,expectedUid);if(attempt!==epoch||actor!==selectedActor||actor.uid!==expectedUid||schoolId!==expectedSchoolId||preview!==selectedPreview)return;const columns=['Class','Term','Student ID','Student Name','Subject ID','Subject Name','Issue'];const workbook=excelWorkbook(columns,selectedPreview.invalidOrMissingDetails.map(item=>[selectedPreview.schoolClass,selectedPreview.term,item.studentId,item.studentName,item.subjectId,item.subjectName,item.reason]),{sheetName:'Missing Marks'}),url=URL.createObjectURL(workbook),link=document.createElement('a');link.href=url;link.download='smss-v47-missing-marks-'+schoolId+'-'+preview.schoolClass+'-'+preview.term+'.xlsx';document.body.append(link);link.click();link.remove();URL.revokeObjectURL(url);status('जाँचमा भेटिएका असङ्गत अभिलेखको Excel निर्यात भयो। यो आधिकारिक नतिजा होइन।')}catch(e){if(attempt===epoch){preview=null;status('निर्यात रोकियो: '+neError(e))}}finally{if(attempt===epoch)lock(false)}};
