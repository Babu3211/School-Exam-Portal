import {createV46ReadOnlyBridge} from './v46-readonly-bridge.mjs';
import {assertIemisSchoolId} from './iemis-school-identity.mjs';
const $=id=>document.getElementById(id);
let auth,authSdk,db,firestoreApi,epoch=0,busy=false,connecting=false;
const status=message=>{$('message').textContent=message};
function clear(){epoch++;$('report').hidden=true;$('counts').replaceChildren();$('school').textContent='';$('password').value=''}
$('connect').onclick=async()=>{
 if(connecting||auth)return;
 connecting=true;$('connect').disabled=true;
 try{
  const config=JSON.parse($('config').value);
  if(config.projectId!=='smss-exam-portal-v47')throw new Error('V47 Firebase project required');
  const [appSdk,aSdk,fSdk]=await Promise.all([
   import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js'),
   import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js'),
   import('https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js')
  ]);
  const app=appSdk.initializeApp(config,'smss-v47-report-preview');
  authSdk=aSdk;firestoreApi=fSdk;auth=aSdk.getAuth(app);
  await aSdk.setPersistence(auth,aSdk.inMemoryPersistence);
  db=fSdk.getFirestore(app);
  $('connect').disabled=true;$('login').disabled=false;
  status('V47 connected. Sign in to inspect your school.');
 }catch(error){status(error.message);$('connect').disabled=false}
 finally{connecting=false}
};
$('login').onclick=async()=>{
 if(busy)return;
 busy=true;clear();const current=epoch;
 $('login').disabled=true;$('logout').disabled=false;
 try{
  const schoolId=assertIemisSchoolId($('schoolId').value.trim());
  const credential=await authSdk.signInWithEmailAndPassword(auth,$('email').value,$('password').value);
  $('password').value='';
  if(current!==epoch){if(auth.currentUser?.uid===credential.user.uid)await authSdk.signOut(auth);return}
  const bridge=await createV46ReadOnlyBridge({schoolId,auth,db,firestoreApi});
  if(current!==epoch){if(auth.currentUser?.uid===credential.user.uid)await authSdk.signOut(auth);return}
  const rows=await bridge.loadExamReportRows();
  if(current!==epoch||auth.currentUser?.uid!==credential.user.uid)return;
  if(rows.publicationAllowed!==false||rows.complete!==false)throw new Error('Preview-only report protection missing');
  $('school').textContent='IEMIS School ID: '+rows.schoolId;
  for(const [label,key] of [['Students','students'],['Subjects','subjects'],['Exams','exams'],['Marks','marks'],['Mark Settings','markSettings']]){
   const tr=document.createElement('tr'),name=document.createElement('td'),count=document.createElement('td');
   name.textContent=label;count.textContent=String(rows[key].length);tr.append(name,count);$('counts').append(tr);
  }
  $('report').hidden=false;status('Read-only report inputs loaded. No results were published.');
 }catch(error){if(current===epoch){clear();try{if(auth?.currentUser)await authSdk.signOut(auth)}catch{}status('Report unavailable: '+error.message)}}
 finally{busy=false;$('login').disabled=!auth;if(!auth?.currentUser)$('logout').disabled=true}
};
$('logout').onclick=async()=>{clear();$('logout').disabled=true;try{if(auth)await authSdk.signOut(auth);status('Signed out')}catch(error){status(error.message)}};
