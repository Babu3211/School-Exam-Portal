import {saveVerifiedCompleteClassDraft} from './save-verified-class-draft.mjs';
import {sameMarkJson} from './mark-json-equality.mjs';
import {neError} from './nepali-feedback.mjs';
// School Admin review and explicit create-only transfer to Admin Draft; never official publication.
import {connectSchoolFirebase,startVerifiedSchoolActivity,enforceSchoolIdle,bindVerifiedModuleActivity} from './school-firebase-client.mjs';
import {verifySchoolSession} from './verified-school-session.mjs';
import {validateSchoolId} from './school-paths.mjs';
import {loadSchoolAdminTeacherDraftReview} from './school-admin-teacher-draft-review.mjs';
import {teacherDraftReviewExcel} from './teacher-draft-review-excel.mjs';
import {readSchoolSubjectCatalog} from './subject-catalog-view.mjs';
import {studentDisplayName} from './student-display-name.mjs';
const $=id=>document.getElementById(id);
const requestedSchool=new URL(location.href).searchParams.get('schoolId');
let auth,authSdk,db,api,actor=null,schoolId=null,epoch=0,busy=false,requestId=0,verifiedSelection=null,verifiedRevision=null,verifiedReview=null;
const status=msg=>{$('loginStatus').textContent=msg};
let assignmentRequest=0,reviewAssignments=[];
function clearAssignmentChoices(){assignmentRequest++;reviewAssignments=[];$('reviewAssignment').replaceChildren(new Option('Select an assignment',''));$('reviewAssignment').disabled=true;$('assignmentStatus').textContent='';}
$('classId').addEventListener('change',clearAssignmentChoices);
function clearReview(msg=''){
 requestId++;verifiedSelection=null;verifiedRevision=null;verifiedReview=null;$('copyDraft').disabled=true;$('exportDraft').disabled=true;
 $('reviewHeader').replaceChildren();$('reviewRows').replaceChildren();
 $('reviewStatus').textContent=msg;
}
function clearSession(){
 epoch++;actor=null;schoolId=null;clearAssignmentChoices();clearReview('विद्यालय प्रशासकको सत्र प्रमाणित गर्न आवश्यक छ।');
 $('reviewArea').hidden=true;$('logout').disabled=true;$('schoolId').disabled=false;
}
const readDocument=async path=>{
 const snap=await api.getDocFromServer(api.doc(db,...path.split('/')));
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
  status('छुट्टै V47 Firebase परियोजनामा जडान भयो।');
  if(requestedSchool){
   $('schoolId').value=validateSchoolId(requestedSchool);
   $('adminBack').href='./school-admin.html?schoolId='+encodeURIComponent(requestedSchool);
   if(auth.currentUser)queueMicrotask(()=>$('login').click());
  }
 }catch(e){$('connect').disabled=false;status('जडान असफल: '+neError(e))}
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
  schoolId=id;$('schoolId').disabled=true;if(!existing)startVerifiedSchoolActivity();{const activityMember=actor;bindVerifiedModuleActivity(activityMember,()=>actor===activityMember&&auth?.currentUser?.uid===activityMember.uid);}
  $('reviewArea').hidden=false;$('logout').disabled=false;
  $('adminBack').href='./school-admin.html?schoolId='+encodeURIComponent(id);
  status('विद्यालयको School Admin प्रमाणित भयो: '+id+'. Reviews are read-only.');
 }catch(e){
  if(current===epoch){clearSession();status('प्रमाणीकरण असफल: '+neError(e))}
 }finally{busy=false;$('login').disabled=!auth}
};
$('logout').onclick=async()=>{
 if(busy)return;
 clearSession();
 try{if(auth)await authSdk.signOut(auth);status('सफलतापूर्वक लगआउट भयो।')}catch(e){status('लगआउट असफल: '+neError(e))}
};
for(const id of ['teacherUid','classId','subjectId','examId']){
 $(id).addEventListener('input',()=>clearReview('Selection changed. Verify the Draft again.'));
 $(id).addEventListener('change',()=>clearReview('Selection changed. Verify the Draft again.'));
}
$('loadReviewAssignments').onclick=async()=>{
 if(busy||!actor)return;
 clearAssignmentChoices();clearReview();busy=true;
 const selected=actor,id=schoolId,cl=$('classId').value,current=epoch,request=assignmentRequest;
 const check=()=>{if(epoch!==current||assignmentRequest!==request||actor!==selected||auth?.currentUser?.uid!==selected.uid||schoolId!==id||$('classId').value!==cl)throw Error('School session changed');};
 $('loadReviewAssignments').disabled=true;$('assignmentStatus').textContent='तोकिएका शिक्षक र विषय जाँच हुँदैछन्…';
 try{
  if(!await enforceSchoolIdle(auth,authSdk))throw Error('Login expired');
  check();await reverifyAdmin(selected.uid,id);check();
  const subjects=await readSchoolSubjectCatalog({db,api,actor:selected,schoolId:id,schoolClass:cl,assertCurrent:check});
  const subjectMap=new Map(subjects.filter(x=>x.active===true).map(x=>[x.id,x.name]));
  const snap=await api.getDocsFromServer(api.query(api.collection(db,'schools',id,'teacher_assignments'),api.where('classId','==',cl),api.where('active','==',true),api.limit(201)));check();
  if(snap.docs.length>200)throw Error('Assignment selection exceeds safe limit');
  const candidates=[],seen=new Set(),uidPattern=/^[A-Za-z0-9_-]{1,128}$/;
  for(const doc of snap.docs){
   const x=doc.data();
   if(x.schoolId!==id||x.classId!==cl||x.active!==true||!uidPattern.test(x.uid??'')||!uidPattern.test(x.subjectId??'')||doc.id!==[id,x.uid,cl,x.subjectId].join(':')||seen.has(doc.id))throw Error('Invalid assignment identity');
   seen.add(doc.id);
   if(subjectMap.has(x.subjectId))candidates.push({uid:x.uid,subjectId:x.subjectId,subjectName:subjectMap.get(x.subjectId)});
  }
  const byUid=new Map();
  // At most 200 assignments; check each distinct membership once, and look up
  // only explicitly linked staff records (no whole-school staff scan).
  for(const uid of new Set(candidates.map(x=>x.uid))){
   check();
   const member=await api.getDocFromServer(api.doc(db,'schools',id,'members',uid));check();
   const m=member.exists()?member.data():null;
   if(!m||m.uid!==uid||m.schoolId!==id||m.role!=='teacher'||m.active!==true)continue;
   const staff=await api.getDocsFromServer(api.query(api.collection(db,'schools',id,'staff'),api.where('authUid','==',uid),api.limit(2)));check();
   const record=staff.docs.length===1?staff.docs[0].data():null;
   if(record&&(record.schoolId!==id||record.authUid!==uid))throw Error('Cross-school staff record rejected');
   byUid.set(uid,record?studentDisplayName({...record,id:uid}):uid);
  }
  await reverifyAdmin(selected.uid,id);check();
  reviewAssignments=candidates.filter(x=>byUid.has(x.uid)).map(x=>({...x,teacherName:byUid.get(x.uid)})).sort((a,b)=>a.teacherName.localeCompare(b.teacherName)||a.subjectName.localeCompare(b.subjectName)||a.uid.localeCompare(b.uid));
  for(const [i,row] of reviewAssignments.entries())$('reviewAssignment').append(new Option(row.teacherName+' — '+row.subjectName+(row.teacherName===row.uid?'':' ('+row.uid+')'),String(i)));
  $('reviewAssignment').disabled=!reviewAssignments.length;
  $('assignmentStatus').textContent=reviewAssignments.length+' सक्रिय विषय जिम्मेवारी भेटिए। Draft छ कि छैन छुट्टै प्रमाणित गर्नुहोस्।';
 }catch(e){if(current===epoch&&request===assignmentRequest){clearAssignmentChoices();$('assignmentStatus').textContent='जिम्मेवारी सूची उपलब्ध भएन: '+neError(e)}}
 finally{busy=false;$('loadReviewAssignments').disabled=!actor;}
};
$('reviewAssignment').onchange=()=>{
 if(busy||!actor)return;
 const value=$('reviewAssignment').value;
 if(value==='')return;
 const row=reviewAssignments[Number(value)];if(!row)return;
 clearReview('छानिएको Draft पुनः प्रमाणित गर्नुहोस्।');
 $('teacherUid').value=row.uid;$('subjectId').value=row.subjectId;
};
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
   db,api:{...api,getDoc:api.getDocFromServer,getDocs:api.getDocsFromServer},auth,actor:selected,schoolId:id,...selection,assertSession:check
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
  verifiedSelection=Object.freeze({...selection});verifiedRevision=result.revision;verifiedReview=result;$('copyDraft').disabled=false;
  $('exportDraft').disabled=false;
  $('reviewStatus').textContent='प्रमाणित Draft Revision '+result.revision+' · '+result.rosterCount+
   ' विद्यार्थी · '+result.subjectName+' · Read-only, NOT official/published.';
 }catch(e){if(current===epoch&&request===requestId){
  clearReview('Review रोकियो: '+neError(e)+' पुनः प्रमाणित गरेर खोल्नुहोस्।');
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
   db,api:{...api,getDoc:api.getDocFromServer,getDocs:api.getDocsFromServer},auth,actor:selected,schoolId:id,...selection,assertSession:check
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
  clearReview('Excel Export रोकियो: '+neError(e)+'। फेरि Draft Review गर्नुहोस्।');
 }finally{busy=false;$('exportDraft').disabled=!verifiedSelection||verifiedRevision===null}
};
$('copyDraft').onclick=async()=>{
 if(busy||!actor||!verifiedSelection||!verifiedReview)return;
 const current=epoch,request=requestId,selected=actor,id=schoolId,selection=verifiedSelection,review=verifiedReview;
 if(!window.confirm('यो शिक्षकको प्रमाणित Draft बाट नयाँ Admin Draft मात्र बनाउने हो। पहिलेको Admin Draft बदलिँदैन। आधिकारिक अङ्क प्रकाशित हुँदैनन्। अगाडि बढ्ने?'))return;
 busy=true;$('copyDraft').disabled=true;$('exportDraft').disabled=true;$('review').disabled=true;
 const check=()=>{if(epoch!==current||requestId!==request||actor!==selected||schoolId!==id||auth?.currentUser?.uid!==selected.uid||Object.entries(selection).some(([field,value])=>$(field).value.trim()!==value))throw Error('Review selection changed')};
 try{
  check();if(!await enforceSchoolIdle(auth,authSdk))throw Error('Login expired');check();
  const serverApi={...api,getDoc:api.getDocFromServer,getDocs:api.getDocsFromServer};
  const fresh=await loadSchoolAdminTeacherDraftReview({db,api:serverApi,auth,actor:selected,schoolId:id,...selection,assertSession:check});
  check();
  if(!fresh.found||fresh.revision!==review.revision||!sameMarkJson(fresh.entries,review.entries)||!sameMarkJson(fresh.components,review.components))throw Error('Teacher Draft changed; review again');
  const result=await saveVerifiedCompleteClassDraft({db,api:serverApi,auth,actor:selected,schoolId:id,classId:selection.classId,subjectId:selection.subjectId,examId:selection.examId,
   drafts:fresh.entries.map(e=>({studentId:e.studentId,isAbsent:e.isAbsent,values:e.isAbsent?{}:e.values})),expectedRevision:0,reviewedTeacher:{teacherUid:selection.teacherUid,revision:fresh.revision,components:fresh.components},assertCurrent:check});
  check();$('reviewStatus').textContent=result.rosterCount+' विद्यार्थीको नयाँ Admin Draft सुरक्षित भयो। शिक्षकको मूल Draft र आधिकारिक Marks यथावत् छन्।';
 }catch(e){if(current===epoch&&request===requestId)clearReview('प्रतिलिपिको अवस्था पुनः जाँच्नुहोस्: '+neError(e)+'। पहिलेको Admin Draft बदलिएको छैन; Network समस्या भए नयाँ Draft सुरक्षित भइसकेको हुन सक्छ।')}
 finally{busy=false;$('review').disabled=!actor;$('exportDraft').disabled=!verifiedReview;$('copyDraft').disabled=true}
};
if(requestedSchool)queueMicrotask(()=>$('connect').click());
