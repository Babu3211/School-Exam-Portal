import {V47_FIREBASE_CONFIG} from './v47-firebase-config.mjs';
import {validateSchoolId} from './school-paths.mjs';
import {verifySchoolSession} from './verified-school-session.mjs';
const $=id=>document.getElementById(id);
let auth,authSdk,db,api,verified=null,busy=false;
function message(value){$('dashboardStatus').textContent=value}
function lock(){for(const link of document.querySelectorAll('[data-school-module]')){const allowed=!!verified;link.setAttribute('aria-disabled',String(!allowed));link.tabIndex=allowed?0:-1;link.classList.toggle('locked',!allowed)}$('schoolIdentity').textContent=verified?verified.name+' · '+verified.schoolId+' · '+verified.role:'No school verified';$('dashboardLogout').disabled=!verified}
function clear(){verified=null;lock()}
document.querySelectorAll('[data-school-module]').forEach(link=>link.addEventListener('click',event=>{if(!verified){event.preventDefault();message('पहिले विद्यालयको Login प्रमाणित गर्नुहोस्।')}}));
$('dashboardConnect').onclick=async()=>{if(busy||auth)return;busy=true;$('dashboardConnect').disabled=true;try{
 const base='https://www.gstatic.com/firebasejs/11.10.0/';
 const appSdk=await import(base+'firebase-app.js');authSdk=await import(base+'firebase-auth.js');api=await import(base+'firebase-firestore.js');
 if(V47_FIREBASE_CONFIG.projectId!=='smss-exam-portal-v47')throw Error('Wrong Firebase project');
 const app=appSdk.getApps().find(a=>a.name==='smss-v47-dashboard')??appSdk.initializeApp(V47_FIREBASE_CONFIG,'smss-v47-dashboard');
 auth=authSdk.getAuth(app);await authSdk.setPersistence(auth,authSdk.inMemoryPersistence);db=api.getFirestore(app);
 authSdk.onAuthStateChanged(auth,user=>{if(verified&&user?.uid!==verified.uid){clear();message('Login सत्र परिवर्तन भयो। फेरि प्रमाणित गर्नुहोस्।')}});
 $('dashboardLogin').disabled=false;message('V47 Firebase जडान भयो।');
 }catch(e){message('जडान असफल: '+e.message);$('dashboardConnect').disabled=false}finally{busy=false}};
$('dashboardLogin').onclick=async()=>{if(busy||!auth)return;busy=true;$('dashboardLogin').disabled=true;clear();try{
 const schoolId=validateSchoolId($('dashboardSchool').value.trim());
 const credential=await authSdk.signInWithEmailAndPassword(auth,$('dashboardEmail').value,$('dashboardPassword').value);
 $('dashboardPassword').value='';
 const uid=credential.user.uid;
 const readDocument=async path=>{const snap=await api.getDoc(api.doc(db,...path.split('/')));return snap.exists()?snap.data():null};
 const session=await verifySchoolSession({schoolId,uid,readDocument});
 const school=await readDocument('schools/'+schoolId);
 if(auth.currentUser?.uid!==uid||school?.active!==true)throw Error('School session changed');
 verified={uid,schoolId,role:session.role,name:String(school.name??schoolId)};lock();
 message('विद्यालय प्रमाणित भयो। प्रत्येक Module मा छुट्टै Login आवश्यक छ; साझा सत्र एकीकरण अझै बाँकी छ।');
 }catch(e){clear();try{await authSdk.signOut(auth)}catch{}message('Login असफल: '+e.message)}finally{busy=false;$('dashboardLogin').disabled=!auth}};
$('dashboardLogout').onclick=async()=>{if(busy)return;clear();try{if(auth)await authSdk.signOut(auth);message('Logout सफल भयो।')}catch(e){message('Logout असफल: '+e.message)}};
lock();
