import {createIsolatedSchoolMemberAccount} from './first-admin-account.mjs';
import {V47_FIREBASE_CONFIG} from './v47-firebase-config.mjs';
import {neError} from './nepali-feedback.mjs';
import {connectSchoolFirebase,startVerifiedSchoolActivity,enforceSchoolIdle} from './school-firebase-client.mjs';
import {createSchoolStore} from './firestore-adapter.mjs';
import {collectSchoolAuditExcel} from './school-records-audit-excel.mjs';
import {verifySchoolSession} from './verified-school-session.mjs';
import {getSchoolDetails} from './school-detail-service.mjs';
import {listSchoolMembersPage} from './member-list-service.mjs';
import {findSchoolMember} from './member-lookup-service.mjs';
import {addSchoolMember} from './member-management.mjs';
import {setSchoolMemberActive} from './member-status-service.mjs';
import {createTeacherAssignment,setTeacherAssignmentActive} from './teacher-assignment-management.mjs';
import {validateSchoolId} from './school-paths.mjs';
const requestedSchool=new URL(location.href).searchParams.get('schoolId');
const $=id=>document.getElementById(id);const status=msg=>{$('message').textContent=msg};let auth,authSdk,db,api,actor=null,schoolId=null,sessionEpoch=0,busy=false,loggingIn=false,signingOut=false,memberCursor=null,memberHasMore=false,memberLoading=false,memberRequest=0,memberRefreshPending=false,foundMember=null,lookupRequest=0,snapshotBusy=false;
function clearMemberAccount(){for(const id of ['newMemberEmail','newMemberPassword','memberUid'])$(id).value='';$('memberAccountStatus').textContent='';$('newMemberAccount').open=false;}
function requireCurrentAdmin(){if(!actor||actor.role!=='school_admin'||actor.active!==true||actor.schoolId!==schoolId||auth?.currentUser?.uid!==actor.uid)throw new Error('विद्यालय प्रशासकको सत्र समाप्त भयो। फेरि लगइन गर्नुहोस्।');return {actor,schoolId,epoch:sessionEpoch}}
function assertSameAdmin(session){requireCurrentAdmin();if(session.epoch!==sessionEpoch||session.actor!==actor||session.schoolId!==schoolId)throw new Error('School session changed; retry after sign in')}
$('connect').onclick=async()=>{try{({auth,authSdk,db,api}=await connectSchoolFirebase());authSdk.onAuthStateChanged(auth,user=>{if(actor&&user?.uid!==actor.uid){clearMemberAccount();sessionEpoch++;memberRequest++;memberRefreshPending=false;lookupRequest++;foundMember=null;$('toggleFoundMember').disabled=true;$('memberLookupResult').textContent='';memberCursor=null;memberHasMore=false;$('moreMembers').disabled=true;actor=null;$('schoolArea').hidden=true;$('logout').disabled=true;status('Login परिवर्तन भयो। School Admin फेरि प्रमाणित गर्नुहोस्।')}});$('connect').disabled=true;$('login').disabled=false;if(requestedSchool){$('schoolId').value=validateSchoolId(requestedSchool);if(auth.currentUser)queueMicrotask(()=>$('login').click())}status('V47 मा जडान भयो।')}catch(e){status(neError(e))}};
$('login').onclick=async()=>{if(busy||loggingIn||signingOut)return;loggingIn=true;clearMemberAccount();$('login').disabled=true;$('logout').disabled=false;actor=null;$('schoolArea').hidden=true;const current=++sessionEpoch;memberRequest++;memberRefreshPending=false;lookupRequest++;foundMember=null;$('toggleFoundMember').disabled=true;$('memberLookupResult').textContent='';memberCursor=null;memberHasMore=false;$('moreMembers').disabled=true;const loginAuth=auth;try{const requestedSchool=validateSchoolId($('schoolId').value.trim());schoolId=requestedSchool;const freshSignIn=!auth.currentUser;const credential=freshSignIn?await authSdk.signInWithEmailAndPassword(auth,$('email').value,$('password').value):{user:auth.currentUser};$('password').value='';const uid=credential.user.uid;const selectedSchool=requestedSchool;if(current!==sessionEpoch){if(loginAuth.currentUser?.uid===uid)await authSdk.signOut(loginAuth);return}const session=await verifySchoolSession({schoolId:selectedSchool,uid,readDocument:async path=>{const snap=await api.getDoc(api.doc(db,...path.split('/')));return snap.exists()?snap.data():null;}});if(current!==sessionEpoch){if(loginAuth.currentUser?.uid===uid)await authSdk.signOut(loginAuth);return}if(loginAuth.currentUser?.uid!==uid||schoolId!==selectedSchool||session.role!=='school_admin')throw new Error('School Admin membership required');actor={role:'school_admin',active:true,schoolId,uid};if(freshSignIn)startVerifiedSchoolActivity();const school=await getSchoolDetails({db,api,actor,schoolId});if(current!==sessionEpoch||loginAuth.currentUser?.uid!==uid){actor=null;if(current!==sessionEpoch&&loginAuth.currentUser?.uid===uid)await authSdk.signOut(loginAuth);return}$('schoolTitle').textContent=school.name+' ('+school.id+')';$('teacherDraftAuditLink').href='./teacher-draft-review.html?schoolId='+encodeURIComponent(schoolId);$('schoolArea').hidden=false;$('logout').disabled=false;await refresh();}catch(e){if(current===sessionEpoch){actor=null;$('schoolArea').hidden=true;try{if(loginAuth?.currentUser)await authSdk.signOut(loginAuth)}catch{}status(neError(e))}}finally{loggingIn=false;$('login').disabled=signingOut;if(current===sessionEpoch&&!actor)$('logout').disabled=true}};
$('logout').onclick=async()=>{if(signingOut)return;if(busy){status('सदस्यता सुरक्षित गर्ने प्रक्रिया पूरा हुन दिनुहोस्।');return}signingOut=true;clearMemberAccount();sessionEpoch++;memberRequest++;memberRefreshPending=false;lookupRequest++;foundMember=null;$('toggleFoundMember').disabled=true;$('memberLookupResult').textContent='';memberCursor=null;memberHasMore=false;$('moreMembers').disabled=true;$('members').replaceChildren();actor=null;$('schoolArea').hidden=true;$('logout').disabled=true;$('login').disabled=true;try{await authSdk.signOut(auth);status('सफलतापूर्वक लगआउट भयो।')}catch(e){status(neError(e))}finally{signingOut=false;$('login').disabled=false}};
async function refresh(){memberRequest++;memberCursor=null;memberHasMore=false;$('moreMembers').disabled=true;$('members').replaceChildren();if(memberLoading){memberRefreshPending=true;return}await loadMembersPage();}
async function loadMembersPage(){
 if(!actor||memberLoading)return;
 const current=sessionEpoch,request=memberRequest,requestActor=actor,requestSchool=schoolId,cursor=memberCursor;
 memberLoading=true;$('refresh').disabled=true;$('moreMembers').disabled=true;
 try{
  const page=await listSchoolMembersPage({db,api,actor:requestActor,schoolId:requestSchool,cursor});
  if(current!==sessionEpoch||request!==memberRequest||actor!==requestActor||schoolId!==requestSchool||auth.currentUser?.uid!==requestActor.uid)return;
  const tbody=$('members');
  for(const member of page.records){const tr=document.createElement('tr');for(const value of [member.uid,member.role,member.active?'Yes':'No']){const td=document.createElement('td');td.textContent=String(value);tr.append(td)}if(['teacher','viewer'].includes(member.role)){const td=document.createElement('td');const btn=document.createElement('button');btn.textContent=member.active?'Deactivate':'Activate';btn.onclick=async()=>{if(busy)return;const session=requireCurrentAdmin();if(!confirm((member.active?'Deactivate ':'Activate ')+member.role+' '+member.uid+'?'))return;assertSameAdmin(session);busy=true;btn.disabled=true;$('logout').disabled=true;try{await setSchoolMemberActive({db,api,actor:session.actor,schoolId:session.schoolId,uid:member.uid,active:!member.active,expectedActive:member.active});await refresh()}catch(e){status(neError(e))}finally{busy=false;btn.disabled=false;$('logout').disabled=false}};td.append(btn);tr.append(td)}tbody.append(tr)}
  memberCursor=page.nextCursor;memberHasMore=page.hasMore;
  status('Loaded '+tbody.children.length+' members'+(page.hasMore?' — more available':''));
 }catch(e){if(current===sessionEpoch&&request===memberRequest)status(neError(e))}
 finally{memberLoading=false;$('refresh').disabled=false;$('moreMembers').disabled=!memberHasMore||!actor||current!==sessionEpoch||request!==memberRequest;if(memberRefreshPending){memberRefreshPending=false;if(actor&&auth?.currentUser?.uid===actor.uid)void loadMembersPage();}}
}
$('findMember').onclick=async()=>{
 if(!actor||busy||loggingIn||signingOut)return;
 const session=requireCurrentAdmin(),uid=$('findMemberUid').value.trim(),request=++lookupRequest;
 foundMember=null;$('toggleFoundMember').disabled=true;$('findMember').disabled=true;$('memberLookupResult').textContent='खोजी भइरहेको छ…';
 try{
  const member=await findSchoolMember({db,api,actor:session.actor,schoolId:session.schoolId,uid});
  if(request!==lookupRequest||session.epoch!==sessionEpoch||session.actor!==actor||session.schoolId!==schoolId||auth?.currentUser?.uid!==session.actor.uid)return;
  foundMember=member;
  $('memberLookupResult').textContent=member?member.uid+' · '+member.role+' · '+(member.active?'Active':'Inactive'):'यस UID को सदस्य भेटिएन।';
  $('toggleFoundMember').disabled=!member||!['teacher','viewer'].includes(member.role);
  if(member)$('toggleFoundMember').textContent=member.active?'Deactivate found member':'Activate found member';
 }catch(e){if(request===lookupRequest&&session.epoch===sessionEpoch&&session.actor===actor)$('memberLookupResult').textContent='खोजी असफल: '+neError(e)}
 finally{if(request===lookupRequest)$('findMember').disabled=false}
};
$('toggleFoundMember').onclick=async()=>{
 if(busy||loggingIn||signingOut||!foundMember)return;
 const session=requireCurrentAdmin(),member=foundMember,request=lookupRequest;
 if(!['teacher','viewer'].includes(member.role)||$('findMemberUid').value.trim()!==member.uid)return;
 busy=true;$('toggleFoundMember').disabled=true;$('findMember').disabled=true;$('logout').disabled=true;
 try{
  const latest=await findSchoolMember({db,api,actor:session.actor,schoolId:session.schoolId,uid:member.uid});
  assertSameAdmin(session);
  if(request!==lookupRequest||foundMember!==member||$('findMemberUid').value.trim()!==member.uid)throw new Error('Member selection changed; search again');
  if(!latest||latest.role!==member.role||latest.active!==member.active)throw new Error('Member status changed; search again');
  if(!confirm((member.active?'Deactivate ':'Activate ')+member.role+' '+member.uid+'?'))return;
  assertSameAdmin(session);
  await setSchoolMemberActive({db,api,actor:session.actor,schoolId:session.schoolId,uid:member.uid,active:!member.active,expectedActive:member.active});
  assertSameAdmin(session);
  foundMember=null;lookupRequest++;$('memberLookupResult').textContent='सदस्यको अवस्था परिवर्तन भयो। पुनः खोजेर पुष्टि गर्नुहोस्।';
  await refresh();
 }catch(e){if(session.epoch===sessionEpoch&&session.actor===actor)$('memberLookupResult').textContent='परिवर्तन असफल: '+neError(e)}
 finally{busy=false;$('findMember').disabled=false;$('logout').disabled=false;$('toggleFoundMember').disabled=true}
};
$('refresh').onclick=refresh;
$('moreMembers').onclick=()=>{if(memberHasMore)void loadMembersPage()};
$('createMemberAccount').onclick=async()=>{
 if(busy||loggingIn||signingOut||!actor)return;
 const session=requireCurrentAdmin(),email=$('newMemberEmail').value.trim(),password=$('newMemberPassword').value,role=$('role').value;
 $('newMemberPassword').value='';
 const current=()=>session.epoch===sessionEpoch&&session.actor===actor&&session.schoolId===schoolId&&auth?.currentUser?.uid===session.actor.uid;
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||password.length<12||password.length>128||!['teacher','viewer'].includes(role)){$('memberAccountStatus').textContent='मान्य इमेल, भूमिका र १२–१२८ अक्षरको अस्थायी पासवर्ड राख्नुहोस्।';return}
 if(!confirm(email+' का लागि नयाँ '+role+' खाता बनाउने हो? खाता बनाउँदैमा विद्यालयको अनुमति प्राप्त हुँदैन।')||!current())return;
 busy=true;for(const id of ['createMemberAccount','add','role','logout','login'])$(id).disabled=true;
 $('memberAccountStatus').textContent='खाता बनाइँदैछ…';
 const check=()=>assertSameAdmin(session);
 const verifyPrivilege=async()=>{
  if(!await enforceSchoolIdle(auth,authSdk))throw Error('Login expired');
  check();
  const membership=await verifySchoolSession({schoolId:session.schoolId,uid:session.actor.uid,readDocument:async path=>{
   check();const snap=await api.getDocFromServer(api.doc(db,...path.split('/')));check();return snap.exists()?snap.data():null;
  }});
  check();if(membership.role!=='school_admin')throw Error('School Admin permission required');
 };
 try{
  const appSdk=await import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js');
  const result=await createIsolatedSchoolMemberAccount({appSdk,authSdk,config:V47_FIREBASE_CONFIG,actor:session.actor,schoolId:session.schoolId,role,email,password,assertCurrent:check,verifyPrivilege});
  if(!current())return;
  $('memberUid').value=result.uid;
  $('memberAccountStatus').textContent='नयाँ खाता बन्यो र UID भरियो। Add member थिचेर निष्क्रिय सदस्यता बनाउनुहोस्।';
 }catch(e){if(current())$('memberAccountStatus').textContent=e?.code==='auth/email-already-in-use'?'यो इमेल पहिल्यै दर्ता छ। पहिलेको खाताको अधिकृत UID प्रयोग गर्नुहोस्।':'खाता बनेको पुष्टि भएन। '+neError(e)+' पुनः प्रयास गर्नुअघि Firebase Authentication जाँच्नुहोस्। खाता बनिसकेको हुन सक्छ।'}
 finally{busy=false;for(const id of ['createMemberAccount','add','role','login'])$(id).disabled=false;if(current())$('logout').disabled=false}
};
$('add').onclick=async()=>{if(busy)return;try{const session=requireCurrentAdmin();const uid=$('memberUid').value.trim(),role=$('role').value;if(!confirm('Add '+role+' '+uid+' to '+schoolId+'?'))return;assertSameAdmin(session);busy=true;$('add').disabled=true;$('logout').disabled=true;$('login').disabled=true;try{await addSchoolMember({db,api,actor:session.actor,schoolId:session.schoolId,uid,role});$('memberUid').value='';await refresh();status('सदस्यता निष्क्रिय अवस्थामा सिर्जना भयो। अधिकृत प्रशासकले Firebase खाता प्रमाणित गरेपछि मात्र सक्रिय गर्नुहोस्।')}finally{busy=false;$('add').disabled=false;$('logout').disabled=false;$('login').disabled=false}}catch(e){status(neError(e))}};

async function assignmentAction(kind){
 if(busy||!actor)return;
 const session=requireCurrentAdmin();
 const uid=$('assignmentUid').value.trim(),classId=$('assignmentClass').value,subjectId=$('assignmentSubject').value.trim();
 if(!confirm(kind+' teacher '+uid+' for class '+classId+' / subject '+subjectId+'?'))return;
 assertSameAdmin(session);busy=true;
 for(const id of ['assignTeacher','activateAssignment','deactivateAssignment','logout'])$(id).disabled=true;
 try{
  if(kind==='Create')await createTeacherAssignment({db,api,actor:session.actor,schoolId:session.schoolId,uid,classId,subjectId});
  else await setTeacherAssignmentActive({db,api,actor:session.actor,schoolId:session.schoolId,uid,classId,subjectId,active:kind==='Activate'});
  status('Teacher assignment '+kind.toLowerCase()+' successful');
 }catch(e){status('शिक्षक जिम्मेवारी तोक्न सकिएन: '+neError(e))}
 finally{busy=false;for(const id of ['assignTeacher','activateAssignment','deactivateAssignment','logout'])$(id).disabled=false;}
}
$('assignTeacher').onclick=()=>assignmentAction('Create');
$('activateAssignment').onclick=()=>assignmentAction('Activate');
$('deactivateAssignment').onclick=()=>assignmentAction('Deactivate');


// Read-only Excel audit, NOT an atomic or restorable Firestore database backup.
$('exportSchoolSnapshot').onclick=async()=>{
 if(snapshotBusy||busy||loggingIn||signingOut||!actor)return;
 const session=requireCurrentAdmin();
 if(!window.confirm('सम्बन्धित विद्यालयका विद्यार्थी, Staff, अंक, सेटिङ तथा सदस्यको गोप्य विवरण सहितको Excel Audit बनाउने हो? फाइल सुरक्षित राख्नुहोस्। यो Firestore Database Backup होइन।'))return;
 snapshotBusy=true;busy=true;$('exportSchoolSnapshot').disabled=true;$('logout').disabled=true;
 const check=()=>assertSameAdmin(session);
 const readDocument=async path=>{
  check();
  const snap=await api.getDoc(api.doc(db,...path.split('/')));
  check();
  return snap.exists()?snap.data():null;
 };
 try{
  if(!await enforceSchoolIdle(auth,authSdk))throw Error('Login समय समाप्त भयो');
  check();
  const before=await verifySchoolSession({schoolId:session.schoolId,uid:session.actor.uid,readDocument});
  check();
  if(before.role!=='school_admin')throw Error('School Admin membership changed');
  const store=createSchoolStore({
   db,api,member:session.actor,schoolId:session.schoolId,assertSession:check
  });
  const result=await collectSchoolAuditExcel({
   store,actor:session.actor,schoolId:session.schoolId,assertSession:check,
   onProgress:({collection,count,total})=>{
    check();$('snapshotStatus').textContent=collection+': '+count+' records. Total '+total+'; verifying complete pages…';
   }
  });
  check();
  const after=await verifySchoolSession({schoolId:session.schoolId,uid:session.actor.uid,readDocument});
  check();
  if(after.role!==before.role)throw Error('School Admin role changed');
  if(!await enforceSchoolIdle(auth,authSdk))throw Error('Login समय समाप्त भयो');
  check();
  const url=URL.createObjectURL(result.blob),anchor=document.createElement('a');
  try{
   anchor.href=url;anchor.download=result.filename;document.body.append(anchor);anchor.click();
  }finally{anchor.remove();URL.revokeObjectURL(url)}
  $('snapshotStatus').textContent=result.recordCount+' विद्यालय अभिलेख '+result.filename+
   ' मा Audit गरिएको छ। संवेदनशील Field '+result.redactedFields+
   ' ठाउँमा REDACTED छ। यो पूर्ण Firestore Backup होइन; Restore सुविधा उपलब्ध छैन।';
 }catch(e){
  try{check();$('snapshotStatus').textContent='Excel Audit रोकियो: '+neError(e)+'। अपूर्ण फाइल निकालिएको छैन।';}
  catch{}
 }finally{
  snapshotBusy=false;busy=false;
  if(actor===session.actor&&sessionEpoch===session.epoch){
   $('exportSchoolSnapshot').disabled=false;$('logout').disabled=false;
  }
 }
};

if(requestedSchool)queueMicrotask(()=>$('connect').click());
