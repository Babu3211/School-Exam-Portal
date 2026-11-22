import {verifySchoolSession} from './verified-school-session.mjs';
import {validateSchoolId} from './school-paths.mjs';
import {createSchoolSubject} from './subject-create-service.mjs';
import {addMissingSubjectCreditHour} from './legacy-subject-credit-repair.mjs';
const $=id=>document.getElementById(id),status=message=>{$('message').textContent=message};
let auth,authSdk,api,db,actor,schoolId,busy=false,epoch=0,inspected=null;
function clear(){epoch++;actor=null;schoolId=null;inspected=null;$('repairWork').hidden=true;$('applyRepair').disabled=true;$('repairDetails').textContent='';$('work').hidden=true;$('logout').disabled=true;$('save').disabled=true}
function lock(value){busy=value;$('login').disabled=value||!auth;$('logout').disabled=value||!actor;$('save').disabled=value||!actor;$('inspectRepair').disabled=value||!actor;$('applyRepair').disabled=value||!actor||!inspected}
$('connect').onclick=async()=>{try{const config=JSON.parse($('config').value);if(config.projectId!=='smss-exam-portal-v47')throw new Error('Only V47 project allowed');const appSdk=await import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js');authSdk=await import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js');api=await import('https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js');const app=appSdk.initializeApp(config,'smss-v47-subjects');auth=authSdk.getAuth(app);await authSdk.setPersistence(auth,authSdk.inMemoryPersistence);db=api.getFirestore(app);$('connect').disabled=true;lock(false);status('Connected to V47')}catch(e){status('Connection failed: '+e.message)}};
$('login').onclick=async()=>{if(busy)return;clear();const attempt=epoch;lock(true);try{const id=validateSchoolId($('schoolId').value.trim());const credential=await authSdk.signInWithEmailAndPassword(auth,$('email').value,$('password').value);$('password').value='';if(attempt!==epoch)return;const uid=credential.user.uid;const session=await verifySchoolSession({schoolId:id,uid,readDocument:async path=>{const snap=await api.getDoc(api.doc(db,...path.split('/')));return snap.exists()?snap.data():null;}});if(attempt!==epoch||auth.currentUser?.uid!==uid||session.role!=='school_admin')throw new Error('School Admin required');const school=await api.getDoc(api.doc(db,'schools',id));if(attempt!==epoch||auth.currentUser?.uid!==uid||!school.exists()||school.data().active!==true)throw new Error('School inactive');schoolId=id;actor={uid,role:'school_admin',active:true,schoolId};$('heading').textContent='New subject — '+String(school.data().name??id);$('work').hidden=false;$('repairWork').hidden=false;status('School Admin signed in')}catch(e){if(attempt===epoch){clear();try{await authSdk.signOut(auth)}catch{}status('Sign in failed: '+e.message)}}finally{lock(false)}};
$('logout').onclick=async()=>{if(busy)return;lock(true);clear();try{await authSdk.signOut(auth);status('Signed out')}catch(e){status('Sign out failed: '+e.message)}finally{lock(false)}};
$('save').onclick=async()=>{if(busy||!actor)return;const attempt=epoch;lock(true);try{const input={id:$('subjectId').value.trim(),name:$('subjectName').value,class:$('schoolClass').value,theoryFullMarks:$('theoryFullMarks').value,practicalFullMarks:$('practicalFullMarks').value,creditHour:$('creditHour').value};const subject=await createSchoolSubject({db,api,actor,schoolId,input});if(attempt===epoch){$('subjectId').value='';$('subjectName').value='';$('theoryFullMarks').value='';$('practicalFullMarks').value='';$('creditHour').value='';status('Subject created in V47: '+subject.id)}}catch(e){if(attempt===epoch)status('Create failed: '+e.message)}finally{lock(false)}};

function invalidateInspection(){inspected=null;$('applyRepair').disabled=true;$('repairDetails').textContent='';}
$('repairSubjectId').oninput=invalidateInspection;
$('repairCreditHour').oninput=invalidateInspection;
$('inspectRepair').onclick=async()=>{
 if(busy||!actor)return;
 const attempt=epoch;invalidateInspection();lock(true);
 try{
  const id=$('repairSubjectId').value.trim();
  const creditHour=Number($('repairCreditHour').value);
  if(!/^[A-Za-z0-9_-]{1,128}$/.test(id))throw new Error('Invalid Subject ID');
  if(!$('repairCreditHour').value.trim()||!Number.isFinite(creditHour)||creditHour<=0||creditHour>100)throw new Error('Invalid credit hours');
  const snap=await api.getDoc(api.doc(db,'schools',schoolId,'subjects',id));
  if(attempt!==epoch||auth.currentUser?.uid!==actor?.uid)return;
  if(!snap.exists())throw new Error('Subject not found');
  const data=snap.data();
  if(data.schoolId!==schoolId||data.active!==true)throw new Error('Subject not active in selected school');
  if(Object.hasOwn(data,'creditHour'))throw new Error('Credit hours already exist; overwrite blocked');
  inspected={id,creditHour,schoolId,uid:actor.uid};
  $('repairDetails').textContent='Subject: '+String(data.name??id)+' | Class: '+String(data.class??'')+' | Proposed credit hours: '+creditHour+'. Verify before confirming.';
  status('विषय जाँच पूरा भयो। सही भए मात्र Confirm गर्नुहोस्।');
 }catch(e){if(attempt===epoch)status('जाँच असफल: '+e.message)}finally{lock(false)}
};
$('applyRepair').onclick=async()=>{
 if(busy||!inspected||!actor)return;
 const selected=inspected,attempt=epoch;
 if(auth.currentUser?.uid!==actor.uid){invalidateInspection();status('सत्र परिवर्तन भएको छ। फेरि Login गर्नुहोस्।');return}
 if(selected.id!==$('repairSubjectId').value.trim()||Number($('repairCreditHour').value)!==selected.creditHour||selected.schoolId!==schoolId||selected.uid!==actor.uid){invalidateInspection();status('फेरि विषय जाँच गर्नुहोस्।');return}
 if(!window.confirm('यो विषयमा '+selected.creditHour+' Credit Hours एकपटक मात्र थप्ने हो। जारी राख्ने?'))return;
 if(attempt!==epoch||auth.currentUser?.uid!==selected.uid){invalidateInspection();return}
 lock(true);
 try{
  await addMissingSubjectCreditHour({db,api,actor,schoolId,subjectId:selected.id,creditHour:selected.creditHour});
  if(attempt===epoch){invalidateInspection();status('Credit Hours सुरक्षित रूपमा थपियो: '+selected.id)}
 }catch(e){if(attempt===epoch){invalidateInspection();status('सुधार असफल: '+e.message)}}finally{lock(false)}
};
