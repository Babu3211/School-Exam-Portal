// Read-only School Admin review. No Firestore write/import/approval API.
import {connectSchoolFirebase,startVerifiedSchoolActivity,enforceSchoolIdle} from './school-firebase-client.mjs';
import {verifySchoolSession} from './verified-school-session.mjs';
import {validateSchoolId} from './school-paths.mjs';
import {loadSchoolAdminTeacherDraftReview} from './school-admin-teacher-draft-review.mjs';
import {teacherDraftReviewExcel} from './teacher-draft-review-excel.mjs';
const $=id=>document.getElementById(id);
const requestedSchool=new URL(location.href).searchParams.get('schoolId');
let auth,authSdk,db,api,actor=null,schoolId=null,epoch=0,busy=false,requestId=0,verifiedSelection=null,verifiedRevision=null;
const status=msg=>{$('loginStatus').textContent=msg};
function clearReview(msg=''){
 requestId++;verifiedSelection=null;verifiedRevision=null;$('exportDraft').disabled=true;
 $('reviewHeader').replaceChildren();$('reviewRows').replaceChildren();
 $('reviewStatus').textContent=msg;
}
function clearSession(){
 epoch++;actor=null;schoolId=null;clearReview('विद्यालय प्रशासकको सत्र प्रमाणित गर्न आवश्यक छ।');
 $('reviewArea').hidden=true;$('logout').disabled=true;$('schoolId').disabled=false;
}
const readDocument=async path=>{
 const snap=await api.getDoc(api.doc(db,...path.split('/')));
 return snap.exists()?snap.data():null;
};
async function reverifyAdmin(uid,id){
 const session=await verifySchoolSession({schoolId:id,uid,readDocument});
 if(auth?.currentUser?.uid!==uid||session.role!=='school_admin')
  throw Error('Active School Admin membership required');
}
$('connect').onclick=async()=>{
 if(auth)return;
 $('connect').disabled=true;
 try{
  ({auth,authSdk,db,api}=await connectSchoolFirebase());
  authSdk.onAuthStateChanged(auth,user=>{
   if(actor&&user?.uid!==actor.uid){clearSession();status('Login परिवर्तन भयो। फेरि लगइन गर्नुहोस्।')}
  });
  $('login').disabled=false;
  status('Connected to separate V47 Firebase project.');
  if(requestedSchool){
   $('schoolId').value=validateSchoolId(requestedSchool);
   $('adminBack').href='./school-admin.html?schoolId='+encodeURIComponent(requestedSchool);
   if(auth.currentUser)queueMicrotask(()=>$('login').click());
  }
 }catch(e){$('connect').disabled=false;status('Connection failed: '+e.message)}
};
$('login').onclick=async()=>{
 if(busy||!auth)return;
 busy=true;clearSession();const current=epoch;
 $('login').disabled=true;
 try{
  const id=validateSchoolId($('schoolId').value.trim());
  const existing=!!auth.currentUser;
  const user=existing?auth.currentUser:(await authSdk.signInWithEmailAndPassword(
   auth,$('email').value,$('password').value)).user;
  $('password').value='';
  if(current!==epoch)throw Error('Login changed');
  await reverifyAdmin(user.uid,id);
  if(current!==epoch||id!==$('schoolId').value.trim())throw Error('School selection changed');
  actor={uid:user.uid,role:'school_admin',active:true,schoolId:id};
  schoolId=id;$('schoolId').disabled=true;if(!existing)startVerifiedSchoolActivity();
  $('reviewArea').hidden=false;$('logout').disabled=false;
  $('adminBack').href='./school-admin.html?schoolId='+encodeURIComponent(id);
  status('School Admin verified for school '+id+'. Reviews are read-only.');
 }catch(e){
  if(current===epoch){clearSession();status('Verification failed: '+e.message)}
 }finally{busy=false;$('login').disabled=!auth}
};
$('logout').onclick=async()=>{
 if(busy)return;
 clearSession();
 try{if(auth)await authSdk.signOut(auth);status('Signed out')}catch(e){status('Sign out failed: '+e.message)}
};
for(const id of ['teacherUid','classId','subjectId','examId']){
 $(id).addEventListener('input',()=>clearReview('Selection changed. Verify the Draft again.'));
 $(id).addEventListener('change',()=>clearReview('Selection changed. Verify the Draft again.'));
}
$('review').onclick=async()=>{
 if(busy||!actor)return;
 busy=true;clearReview('Teacher Draft र अधिकार जाँच हुँदैछन्…');
 const request=requestId,current=epoch,selected=actor,id=schoolId;
 const selection={
  teacherUid:$('teacherUid').value.trim(),classId:$('classId').value,
  subjectId:$('subjectId').value.trim(),examId:$('examId').value
 };
 const check=()=>{
  if(current!==epoch||request!==requestId||actor!==selected||schoolId!==id||$('schoolId').value.trim()!==id||
   auth?.currentUser?.uid!==selected.uid||
   Object.entries(selection).some(([field,value])=>$(field).value.trim()!==value))
   throw Error('Login or selection changed; reload Draft');
 };
 $('review').disabled=true;
 try{
  check();
  if(!await enforceSchoolIdle(auth,authSdk))throw Error('Login expired after one hour inactivity');
  check();await reverifyAdmin(selected.uid,id);check();
  const result=await loadSchoolAdminTeacherDraftReview({
   db,api,auth,actor:selected,schoolId:id,...selection,assertSession:check
  });
  check();
  if(!result.found){$('reviewStatus').textContent='यस शिक्षक, कक्षा, विषय र Term को Draft भेटिएन। कुनै अंक परिवर्तन गरिएको छैन।';return}
  const fields=['Student','Student ID','Absent',...result.components.map(c=>c.name+' / '+c.fullMarks),'Total'];
  const header=document.createDocumentFragment();
  for(const field of fields){const th=document.createElement('th');th.textContent=field;header.append(th)}
  const rows=document.createDocumentFragment();
  for(const entry of result.entries){
   const tr=document.createElement('tr');
   const cells=[entry.studentName,entry.studentId,entry.isAbsent?'Yes':'No',
    ...result.components.map(c=>entry.isAbsent?'—':String(entry.values[c.key])),
    entry.isAbsent?'—':String(entry.totalObtained)];
   for(const value of cells){const td=document.createElement('td');td.textContent=value;tr.append(td)}
   rows.append(tr);
  }
  check();$('reviewHeader').append(header);$('reviewRows').append(rows);
  verifiedSelection=Object.freeze({...selection});verifiedRevision=result.revision;
  $('exportDraft').disabled=false;
  $('reviewStatus').textContent='प्रमाणित Draft Revision '+result.revision+' · '+result.rosterCount+
   ' विद्यार्थी · '+result.subjectName+' · Read-only, NOT official/published.';
 }catch(e){if(current===epoch&&request===requestId){
  clearReview('Review रोकियो: '+e.message+' पुनः प्रमाणित गरेर खोल्नुहोस्।');
 }}finally{busy=false;$('review').disabled=!actor}
};
$('exportDraft').onclick=async()=>{
 if(busy||!actor||!verifiedSelection||verifiedRevision===null)return;
 busy=true;$('exportDraft').disabled=true;
 const current=epoch,request=requestId,selected=actor,id=schoolId,
  selection=verifiedSelection,revision=verifiedRevision;
 const check=()=>{
  if(epoch!==current||requestId!==request||actor!==selected||schoolId!==id||
     auth?.currentUser?.uid!==selected.uid||$('schoolId').value.trim()!==id||
     Object.entries(selection).some(([field,value])=>$(field).value.trim()!==value))
   throw Error('Session or Draft selection changed');
 };
 try{
  check();
  if(!await enforceSchoolIdle(auth,authSdk))throw Error('Login expired');
  check();await reverifyAdmin(selected.uid,id);check();
  // A fresh authoritative read prevents exporting a cached, now revoked Draft.
  const fresh=await loadSchoolAdminTeacherDraftReview({
   db,api,auth,actor:selected,schoolId:id,...selection,assertSession:check
  });
  check();
  if(!fresh.found||fresh.revision!==revision)throw Error('Draft revision changed; review again');
  const file=teacherDraftReviewExcel(fresh);
  check();
  const url=URL.createObjectURL(file.blob),a=document.createElement('a');
  try{
   check();a.href=url;a.download=file.filename;document.body.append(a);a.click();
  }finally{a.remove();URL.revokeObjectURL(url)}
  $('reviewStatus').textContent='Draft Excel: '+file.count+
   ' विद्यार्थी · Revision '+revision+' · NOT OFFICIAL / NOT PUBLISHED.';
 }catch(e){if(current===epoch&&request===requestId)
  clearReview('Excel Export रोकियो: '+e.message+'। फेरि Draft Review गर्नुहोस्।');
 }finally{busy=false;$('exportDraft').disabled=!verifiedSelection||verifiedRevision===null}
};
if(requestedSchool)queueMicrotask(()=>$('connect').click());
