import {verifySchoolSession} from './verified-school-session.mjs';
import {validateSchoolId} from './school-paths.mjs';
const $=id=>document.getElementById(id);
let auth,authSdk,api,db,busy=false,epoch=0,verifiedSchoolId=null;
const message=text=>{$('message').textContent=text};
function reset(){epoch++;verifiedSchoolId=null;$('settings').hidden=true;for(const id of ['iemis','name','active','role'])$(id).textContent=''}
function lock(value){busy=value;for(const id of ['login','logout','schoolId','email','password'])$(id).disabled=value;if(!value){$('login').disabled=!auth||!!verifiedSchoolId;$('logout').disabled=!auth?.currentUser;$('schoolId').disabled=!!verifiedSchoolId;$('email').disabled=!!verifiedSchoolId;$('password').disabled=!!verifiedSchoolId}}
$('connect').onclick=async()=>{
 if(auth)return;
 try{
  const config=JSON.parse($('config').value);
  if(config.projectId!=='smss-exam-portal-v47')throw new Error('V47 Firebase project required');
  const appSdk=await import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js');
  authSdk=await import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js');
  api=await import('https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js');
  const app=appSdk.initializeApp(config,'smss-v47-school-settings');
  auth=authSdk.getAuth(app);await authSdk.setPersistence(auth,authSdk.inMemoryPersistence);
  db=api.getFirestore(app);
  authSdk.onAuthStateChanged(auth,user=>{if(!user&&verifiedSchoolId!==null){reset();message('सत्र समाप्त भयो। पुनः लगइन गर्नुहोस्।')}if(!busy)lock(false)});
  $('connect').disabled=true;lock(false);message('Connected to V47');
 }catch(e){message('Connection failed: '+e.message)}
};
$('login').onclick=async()=>{
 if(busy||!auth)return;
 reset();const request=epoch;lock(true);
 try{
  const id=validateSchoolId($('schoolId').value.trim());
  const credential=await authSdk.signInWithEmailAndPassword(auth,$('email').value,$('password').value);
  $('password').value='';
  if(request!==epoch)throw new Error('Session changed');
  const uid=credential.user.uid;
  const readDocument=async path=>{const snap=await api.getDoc(api.doc(db,...path.split('/')));return snap.exists()?snap.data():null};
  const session=await verifySchoolSession({schoolId:id,uid,readDocument});
  const school=await readDocument('schools/'+id);
  const fresh=await verifySchoolSession({schoolId:id,uid,readDocument});
  if(request!==epoch||auth.currentUser?.uid!==uid||id!==$('schoolId').value.trim()||fresh.uid!==session.uid||fresh.role!==session.role)throw new Error('Session or school selection changed');
  if(!school||school.id!==id||school.iemisCode!==id||school.active!==true)throw new Error('Verified school settings unavailable');
  $('iemis').textContent=id;$('name').textContent=String(school.name);$('active').textContent='Active';$('role').textContent=session.role;
  verifiedSchoolId=id;$('schoolId').disabled=true;$('email').disabled=true;$('password').disabled=true;
  $('settings').hidden=false;message('विद्यालय विवरण प्रमाणित भयो। यो पृष्ठमा परिवर्तन गर्न मिल्दैन।');
 }catch(e){if(request===epoch){reset();try{await authSdk.signOut(auth)}catch{}message('School verification failed: '+e.message)}}
 finally{if(request===epoch)lock(false)}
};
$('logout').onclick=async()=>{if(busy)return;reset();lock(true);try{await authSdk.signOut(auth);message('Signed out')}catch(e){message('Sign out failed: '+e.message)}finally{lock(false)}};
