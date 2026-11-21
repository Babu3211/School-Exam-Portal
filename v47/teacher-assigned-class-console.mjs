import {verifySchoolSession} from './verified-school-session.mjs';
import {verifyTeacherSubjectAssignment} from './verified-teacher-subject-assignment.mjs';
import {loadCompleteClassRoster} from './complete-class-roster.mjs';
import {validateSchoolId} from './school-paths.mjs';
const $=id=>document.getElementById(id);
let auth,authSdk,api,db,actor=null,schoolId=null,epoch=0,busy=false,connected=false;
const message=text=>{$('message').textContent=text};
function clear(){epoch++;actor=null;schoolId=null;$('work').hidden=true;$('students').replaceChildren();$('count').textContent='';$('logout').disabled=true;$('load').disabled=true}
function lock(value){busy=value;for(const id of ['login','logout','load','classId','subjectId','schoolId','email','password'])$(id).disabled=value;if(!value){$('login').disabled=!auth;$('logout').disabled=!actor;$('load').disabled=!actor}}
async function verifiedSession(uid,id){
 const session=await verifySchoolSession({schoolId:id,uid,readDocument:async path=>{const snap=await api.getDoc(api.doc(db,...path.split('/')));return snap.exists()?snap.data():null}});
 if(session.role!=='teacher')throw new Error('Active Teacher membership required');
 if(auth?.currentUser?.uid!==uid)throw new Error('Authentication changed');
 return session;
}
$('connect').onclick=async()=>{
 try{
  const config=JSON.parse($('config').value);
  if(config.projectId!=='smss-exam-portal-v47')throw new Error('V47 Firebase project required');
  const appSdk=await import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js');
  authSdk=await import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js');
  api=await import('https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js');
  const app=appSdk.initializeApp(config,'smss-v47-teacher-roster');
  auth=authSdk.getAuth(app);await authSdk.setPersistence(auth,authSdk.inMemoryPersistence);
  db=api.getFirestore(app);connected=true;$('connect').disabled=true;$('login').disabled=false;message('Connected to V47');
 }catch(e){message('Connection failed: '+e.message)}
};
$('login').onclick=async()=>{
 if(busy||!auth)return;
 clear();const request=epoch;lock(true);
 try{
  const id=validateSchoolId($('schoolId').value.trim());
  const credential=await authSdk.signInWithEmailAndPassword(auth,$('email').value,$('password').value);
  $('password').value='';
  if(request!==epoch)throw new Error('Login changed');
  const session=await verifiedSession(credential.user.uid,id);
  if(request!==epoch)throw new Error('Login changed');
  if(id!==$('schoolId').value.trim())throw new Error('School selection changed');
  actor={uid:session.uid,role:'teacher',active:true,schoolId:id};schoolId=id;$('work').hidden=false;message('शिक्षकको लगइन सफल भयो। आफ्नो कक्षा र विषय छान्नुहोस्।');
 }catch(e){if(request===epoch){clear();try{await authSdk.signOut(auth)}catch{}message('Sign in failed: '+e.message)}}
 finally{lock(false)}
};
$('logout').onclick=async()=>{if(busy)return;lock(true);clear();try{await authSdk.signOut(auth);message('Signed out')}catch(e){message('Sign out failed: '+e.message)}finally{lock(false)}};
for(const id of ['classId','subjectId'])$(id).addEventListener('change',()=>{$('students').replaceChildren();$('count').textContent='';epoch++});
$('load').onclick=async()=>{
 if(busy||!actor)return;
 const request=epoch,uid=actor.uid,id=schoolId,classId=$('classId').value,subjectId=$('subjectId').value.trim();
 $('students').replaceChildren();$('count').textContent='';lock(true);
 const revalidate=async()=>{if(request!==epoch||auth?.currentUser?.uid!==uid||actor?.uid!==uid||schoolId!==id)throw new Error('School session or selection changed');await verifiedSession(uid,id)};
 try{
  await verifyTeacherSubjectAssignment({db,api,actor,schoolId:id,classId,subjectId,revalidate});
  const roster=await loadCompleteClassRoster({db,api,actor,schoolId:id,classId});
  await revalidate();
  await verifyTeacherSubjectAssignment({db,api,actor,schoolId:id,classId,subjectId,revalidate});
  if(request!==epoch||classId!==$('classId').value||subjectId!==$('subjectId').value.trim())throw new Error('Selection changed');
  const fragment=document.createDocumentFragment();
  for(const student of [...roster.students].sort((a,b)=>String(a.name??a.id).localeCompare(String(b.name??b.id),'en',{sensitivity:'base',numeric:true})||a.id.localeCompare(b.id))){
   const tr=document.createElement('tr');
   for(const value of [student.name??student.id,student.class,student.id]){const td=document.createElement('td');td.textContent=String(value);tr.append(td)}
   fragment.append(tr);
  }
  $('students').append(fragment);$('count').textContent=roster.count+' assigned-class students (read-only)';message('विद्यार्थी सूची लोड भयो। यो पृष्ठबाट अंक Save गर्न मिल्दैन।');
 }catch(e){if(request===epoch){$('students').replaceChildren();$('count').textContent='';message('Access denied or roster unavailable: '+e.message)}}
 finally{if(request===epoch)lock(false)}
};
