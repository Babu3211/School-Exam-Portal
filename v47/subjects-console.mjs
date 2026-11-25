import {neError} from './nepali-feedback.mjs';
import {connectSchoolFirebase,startVerifiedSchoolActivity,bindVerifiedModuleActivity} from './school-firebase-client.mjs';
import {verifySchoolSession} from './verified-school-session.mjs';
import {validateSchoolId} from './school-paths.mjs';
import {createSchoolSubject} from './subject-create-service.mjs';
import {addMissingSubjectCreditHour} from './legacy-subject-credit-repair.mjs';
const requestedSchool=new URL(location.href).searchParams.get('schoolId');
const $=id=>document.getElementById(id),status=message=>{$('message').textContent=message};
let auth,authSdk,api,db,actor,schoolId,busy=false,epoch=0,inspected=null;
function clear(){epoch++;actor=null;schoolId=null;inspected=null;$('repairWork').hidden=true;$('applyRepair').disabled=true;$('repairDetails').textContent='';$('work').hidden=true;$('logout').disabled=true;$('save').disabled=true}
function lock(value){busy=value;$('login').disabled=value||!auth;$('logout').disabled=value||!actor;$('save').disabled=value||!actor;$('inspectRepair').disabled=value||!actor;$('applyRepair').disabled=value||!actor||!inspected}
$('connect').onclick=async()=>{try{({auth,authSdk,db,api}=await connectSchoolFirebase());authSdk.onAuthStateChanged(auth,user=>{if(actor&&user?.uid!==actor.uid){clear();status('प्रयोगकर्ता सत्र परिवर्तन भयो। पुनः लगइन गर्नुहोस्।')}else if(!busy)lock(false)});$('connect').disabled=true;lock(false);if(requestedSchool){$('schoolId').value=validateSchoolId(requestedSchool);if(auth.currentUser)queueMicrotask(()=>$('login').click())}status('V47 मा जडान भयो।')}catch(e){status('जडान असफल: '+neError(e))}};
$('login').onclick=async()=>{if(busy)return;clear();const attempt=epoch;lock(true);try{const id=validateSchoolId($('schoolId').value.trim());const freshSignIn=!auth.currentUser;const credential=freshSignIn?await authSdk.signInWithEmailAndPassword(auth,$('email').value,$('password').value):{user:auth.currentUser};$('password').value='';if(attempt!==epoch)return;const uid=credential.user.uid;const session=await verifySchoolSession({schoolId:id,uid,readDocument:async path=>{const snap=await api.getDoc(api.doc(db,...path.split('/')));return snap.exists()?snap.data():null;}});if(attempt!==epoch||auth.currentUser?.uid!==uid||session.role!=='school_admin')throw new Error('School Admin required');const school=await api.getDoc(api.doc(db,'schools',id));if(attempt!==epoch||auth.currentUser?.uid!==uid||!school.exists()||school.data().active!==true)throw new Error('School inactive');schoolId=id;actor={uid,role:'school_admin',active:true,schoolId};if(freshSignIn)startVerifiedSchoolActivity();{const activityMember=actor;bindVerifiedModuleActivity(activityMember,()=>actor===activityMember&&auth?.currentUser?.uid===activityMember.uid);}$('heading').textContent='New subject — '+String(school.data().name??id);$('work').hidden=false;$('repairWork').hidden=false;status('School Admin लगइन सफल भयो।')}catch(e){if(attempt===epoch){clear();try{await authSdk.signOut(auth)}catch{}status('लगइन असफल: '+neError(e))}}finally{lock(false)}};
$('logout').onclick=async()=>{if(busy)return;lock(true);clear();try{await authSdk.signOut(auth);status('सफलतापूर्वक लगआउट भयो।')}catch(e){status('लगआउट असफल: '+neError(e))}finally{lock(false)}};
$('save').onclick=async()=>{if(busy||!actor)return;const attempt=epoch,currentActor=actor,currentSchool=schoolId;lock(true);try{const input={id:$('subjectId').value.trim(),name:$('subjectName').value,class:$('schoolClass').value,theoryFullMarks:$('theoryFullMarks').value,practicalFullMarks:$('practicalFullMarks').value,creditHour:$('creditHour').value};if(auth.currentUser?.uid!==currentActor.uid)throw new Error('Authentication changed');const session=await verifySchoolSession({schoolId:currentSchool,uid:currentActor.uid,readDocument:async path=>{const snap=await api.getDoc(api.doc(db,...path.split('/')));return snap.exists()?snap.data():null;}});if(attempt!==epoch||actor!==currentActor||schoolId!==currentSchool||auth.currentUser?.uid!==currentActor.uid||session.role!=='school_admin')throw new Error('School Admin session changed');const subject=await createSchoolSubject({db,api,actor:currentActor,schoolId:currentSchool,input});if(attempt===epoch&&actor===currentActor&&auth.currentUser?.uid===currentActor.uid){$('subjectId').value='';$('subjectName').value='';$('theoryFullMarks').value='';$('practicalFullMarks').value='';$('creditHour').value='';status('V47 मा विषय सिर्जना भयो: '+subject.id)}}catch(e){if(attempt===epoch)status('सिर्जना असफल: '+neError(e))}finally{lock(false)}};

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
 }catch(e){if(attempt===epoch)status('जाँच असफल: '+neError(e))}finally{lock(false)}
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
 }catch(e){if(attempt===epoch){invalidateInspection();status('सुधार असफल: '+neError(e))}}finally{lock(false)}
};

if(requestedSchool)queueMicrotask(()=>$('connect').click());
