import {connectSchoolFirebase,startVerifiedSchoolActivity,enforceSchoolIdle} from './school-firebase-client.mjs';
import {verifySchoolSession} from './verified-school-session.mjs';
import {validateSchoolId} from './school-paths.mjs';
import {schoolProfileView,validateSchoolProfile,canEditSchoolProfile,profileSignature,SCHOOL_PROFILE_FIELDS} from './school-settings-profile.mjs';
const requestedSchool=new URL(location.href).searchParams.get('schoolId');
const $=id=>document.getElementById(id);
let auth,authSdk,api,db,busy=false,epoch=0,actor=null,loadedProfile=null;
const message=text=>{$('message').textContent=text};
const registryRef=id=>api.doc(db,'schools',id);
const memberRef=(id,uid)=>api.doc(db,'schools',id,'members',uid);
const profileRef=id=>api.doc(db,'schools',id,'school_settings','profile');
const readDocument=async path=>{const snap=await api.getDoc(api.doc(db,...path.split('/')));return snap.exists()?snap.data():null};
function reset(){
 epoch++;actor=null;loadedProfile=null;$('settings').hidden=true;
 $('saveProfile').hidden=true;for(const id of ['iemis','name','active','role'])$(id).textContent='';
 for(const field of SCHOOL_PROFILE_FIELDS)$(field).value='';
}
function lock(value){
 busy=value;
 for(const id of ['login','logout','schoolId','email','password'])$(id).disabled=value;
 for(const field of SCHOOL_PROFILE_FIELDS)$(field).disabled=value||!canEditSchoolProfile(actor?.role);
 $('saveProfile').disabled=value||!canEditSchoolProfile(actor?.role);
 if(!value){
  $('login').disabled=!auth||!!actor;
  $('logout').disabled=!auth?.currentUser;
  $('schoolId').disabled=!!actor;
  $('email').disabled=!!actor;
  $('password').disabled=!!actor;
 }
}
$('connect').onclick=async()=>{
 if(auth)return;
 try{
  ({auth,authSdk,db,api}=await connectSchoolFirebase());
  authSdk.onAuthStateChanged(auth,user=>{
   if(actor&&user?.uid!==actor.uid){reset();message('प्रयोगकर्ता सत्र परिवर्तन भयो। पुनः लगइन गर्नुहोस्।')}
   if(!busy)lock(false);
  });
  $('connect').disabled=true;lock(false);message('V47 जडान भयो।');
  if(requestedSchool){try{$('schoolId').value=validateSchoolId(requestedSchool);if(auth.currentUser)queueMicrotask(()=>$('login').click())}catch(e){message('विद्यालय छनोट अमान्य: '+e.message)}}
 }catch(e){message('जडान असफल: '+e.message)}
};
$('login').onclick=async()=>{
 if(busy||!auth)return;
 reset();const request=epoch;lock(true);
 try{
  const id=validateSchoolId($('schoolId').value.trim());
  const freshSignIn=!auth.currentUser;
  const credential=freshSignIn?await authSdk.signInWithEmailAndPassword(auth,$('email').value,$('password').value):{user:auth.currentUser};
  $('password').value='';
  const uid=credential.user.uid;
  const session=await verifySchoolSession({schoolId:id,uid,readDocument});
  const [schoolSnap,profileSnap]=await Promise.all([api.getDoc(registryRef(id)),api.getDoc(profileRef(id))]);
  const fresh=await verifySchoolSession({schoolId:id,uid,readDocument});
  if(request!==epoch||auth.currentUser?.uid!==uid||id!==$('schoolId').value.trim()||fresh.role!==session.role)
   throw new Error('Session or school selection changed');
  const school=schoolSnap.exists()?schoolSnap.data():null;
  if(!school||school.id!==id||school.iemisCode!==id||school.active!==true)
   throw new Error('Verified school settings unavailable');
  if(profileSnap.exists()&&profileSnap.data().schoolId!==id)throw new Error('Cross-school profile rejected');
  const profile=schoolProfileView(profileSnap.exists()?profileSnap.data():{},school.name);
  loadedProfile=profile;actor={uid,schoolId:id,role:session.role};
  $('iemis').textContent=id;$('name').textContent=String(school.name);
  $('active').textContent='Active';$('role').textContent=session.role;
  for(const field of SCHOOL_PROFILE_FIELDS)$(field).value=profile[field];
  $('profileAccess').textContent=canEditSchoolProfile(session.role)?
   'School Admin may edit this school profile. IEMIS ID and registered status are locked.':
   'Read-only — Teacher / Viewer accounts cannot save, edit or delete school settings.';
  $('saveProfile').hidden=!canEditSchoolProfile(session.role);
  $('settings').hidden=false;
  if(freshSignIn)startVerifiedSchoolActivity();
  message('विद्यालयको विवरण प्रमाणित भयो।');
 }catch(e){
  if(request===epoch){reset();try{await authSdk.signOut(auth)}catch{}message('विद्यालय पुष्टि असफल: '+e.message)}
 }finally{lock(false)}
};
$('saveProfile').onclick=async()=>{
 if(busy||!actor||!canEditSchoolProfile(actor.role))return;
 const current=actor,request=epoch;lock(true);
 try{
  if(!await enforceSchoolIdle(auth,authSdk))throw new Error('एक घण्टाको निष्क्रियता: फेरि Login गर्नुहोस्');
  if(auth.currentUser?.uid!==current.uid)throw new Error('Login changed');
  const data=validateSchoolProfile(Object.fromEntries(SCHOOL_PROFILE_FIELDS.map(field=>[field,$(field).value])),current.schoolId);
  const currentSession=await verifySchoolSession({schoolId:current.schoolId,uid:current.uid,readDocument});
  if(currentSession.role!=='school_admin'||request!==epoch||actor!==current||auth.currentUser?.uid!==current.uid)
   throw new Error('School Admin permission changed');
  const baseline=profileSignature(loadedProfile);
  await api.runTransaction(db,async transaction=>{
   const [schoolSnap,memberSnap,settingsSnap]=await Promise.all([
    transaction.get(registryRef(current.schoolId)),
    transaction.get(memberRef(current.schoolId,current.uid)),
    transaction.get(profileRef(current.schoolId))
   ]);
   const school=schoolSnap.data(),member=memberSnap.data(),settings=settingsSnap.exists()?settingsSnap.data():{};
   if(!schoolSnap.exists()||school?.id!==current.schoolId||school?.active!==true||
      school?.iemisCode!==current.schoolId||!memberSnap.exists()||member?.uid!==current.uid||
      member?.schoolId!==current.schoolId||member?.active!==true||member?.role!=='school_admin')
    throw new Error('School or membership changed before settings save');
   if(settingsSnap.exists()&&settings.schoolId!==current.schoolId)
    throw new Error('Invalid school profile scope');
   if(profileSignature(schoolProfileView(settings,school.name))!==baseline)
    throw new Error('Settings changed in another session. Sign in again to reload.');
   if(request!==epoch||actor!==current||auth.currentUser?.uid!==current.uid)
    throw new Error('Session changed before settings save');
   transaction.set(profileRef(current.schoolId),{...data,updatedBy:current.uid,updatedAt:api.serverTimestamp()},{merge:true});
  });
  if(request!==epoch||actor!==current||auth.currentUser?.uid!==current.uid)return;
  loadedProfile=schoolProfileView(data);
  message('विद्यालयको नाम र ठेगाना सुरक्षित गरियो। IEMIS ID परिवर्तन भएको छैन।');
 }catch(e){if(request===epoch&&actor===current)message('विद्यालय विवरण सुरक्षित भएन: '+e.message)}
 finally{lock(false)}
};
$('logout').onclick=async()=>{
 if(busy)return;
 reset();lock(true);
 try{await authSdk.signOut(auth);message('Logout सफल भयो।')}
 catch(e){message('Logout असफल: '+e.message)}finally{lock(false)}
};
if(requestedSchool)queueMicrotask(()=>$('connect').click());
