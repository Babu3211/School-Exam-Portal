import {installIdleLogout} from './idle-logout.mjs';
import {createIsolatedAdminAccount} from './first-admin-account.mjs';
import {loadPlatformSchoolCounts} from './super-admin-dashboard.mjs';
import {estimateSparkDay} from './spark-capacity.mjs';
import {onboardSchool} from './school-onboarding.mjs';
import {V47_FIREBASE_CONFIG} from './v47-firebase-config.mjs';
import {listSchools} from './school-list-service.mjs';
import {setSchoolActive} from './school-status-service.mjs';
const $=id=>document.getElementById(id);let auth,db,api,actor=null,cursor=null,mutating=false,connecting=false,signingIn=false,signingOut=false,sessionEpoch=0,refreshEpoch=0;
const status=message=>{$('message').textContent=message};
const cleanAuthError=error=>{const message=error?.message;if(typeof message==='string'&&['विद्यालयको IEMIS Code ५–२० अङ्कको हुनुपर्छ।','School ID र IEMIS Code एउटै हुनुपर्छ।','विद्यालयको नाम ३–१६० अक्षरको हुनुपर्छ।','Admin UID मान्य छैन।'].includes(message))return message;const code=String(error?.code??'');if(code==='auth/invalid-credential'||code==='auth/wrong-password'||code==='auth/user-not-found')return 'V47 Email वा Password मिलेन। V47 Authentication मा खाता दर्ता भएको जाँच्नुहोस्।';if(code==='auth/operation-not-allowed')return 'V47 Firebase Authentication मा Email/Password sign-in सक्षम गर्नुपर्छ।';if(code==='auth/user-disabled')return 'यो V47 खाता निष्क्रिय छ। Firebase project owner लाई सम्पर्क गर्नुहोस्।';if(code==='auth/network-request-failed')return 'Internet वा Firebase जडान असफल भयो। पुनः प्रयास गर्नुहोस्।';if(code.startsWith('auth/'))return 'प्रमाणीकरण असफल भयो। Email, Password वा अनुमति जाँच्नुहोस्।';if(code==='permission-denied'||code==='firestore/permission-denied')return 'अनुमति छैन। Super Admin अधिकार जाँच्नुहोस्।';if(code==='unavailable'||code==='firestore/unavailable')return 'सेवा अहिले उपलब्ध छैन। पुनः प्रयास गर्नुहोस्।';return 'अनुरोध पूरा भएन। विवरण जाँचेर पुनः प्रयास गर्नुहोस्।';};
const showError=error=>status(cleanAuthError(error));
let countsEpoch=0,stopIdle=null,signOutForIdle=null;
function clearAdmin(){stopIdle?.();stopIdle=null;$('newAdminPassword').value='';$('newAdminEmail').value='';$('adminUid').value='';$('accountStatus').textContent='';$('newAdminAccount').open=false;countsEpoch++;$('platformCounts').textContent='School counts not loaded.';$('quotaResult').textContent='';sessionEpoch++;refreshEpoch++;actor=null;cursor=null;document.body.classList.remove('super-verified');$('superLoginFields').hidden=false;$('logout').hidden=true;$('adminArea').hidden=true;$('logout').disabled=true;$('identity').textContent='साइन इन भएको छैन';$('schools').replaceChildren();$('next').disabled=true;$('next').onclick=null;}
const firebaseBase='https://www.gstatic.com/firebasejs/11.10.0/';
$('connect').onclick=async()=>{if(connecting||db)return;connecting=true;$('connect').disabled=true;$('connect').hidden=true;try{
 const config=V47_FIREBASE_CONFIG;
 if(config.projectId!=='smss-exam-portal-v47')throw new Error('V47 Firebase Project मात्र प्रयोग गर्न मिल्छ।');
 const appSdk=await import(firebaseBase+'firebase-app.js');
 const authSdk=await import(firebaseBase+'firebase-auth.js');
 api=await import(firebaseBase+'firebase-firestore.js');
 const app=appSdk.getApps().find(x=>x.name==='smss-v47-admin')??appSdk.initializeApp(config,'smss-v47-admin');const candidateAuth=authSdk.getAuth(app);await authSdk.setPersistence(candidateAuth,authSdk.inMemoryPersistence);auth=candidateAuth;db=api.getFirestore(app);
 authSdk.onAuthStateChanged(auth,user=>{if(actor&&user?.uid!==actor.uid){clearAdmin();status('सत्र परिवर्तन भयो। फेरि साइन इन गर्नुहोस्।')}});
 $('connect').disabled=true;$('login').disabled=false;$('connection').textContent='V47 Project सँग जडान भयो।';
 $('createAdminAccount').onclick=async()=>{
  if(mutating||signingIn||signingOut||!actor||auth?.currentUser?.uid!==actor.uid)return;
  const selected=actor,epoch=sessionEpoch,email=$('newAdminEmail').value.trim(),password=$('newAdminPassword').value;
  $('newAdminPassword').value='';
  const current=()=>actor===selected&&sessionEpoch===epoch&&auth?.currentUser?.uid===selected.uid;
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||password.length<12||password.length>128){$('accountStatus').textContent='Enter a valid email and a temporary password of 12–128 characters.';return}
  if(!confirm('Create a new V47 Auth account for '+email+'? School access is not granted until registration and activation.'))return;
  if(!current())return;
  mutating=true;$('createAdminAccount').disabled=true;$('register').disabled=true;$('logout').disabled=true;
  $('accountStatus').textContent='Creating account…';
  try{
   const result=await createIsolatedAdminAccount({appSdk,authSdk,config,actor:selected,email,password,assertCurrent:()=>{if(!current())throw Error('Session changed')},
    verifyPrivilege:()=>api.getDocsFromServer(api.query(api.collection(db,'schools'),api.limit(1)))});
   if(!current())return;
   $('adminUid').value=result.uid;
   $('accountStatus').textContent='V47 account created. UID filled. Register the school inactive, then activate after verifying the school.';
  }catch(e){if(current())$('accountStatus').textContent=e?.code==='auth/email-already-in-use'?'Email already registered. Use the existing V47 UID from Firebase Authentication. No existing account was changed.':'Account creation could not be confirmed. Check Firebase Authentication before retrying; an account may already exist.'}
  finally{mutating=false;$('createAdminAccount').disabled=false;if(current()){$('register').disabled=false;$('logout').disabled=false}}
 };

 $('login').onclick=async()=>{if(signingIn||signingOut||mutating)return;signingIn=true;$('login').disabled=true;try{await authSdk.signInWithEmailAndPassword(auth,$('email').value,$('password').value);$('password').value='';await verifyAdmin();}catch(e){clearAdmin();try{if(auth?.currentUser)await authSdk.signOut(auth)}catch{}showError(e)}finally{$('password').value='';signingIn=false;$('login').disabled=false}};
 signOutForIdle=()=>authSdk.signOut(auth);
 $('logout').onclick=async()=>{if(mutating||signingIn||signingOut){status('हालको प्रक्रिया पूरा नभएसम्म पर्खनुहोस्।');return}signingOut=true;$('logout').disabled=true;try{await authSdk.signOut(auth);clearAdmin();status('सफलतापूर्वक साइन आउट भयो।')}catch(e){showError(e)}finally{signingOut=false;if(actor)$('logout').disabled=false}};
 status('जडान भयो। अधिकृत Super Admin बाट साइन इन गर्नुहोस्।');
 }catch(e){db=null;auth=null;api=null;showError(e);$('connect').disabled=false;$('connect').hidden=false}finally{connecting=false}};
async function verifyAdmin(){clearAdmin();const uid=auth.currentUser?.uid,verificationSession=sessionEpoch;if(!uid)throw new Error('पहिले साइन इन गर्नुहोस्।');
 // This document is intentionally client-unreadable: authorization is verified by a harmless scoped query.
 await api.getDocsFromServer(api.query(api.collection(db,'schools'),api.limit(1)));
 if(sessionEpoch!==verificationSession||auth.currentUser?.uid!==uid)throw new Error('Super Admin पुष्टि भइरहँदा सत्र परिवर्तन भयो।');
 actor={active:true,role:'super_admin',uid};document.body.classList.add('super-verified');$('superLoginFields').hidden=true;$('logout').hidden=false;$('identity').textContent='प्रमाणित Super Admin: '+uid;$('logout').disabled=false;$('adminArea').hidden=false;status('Super Admin को अनुमति पुष्टि भयो।');
 stopIdle=installIdleLogout({timeoutMs:60*60*1000,onTimeout:()=>{
  // Lock and clear the UI synchronously even if a request is in flight.
  // Epoch checks prevent delayed responses from restoring this expired session.
  signingOut=true;$('login').disabled=true;clearAdmin();$('email').value='';$('password').value='';
  status('१ घण्टा निष्क्रिय भएकाले सत्र बन्द भयो। फेरि Login गर्नुहोस्।');
  void Promise.resolve().then(()=>signOutForIdle()).catch(()=>status('सत्रको UI बन्द भयो; Firebase sign-out पुष्टि हुन सकेन। पेज पुनः खोल्नुहोस्।')).finally(()=>{signingOut=false;$('login').disabled=false});
 }});
 await refresh();void refreshCounts();}
async function refreshCounts(){
 const selected=actor,request=++countsEpoch;
 if(!selected)return;
 const check=()=>{if(actor!==selected||auth?.currentUser?.uid!==selected.uid||request!==countsEpoch)throw Error('Session changed')};
 $('refreshCounts').disabled=true;
 try{const counts=await loadPlatformSchoolCounts({db,api,actor:selected,assertSession:check});check();
 $('platformCounts').textContent='Total schools: '+counts.totalSchools+' · Active: '+counts.activeSchools+' · Inactive: '+counts.inactiveSchools;
 }catch{if(request===countsEpoch)$('platformCounts').textContent='Verified school totals unavailable.'}
 finally{if(request===countsEpoch)$('refreshCounts').disabled=false}
}
$('refreshCounts').onclick=()=>void refreshCounts();
$('estimateQuota').onclick=()=>{
 if(!actor||auth?.currentUser?.uid!==actor.uid)return;
 try{
 const num=id=>{const s=$(id).value.trim();if(!s)throw Error('Enter every scenario value');return Number(s)};
 const result=estimateSparkDay({schools:num('quotaSchools'),studentsPerSchool:num('quotaStudents'),
 attendancePerStudent:num('quotaAttendance'),otherReadsPerSchool:num('quotaReads'),otherWritesPerSchool:num('quotaWrites'),
 dashboardUsersPerSchool:num('quotaUsers'),activityHours:num('quotaHours')});
 $('quotaResult').textContent='Estimated reads: '+result.reads.toLocaleString()+' / 50,000; writes: '+result.writes.toLocaleString()+
 ' / 20,000 (attendance '+result.attendanceWrites.toLocaleString()+', activity '+result.heartbeatWrites.toLocaleString()+'). '+
 (result.withinEstimatedDailyQuota?'Within entered scenario only.':'Estimated quota exceeded.')+' Actual rule reads, retries and storage must be checked in Firebase.';
 }catch(e){$('quotaResult').textContent=e.message}
};
async function refresh(){if(!actor||auth?.currentUser?.uid!==actor.uid){clearAdmin();status('सत्र परिवर्तन भयो। फेरि Sign in गर्नुहोस्।');return}const requestedActor=actor,requestedSession=sessionEpoch,requestedRefresh=++refreshEpoch;try{$('next').disabled=true;const result=await listSchools({db,api,actor:requestedActor,pageSize:30,cursor,reviewInvalid:true});if(requestedRefresh!==refreshEpoch||sessionEpoch!==requestedSession)return;if(actor!==requestedActor||auth?.currentUser?.uid!==requestedActor.uid)throw new Error('विद्यालय सूची लिँदा सत्र परिवर्तन भयो।');const tbody=$('schools');tbody.replaceChildren();for(const school of result.schools){const tr=document.createElement('tr');for(const [label,value] of [['School ID',school.id],['Name',school.name],['Status',school.active?'Active':'Inactive']]){const td=document.createElement('td');td.dataset.label=label;td.textContent=String(value??'');tr.append(td)}const td=document.createElement('td'),button=document.createElement('button');td.dataset.label='Action';button.textContent=school.active?'Deactivate':'Activate';button.onclick=async()=>{if(mutating||signingIn||signingOut)return;if(!actor||auth?.currentUser?.uid!==actor.uid){clearAdmin();status('सत्र परिवर्तन भयो। फेरि Sign in गर्नुहोस्।');return}if(!confirm('विद्यालय '+school.id+' को सक्रिय/निष्क्रिय अवस्था परिवर्तन गर्ने हो?'))return;if(!actor||auth?.currentUser?.uid!==actor.uid){clearAdmin();status('सत्र परिवर्तन भयो। फेरि Sign in गर्नुहोस्।');return}const mutationActor=actor,mutationSession=sessionEpoch;mutating=true;button.disabled=true;$('register').disabled=true;$('logout').disabled=true;$('refresh').disabled=true;$('next').disabled=true;try{await setSchoolActive({db,api,actor:mutationActor,schoolId:school.id,active:!school.active});if(sessionEpoch!==mutationSession||actor!==mutationActor||auth?.currentUser?.uid!==mutationActor.uid)return;cursor=null;await refresh();void refreshCounts()}catch(e){if(sessionEpoch===mutationSession&&actor===mutationActor&&auth?.currentUser?.uid===mutationActor.uid)showError(e)}finally{mutating=false;if(sessionEpoch===mutationSession&&actor===mutationActor&&auth?.currentUser?.uid===mutationActor.uid){button.disabled=false;$('register').disabled=false;$('logout').disabled=false;$('refresh').disabled=false}}};td.append(button);tr.append(td);tbody.append(tr)}for(const school of result.reviewRows){const tr=document.createElement('tr');tr.dataset.review='true';for(const [label,value] of [['School ID',school.id],['Name',school.name],['Status','Needs review'],['Details',school.issues.join('; ')+' — no changes allowed']]){const td=document.createElement('td');td.dataset.label=label;td.textContent=value;tr.append(td)}tbody.append(tr)}$('next').disabled=!result.hasMore;$('next').onclick=()=>{if(mutating||signingIn||signingOut||!actor||auth?.currentUser?.uid!==actor.uid)return;cursor=result.cursor;refresh()};status(result.schools.length+' वटा प्रमाणित विद्यालय लोड भए।'+(result.reviewRows.length?' '+result.reviewRows.length+' वटा पुराना वा नमिलेका विद्यालय विवरण जाँच आवश्यक छ। कुनै डाटा परिवर्तन गरिएको छैन।':''));}catch(e){if(requestedRefresh!==refreshEpoch||requestedSession!==sessionEpoch)return;$('next').disabled=true;if(!actor||auth?.currentUser?.uid!==actor.uid){clearAdmin();status('सत्र परिवर्तन भयो। फेरि Sign in गर्नुहोस्।')}else showError(e)}}
$('refresh').onclick=()=>{if(mutating||signingIn||signingOut)return;cursor=null;refresh();void refreshCounts()};
$('schoolId').addEventListener('input',()=>{$('iemis').value=$('schoolId').value.trim()});
$('register').onclick=async()=>{if(mutating||signingIn||signingOut)return;if(!actor||auth?.currentUser?.uid!==actor.uid){clearAdmin();status('सत्र परिवर्तन भयो। फेरि Sign in गर्नुहोस्।');return}try{const schoolId=$('schoolId').value.trim();const suppliedIemis=$('iemis').value.trim();if(!/^[0-9]{5,20}$/.test(schoolId))throw new Error('विद्यालयको IEMIS Code ५–२० अङ्कको हुनुपर्छ।');if(suppliedIemis!==schoolId)throw new Error('School ID र IEMIS Code एउटै हुनुपर्छ।');const schoolName=$('schoolName').value.trim(),adminUid=$('adminUid').value.trim();if(schoolName.length<3||schoolName.length>160)throw new Error('विद्यालयको नाम ३–१६० अक्षरको हुनुपर्छ।');if(!/^[A-Za-z0-9_-]{6,128}$/.test(adminUid))throw new Error('Admin UID मान्य छैन।');if(!confirm('यो विद्यालय निष्क्रिय अवस्थामा दर्ता गरी पहिलो Admin तोक्ने हो?'))return;if(!actor||auth?.currentUser?.uid!==actor.uid){clearAdmin();status('सत्र परिवर्तन भयो। फेरि Sign in गर्नुहोस्।');return}const form={id:schoolId,name:schoolName,iemisCode:schoolId};const mutationActor=actor,mutationSession=sessionEpoch;mutating=true;$('register').disabled=true;$('logout').disabled=true;$('refresh').disabled=true;$('next').disabled=true;try{await onboardSchool({db,api,actor:mutationActor,form,adminUid});if(sessionEpoch!==mutationSession||actor!==mutationActor||auth?.currentUser?.uid!==mutationActor.uid)return;cursor=null;await refresh();void refreshCounts();status('विद्यालय निष्क्रिय अवस्थामा दर्ता भयो। पुष्टि गरेपछि मात्र सक्रिय गर्नुहोस्।')}finally{mutating=false;if(sessionEpoch===mutationSession&&actor===mutationActor&&auth?.currentUser?.uid===mutationActor.uid){$('register').disabled=false;$('logout').disabled=false;$('refresh').disabled=false}}}catch(e){if(actor&&auth?.currentUser?.uid===actor.uid)showError(e)}};

// Connect automatically; only a verified platform account can reveal school management.
queueMicrotask(()=>$('connect').click());
