import {connectSchoolFirebase,startVerifiedSchoolActivity,enforceSchoolIdle,touchSchoolActivity} from './school-firebase-client.mjs';
import {validateSchoolId} from './school-paths.mjs';
import {verifySchoolSession} from './verified-school-session.mjs';
import {schoolDashboardAccess} from './dashboard-access.mjs';
import {schoolProfileView} from './school-settings-profile.mjs';
import {schoolSatelliteMapLinks} from './dashboard-school-map.mjs';
import {createActivityGate,recordDashboardActivity,readRecentDashboardActivity} from './dashboard-activity.mjs';
import {loadVerifiedSchoolStats,dashboardStatsText,createForegroundStatsGate} from './dashboard-stats.mjs';
const $=id=>document.getElementById(id);
let auth,authSdk,db,api,verified=null,busy=false,checkingLink=false,lastActivity=Date.now();
const foregroundStatsGate=createForegroundStatsGate();
const activityGate=createActivityGate();
let activityRequest=0;
async function noteDashboardActivity(){
 const selected=verified;
 if(!selected||!activityGate.claim({schoolId:selected.schoolId,uid:selected.uid,now:Date.now(),visible:!document.hidden}))return;
 const check=()=>{if(verified!==selected||auth?.currentUser?.uid!==selected.uid)throw Error('School session changed')};
 try{await recordDashboardActivity({db,api,actor:{...selected,active:true},assertSession:check})}catch{/* telemetry must never block academic modules; rate-limit denies duplicate tabs */}
}
async function showRecentActivity(){
 const selected=verified,request=++activityRequest,section=$('recentActivityCard');
 section.hidden=selected?.role!=='school_admin';$('recentActivityCount').textContent='—';
 if(section.hidden)return;
 const check=()=>{if(request!==activityRequest||verified!==selected||auth?.currentUser?.uid!==selected.uid)throw Error('Session changed')};
 try{const count=await readRecentDashboardActivity({db,api,actor:{...selected,active:true},assertSession:check});check();$('recentActivityCount').textContent=String(count)}catch{/* no fabricated zero */}
}
const MAX_IDLE_MS=60*60*1000;
const SCHOOL_SELECTION_KEY='smss-v47-dashboard-school';
const readDocument=async path=>{const snap=await api.getDoc(api.doc(db,...path.split('/')));return snap.exists()?snap.data():null};
async function verifiedSchoolLabel(schoolId,registryName){
 const settings=await readDocument('schools/'+schoolId+'/school_settings/profile');
 if(settings&&settings.schoolId!==schoolId)throw new Error('Cross-school profile rejected');
 const profile=schoolProfileView(settings,registryName);
 return {label:[profile.nameEnglish,profile.nameNepali,profile.addressEnglish,profile.addressNepali].filter(Boolean).join(' · '),map:schoolSatelliteMapLinks({schoolId,profile})};
}
function message(value){$('dashboardStatus').textContent=value}
function lock(){
 const signedIn=!!verified;
 for(const id of ['verifiedSidebar','verifiedOverview','verifiedDashboard','dashboardLogout'])$(id).hidden=!signedIn;
 $('dashboardLoginFields').hidden=signedIn;
 document.body.classList.toggle('verified-school',signedIn);
 if(signedIn){$('dashboardPassword').value='';$('dashboardPassword').type='password';$('dashboardPasswordToggle').textContent='Show';$('dashboardPasswordToggle').setAttribute('aria-pressed','false');}
 for(const link of document.querySelectorAll('[data-school-module]')){const allowed=!!verified&&schoolDashboardAccess(verified.role,link.dataset.requiredRole==='school_admin'?'school-admin':'module');link.setAttribute('aria-disabled',String(!allowed));link.tabIndex=allowed?0:-1;link.classList.toggle('locked',!allowed)}$('schoolIdentity').textContent=verified?verified.name+' · '+verified.schoolId+' · '+verified.role:'No school verified';$('schoolAccessMode').textContent=!verified?'Login required to view school modules.':verified.role==='viewer'?'Viewer — पढ्न र रिपोर्ट हेर्न मात्र मिल्छ। Add, Edit, Delete वा Save अनुमति छैन।':verified.role==='teacher'?'Teacher — तोकिएको कक्षा र विषयमा मात्र अनुमति अनुसार काम गर्न मिल्छ।':'School Admin — विद्यालयको व्यवस्थापन गर्न मिल्छ; प्रत्येक Module ले अनुमति पुनः जाँच्छ।';$('dashboardLogout').disabled=!verified;$('dashboardRefreshStats').disabled=!verified;$('schoolMapSection').hidden=!verified;$('schoolMapLoad').disabled=!verified?.map;$('schoolMapMessage').textContent=!verified?'विद्यालय प्रमाणित गरेपछि नक्सा हेर्नुहोस्।':verified.map?'नक्सा खोल्न बटन थिच्नुहोस्। देखाइएको स्थान खोज परिणाम हो, प्रमाणित GPS होइन।':'School Settings मा विद्यालयको ठेगाना राखेपछि Satellite Map उपलब्ध हुन्छ।'}
const DASHBOARD_METRICS=Object.freeze(['students','staff','subjects','exams','members','activeMembers']);
function resetMetricCards(){
 $('dashboardMetricCards').hidden=true;
 for(const name of DASHBOARD_METRICS){
  const node=document.querySelector('[data-metric="'+name+'"]');
  if(node)node.textContent='—';
 }
 for(const card of document.querySelectorAll('[data-admin-metric]'))card.hidden=true;
 $('dashboardStats').hidden=false;
}
function showMetricCards(stats){
 // Never infer online users from membership records. Non-admins get no member counts.
 for(const name of DASHBOARD_METRICS){
  const adminOnly=name==='members'||name==='activeMembers';
  const card=document.querySelector('[data-metric="'+name+'"]')?.closest('.metric-card');
  if(adminOnly&&stats.role!=='school_admin'){if(card)card.hidden=true;continue}
  const count=stats[name];
  if(!Number.isSafeInteger(count)||count<0)throw new Error('Invalid verified dashboard count: '+name);
  const node=document.querySelector('[data-metric="'+name+'"]');
  if(node)node.textContent=String(count);
  if(card)card.hidden=false;
 }
 $('dashboardMetricCards').hidden=false;
 $('dashboardStats').hidden=true;
}

let statsRequest=0;
let mapRequest=0;
function resetSchoolMap(){mapRequest++;$('schoolMapFrame').removeAttribute('src');$('schoolMapFrame').hidden=true;$('schoolMapOpen').removeAttribute('href');$('schoolMapOpen').hidden=true;}
function clear(){activityRequest++;$('recentActivityCard').hidden=true;$('recentActivityCount').textContent='—';resetSchoolMap();statsRequest++;foregroundStatsGate.reset();verified=null;resetMetricCards();$('dashboardStats').textContent='विद्यालय प्रमाणित गरेपछि विवरण देखिन्छ।';lock()}
async function refreshStats(){
 if(!verified||!api||!db||!auth)return;
 const selected=verified,request=++statsRequest;
 $('dashboardRefreshStats').disabled=true;
 resetMetricCards();
 $('dashboardStats').textContent='विद्यालयका विवरण पढिँदैछन्…';
 const assertSession=()=>{
  if(request!==statsRequest||verified!==selected||auth?.currentUser?.uid!==selected.uid)
   throw new Error('Login or school changed while loading dashboard');
 };
 try{
  if(!await enforceSchoolIdle(auth,authSdk))throw new Error('Login expired');
  assertSession();
  const loaded=await loadVerifiedSchoolStats({
   schoolId:selected.schoolId,uid:selected.uid,role:selected.role,readDocument,assertSession,
   readCount:async(name,{activeOnly=false}={})=>{
    const collection=api.collection(db,'schools',selected.schoolId,name);
    const query=activeOnly?api.query(collection,api.where('active','==',true)):collection;
    const snap=await api.getCountFromServer(query);
    return snap.data().count;
   }
  });
  assertSession();
  $('dashboardStats').textContent=dashboardStatsText(loaded);
  showMetricCards(loaded);
  // Offline heartbeat must not block the aggregate refresh button.
  void showRecentActivity();
  void noteDashboardActivity().then(()=>{if(request===statsRequest&&verified===selected)void showRecentActivity()});
 }catch(error){
  if(request===statsRequest&&verified===selected)
   $('dashboardStats').textContent='विद्यालय विवरण उपलब्ध भएन: '+error.message;
 }finally{if(request===statsRequest)$('dashboardRefreshStats').disabled=!verified}
}
$('dashboardRefreshStats').onclick=()=>{void refreshStats()};
$('schoolMapLoad').onclick=async()=>{
 if(!verified?.map||!auth||!db||!api)return;
 const selected=verified,request=++mapRequest;
 $('schoolMapLoad').disabled=true;
 try{
  if(!await enforceSchoolIdle(auth,authSdk))throw new Error('Login expired');
  if(request!==mapRequest||verified!==selected||auth.currentUser?.uid!==selected.uid)throw new Error('Login changed');
  const membership=await verifySchoolSession({schoolId:selected.schoolId,uid:selected.uid,readDocument});
  if(request!==mapRequest||verified!==selected||auth.currentUser?.uid!==selected.uid||membership.role!==selected.role)
   throw new Error('School membership changed while opening map');
  const school=await readDocument('schools/'+selected.schoolId);
  if(request!==mapRequest||verified!==selected||auth.currentUser?.uid!==selected.uid||school?.active!==true)
   throw new Error('School is no longer active');
  $('schoolMapFrame').src=selected.map.embedUrl;
  $('schoolMapFrame').hidden=false;
  $('schoolMapOpen').href=selected.map.openUrl;
  $('schoolMapOpen').hidden=false;
  $('schoolMapMessage').textContent='Satellite खोज परिणाम खोलियो। वास्तविक विद्यालयको स्थान पुष्टि गर्नुहोस्।';
 }catch(e){if(request===mapRequest&&verified===selected)$('schoolMapMessage').textContent='नक्सा खोल्न मिलेन: '+e.message;}
 finally{if(request===mapRequest)$('schoolMapLoad').disabled=!verified?.map}
};


async function restoreVerifiedSchool(){
 const saved=sessionStorage.getItem(SCHOOL_SELECTION_KEY);
 if(!saved||!auth?.currentUser)return;
 try{
  const schoolId=validateSchoolId(saved),uid=auth.currentUser.uid;
  if(!await enforceSchoolIdle(auth,authSdk)){sessionStorage.removeItem(SCHOOL_SELECTION_KEY);return;}
  const session=await verifySchoolSession({schoolId,uid,readDocument});
  const school=await readDocument('schools/'+schoolId);
  if(auth.currentUser?.uid!==uid||school?.active!==true)throw Error('School unavailable');
  const label=await verifiedSchoolLabel(schoolId,String(school.name??schoolId));
  if(auth.currentUser?.uid!==uid)throw Error('Login changed during profile load');
  verified={uid,schoolId,role:session.role,name:label.label,map:label.map};
  foregroundStatsGate.seed({schoolId,uid,now:Date.now()});
  $('dashboardSchool').value=schoolId;lastActivity=Date.now();lock();
  message('पहिले प्रमाणित विद्यालयको Session पुनः जाँचियो।');void refreshStats();
 }catch(e){sessionStorage.removeItem(SCHOOL_SELECTION_KEY);clear();message('विद्यालय फेरि Login गर्नुहोस्: '+e.message)}
}
let expiring=false;
async function expireIdle(){
 if(!verified||expiring)return false;
 if(Date.now()-lastActivity<MAX_IDLE_MS&&await enforceSchoolIdle(auth,authSdk))return false;
 expiring=true;sessionStorage.removeItem(SCHOOL_SELECTION_KEY);clear();
 try{if(auth)await authSdk.signOut(auth)}catch{}
 message('एक घण्टा निष्क्रिय भएपछि Login समाप्त भयो। फेरि Login गर्नुहोस्।');
 expiring=false;return true;
}
setInterval(()=>{void expireIdle()},30*1000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void expireIdle()});
// No recurring aggregate polling: a verified tab rechecks after returning from
// another tab/window, at most once per minute, preserving Firebase Spark quota.
async function refreshOnForeground(){
 if(document.hidden||!verified||!auth?.currentUser)return;
 const selected=verified;
 if(auth.currentUser.uid!==selected.uid){void expireIdle();return}
 if(!foregroundStatsGate.shouldRefresh({
  visible:true,schoolId:selected.schoolId,uid:selected.uid,now:Date.now()
 }))return;
 if(await expireIdle())return;
 if(verified!==selected||auth?.currentUser?.uid!==selected.uid)return;
 await refreshStats();
}
window.addEventListener('focus',()=>{void refreshOnForeground()});
document.addEventListener('visibilitychange',()=>{
 if(!document.hidden)void refreshOnForeground();
});
document.querySelectorAll('[data-school-module]').forEach(link=>link.addEventListener('click',async event=>{
 event.preventDefault();
 if(!verified||checkingLink){message('पहिले विद्यालयको Login प्रमाणित गर्नुहोस्।');return}
 if(!schoolDashboardAccess(verified.role,link.dataset.requiredRole==='school_admin'?'school-admin':'module')){message('यो Module खोल्न School Admin अनुमति आवश्यक छ।');return}
 if(await expireIdle())return;
 checkingLink=true;
 try{
  const current=verified;
  if(auth?.currentUser?.uid!==current.uid)throw Error('Login session changed');
  const session=await verifySchoolSession({schoolId:current.schoolId,uid:current.uid,readDocument});
  if(verified!==current||auth.currentUser?.uid!==current.uid||session.role!==current.role)throw Error('School membership changed');
  if(!schoolDashboardAccess(session.role,link.dataset.requiredRole==='school_admin'?'school-admin':'module'))throw Error('School Admin permission required');
  const school=await readDocument('schools/'+current.schoolId);
  if(verified!==current||school?.active!==true)throw Error('School inactive');
  const destination=new URL(link.getAttribute('href'),location.href);
  if(destination.origin!==location.origin)throw Error('External navigation blocked');
  destination.searchParams.set('schoolId',current.schoolId);
  location.assign(destination.href);
 }catch(e){sessionStorage.removeItem(SCHOOL_SELECTION_KEY);clear();message('विद्यालय अनुमति फेरि जाँच्न आवश्यक छ: '+e.message)}
 finally{checkingLink=false}
}));
for(const eventName of ['pointerdown','keydown'])document.addEventListener(eventName,()=>{
 if(!verified)return;
 if(Date.now()-lastActivity>=MAX_IDLE_MS){void expireIdle();return}
 if(!touchSchoolActivity()){void expireIdle();return}
 lastActivity=Date.now();void noteDashboardActivity();
},{passive:true,capture:true});
$('dashboardConnect').onclick=async()=>{if(busy||auth)return;busy=true;$('dashboardConnect').disabled=true;$('dashboardConnect').hidden=true;message('Connecting securely to V47…');try{
 ({auth,authSdk,db,api}=await connectSchoolFirebase());
 authSdk.onAuthStateChanged(auth,user=>{if(verified&&user?.uid!==verified.uid){sessionStorage.removeItem(SCHOOL_SELECTION_KEY);clear();message('Login सत्र परिवर्तन भयो। फेरि प्रमाणित गर्नुहोस्।')}});
 $('dashboardLogin').disabled=false;message('Enter your school IEMIS ID, email and password.');await restoreVerifiedSchool();
 }catch(e){message('जडान असफल: '+e.message);$('dashboardConnect').disabled=false;$('dashboardConnect').hidden=false}finally{busy=false}};
$('dashboardLoginForm').onsubmit=async(event)=>{event.preventDefault();if(busy||!auth)return;busy=true;$('dashboardLogin').disabled=true;clear();try{
 const schoolId=validateSchoolId($('dashboardSchool').value.trim());
 const credential=await authSdk.signInWithEmailAndPassword(auth,$('dashboardEmail').value,$('dashboardPassword').value);
 $('dashboardPassword').value='';
 const uid=credential.user.uid;
 const session=await verifySchoolSession({schoolId,uid,readDocument});
 const school=await readDocument('schools/'+schoolId);
 if(auth.currentUser?.uid!==uid||school?.active!==true)throw Error('School session changed');
 const label=await verifiedSchoolLabel(schoolId,String(school.name??schoolId));
 if(auth.currentUser?.uid!==uid)throw Error('Login changed during profile load');
 verified={uid,schoolId,role:session.role,name:label.label,map:label.map};foregroundStatsGate.seed({schoolId,uid,now:Date.now()});sessionStorage.setItem(SCHOOL_SELECTION_KEY,schoolId);startVerifiedSchoolActivity();lastActivity=Date.now();lock();
 message('विद्यालय प्रमाणित भयो। साझा Session समर्थित Module मा पुनः Password आवश्यक पर्दैन।');void refreshStats();
 }catch(e){sessionStorage.removeItem(SCHOOL_SELECTION_KEY);clear();try{await authSdk.signOut(auth)}catch{}message('Login असफल: '+e.message)}finally{busy=false;$('dashboardLogin').disabled=!auth}};
$('dashboardLogout').onclick=async()=>{if(busy)return;clear();sessionStorage.removeItem(SCHOOL_SELECTION_KEY);try{if(auth)await authSdk.signOut(auth);message('Logout सफल भयो।')}catch(e){message('Logout असफल: '+e.message)}};
$('dashboardPasswordToggle').onclick=()=>{
 const field=$('dashboardPassword'),show=field.type==='password';
 field.type=show?'text':'password';$('dashboardPasswordToggle').textContent=show?'Hide':'Show';$('dashboardPasswordToggle').setAttribute('aria-pressed',String(show));$('dashboardPasswordToggle').setAttribute('aria-label',show?'Hide password':'Show password');
};
lock();
// Automatically connect, without authenticating or opening any school data.
queueMicrotask(()=>$('dashboardConnect').click());
