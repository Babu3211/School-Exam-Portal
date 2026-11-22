import {connectSchoolFirebase,startVerifiedSchoolActivity,enforceSchoolIdle} from './school-firebase-client.mjs';
import {validateSchoolId} from './school-paths.mjs';
import {verifySchoolSession} from './verified-school-session.mjs';
const $=id=>document.getElementById(id);
let auth,authSdk,db,api,verified=null,busy=false,checkingLink=false,lastActivity=Date.now();
const MAX_IDLE_MS=60*60*1000;
const SCHOOL_SELECTION_KEY='smss-v47-dashboard-school';
const readDocument=async path=>{const snap=await api.getDoc(api.doc(db,...path.split('/')));return snap.exists()?snap.data():null};
function message(value){$('dashboardStatus').textContent=value}
function lock(){for(const link of document.querySelectorAll('[data-school-module]')){const allowed=!!verified;link.setAttribute('aria-disabled',String(!allowed));link.tabIndex=allowed?0:-1;link.classList.toggle('locked',!allowed)}$('schoolIdentity').textContent=verified?verified.name+' · '+verified.schoolId+' · '+verified.role:'No school verified';$('dashboardLogout').disabled=!verified}
function clear(){verified=null;lock()}
async function restoreVerifiedSchool(){
 const saved=sessionStorage.getItem(SCHOOL_SELECTION_KEY);
 if(!saved||!auth?.currentUser)return;
 try{
  const schoolId=validateSchoolId(saved),uid=auth.currentUser.uid;
  if(!await enforceSchoolIdle(auth,authSdk))return;
  const session=await verifySchoolSession({schoolId,uid,readDocument});
  const school=await readDocument('schools/'+schoolId);
  if(auth.currentUser?.uid!==uid||school?.active!==true)throw Error('School unavailable');
  verified={uid,schoolId,role:session.role,name:String(school.name??schoolId)};
  $('dashboardSchool').value=schoolId;lastActivity=Date.now();lock();
  message('पहिले प्रमाणित विद्यालयको Session पुनः जाँचियो।');
 }catch(e){sessionStorage.removeItem(SCHOOL_SELECTION_KEY);clear();message('विद्यालय फेरि Login गर्नुहोस्: '+e.message)}
}
let expiring=false;
async function expireIdle(){
 if(!verified||expiring||Date.now()-lastActivity<MAX_IDLE_MS)return false;
 expiring=true;clear();
 try{sessionStorage.removeItem(SCHOOL_SELECTION_KEY);if(auth)await authSdk.signOut(auth)}catch{}
 message('एक घण्टा निष्क्रिय भएपछि Login समाप्त भयो। फेरि Login गर्नुहोस्।');
 expiring=false;return true;
}
setInterval(()=>{void expireIdle()},30*1000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void expireIdle()});
document.querySelectorAll('[data-school-module]').forEach(link=>link.addEventListener('click',async event=>{
 event.preventDefault();
 if(!verified||checkingLink){message('पहिले विद्यालयको Login प्रमाणित गर्नुहोस्।');return}
 if(await expireIdle())return;
 checkingLink=true;
 try{
  const current=verified;
  if(auth?.currentUser?.uid!==current.uid)throw Error('Login session changed');
  const session=await verifySchoolSession({schoolId:current.schoolId,uid:current.uid,readDocument});
  if(verified!==current||auth.currentUser?.uid!==current.uid||session.role!==current.role)throw Error('School membership changed');
  const school=await readDocument('schools/'+current.schoolId);
  if(verified!==current||school?.active!==true)throw Error('School inactive');
  const destination=new URL(link.getAttribute('href'),location.href);
  if(destination.origin!==location.origin)throw Error('External navigation blocked');
  destination.searchParams.set('schoolId',current.schoolId);
  location.assign(destination.href);
 }catch(e){clear();message('विद्यालय अनुमति फेरि जाँच्न आवश्यक छ: '+e.message)}
 finally{checkingLink=false}
}));
for(const eventName of ['pointerdown','keydown'])document.addEventListener(eventName,()=>{
 if(!verified)return;
 if(Date.now()-lastActivity>=MAX_IDLE_MS){void expireIdle();return}
 lastActivity=Date.now();
},{passive:true,capture:true});
$('dashboardConnect').onclick=async()=>{if(busy||auth)return;busy=true;$('dashboardConnect').disabled=true;try{
 ({auth,authSdk,db,api}=await connectSchoolFirebase());
 authSdk.onAuthStateChanged(auth,user=>{if(verified&&user?.uid!==verified.uid){clear();message('Login सत्र परिवर्तन भयो। फेरि प्रमाणित गर्नुहोस्।')}});
 $('dashboardLogin').disabled=false;message('V47 Firebase जडान भयो।');await restoreVerifiedSchool();
 }catch(e){message('जडान असफल: '+e.message);$('dashboardConnect').disabled=false}finally{busy=false}};
$('dashboardLogin').onclick=async()=>{if(busy||!auth)return;busy=true;$('dashboardLogin').disabled=true;clear();try{
 const schoolId=validateSchoolId($('dashboardSchool').value.trim());
 const credential=await authSdk.signInWithEmailAndPassword(auth,$('dashboardEmail').value,$('dashboardPassword').value);
 $('dashboardPassword').value='';
 const uid=credential.user.uid;
 const session=await verifySchoolSession({schoolId,uid,readDocument});
 const school=await readDocument('schools/'+schoolId);
 if(auth.currentUser?.uid!==uid||school?.active!==true)throw Error('School session changed');
 verified={uid,schoolId,role:session.role,name:String(school.name??schoolId)};sessionStorage.setItem(SCHOOL_SELECTION_KEY,schoolId);startVerifiedSchoolActivity();lastActivity=Date.now();lock();
 message('विद्यालय प्रमाणित भयो। साझा Session समर्थित Module मा पुनः Password आवश्यक पर्दैन।');
 }catch(e){clear();try{await authSdk.signOut(auth)}catch{}message('Login असफल: '+e.message)}finally{busy=false;$('dashboardLogin').disabled=!auth}};
$('dashboardLogout').onclick=async()=>{if(busy)return;clear();sessionStorage.removeItem(SCHOOL_SELECTION_KEY);try{if(auth)await authSdk.signOut(auth);message('Logout सफल भयो।')}catch(e){message('Logout असफल: '+e.message)}};
lock();
