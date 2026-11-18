import {onboardSchool} from './school-onboarding.mjs';
import {listSchools} from './school-list-service.mjs';
import {setSchoolActive} from './school-status-service.mjs';
const $=id=>document.getElementById(id);let auth,db,api,actor=null,cursor=null,mutating=false;
const status=message=>{$('message').textContent=message};
const V47_FIREBASE_CONFIG=Object.freeze({apiKey:"AIzaSyCqwHormyNH4Z5F8V0xJpW9rJcJeCtM0cQ",authDomain:"smss-exam-portal-v47.firebaseapp.com",projectId:"smss-exam-portal-v47",storageBucket:"smss-exam-portal-v47.firebasestorage.app",messagingSenderId:"570404092283",appId:"1:570404092283:web:b51a0d654bb9aaa82325de"});
const firebaseBase='https://www.gstatic.com/firebasejs/11.10.0/';
$('connect').onclick=async()=>{try{
 const config=V47_FIREBASE_CONFIG;
 if(config.projectId!=='smss-exam-portal-v47')throw new Error('Only the V47 Firebase project is allowed');
 const appSdk=await import(firebaseBase+'firebase-app.js');
 const authSdk=await import(firebaseBase+'firebase-auth.js');
 api=await import(firebaseBase+'firebase-firestore.js');
 const app=appSdk.initializeApp(config,'smss-v47-admin');auth=authSdk.getAuth(app);await authSdk.setPersistence(auth,authSdk.inMemoryPersistence);db=api.getFirestore(app);
 $('connect').disabled=true;$('login').disabled=false;$('connection').textContent='Connected to V47 project';
 $('login').onclick=async()=>{try{await authSdk.signInWithEmailAndPassword(auth,$('email').value,$('password').value);$('password').value='';await verifyAdmin();}catch(e){actor=null;$('adminArea').hidden=true;try{if(auth?.currentUser)await authSdk.signOut(auth)}catch{}status(e.message)}};
 $('logout').onclick=async()=>{if(mutating){status('Wait for school update to finish');return}await authSdk.signOut(auth);actor=null;$('adminArea').hidden=true;$('logout').disabled=true;$('identity').textContent='Not signed in';status('Signed out')};
 status('Connected. Sign in as a provisioned Super Admin.');
 }catch(e){status(e.message)}};
async function verifyAdmin(){actor=null;$('adminArea').hidden=true;const uid=auth.currentUser?.uid;if(!uid)throw new Error('Sign in first');
 // This document is intentionally client-unreadable: authorization is verified by a harmless scoped query.
 await api.getDocs(api.query(api.collection(db,'schools'),api.limit(1)));
 actor={active:true,role:'super_admin'};$('identity').textContent='Authenticated Super Admin: '+uid;$('logout').disabled=false;$('adminArea').hidden=false;status('Super Admin authorization verified');await refresh();}
async function refresh(){try{const result=await listSchools({db,api,actor,pageSize:30,cursor});const tbody=$('schools');tbody.replaceChildren();for(const school of result.schools){const tr=document.createElement('tr');for(const value of [school.id,school.name,school.active?'Active':'Inactive']){const td=document.createElement('td');td.textContent=String(value??'');tr.append(td)}const td=document.createElement('td'),button=document.createElement('button');button.textContent=school.active?'Deactivate':'Activate';button.onclick=async()=>{if(mutating)return;if(!confirm('Change school status for '+school.id+'?'))return;mutating=true;button.disabled=true;$('register').disabled=true;$('logout').disabled=true;try{await setSchoolActive({db,api,actor,schoolId:school.id,active:!school.active});cursor=null;await refresh()}catch(e){status(e.message)}finally{mutating=false;button.disabled=false;$('register').disabled=false;$('logout').disabled=false}};td.append(button);tr.append(td);tbody.append(tr)}$('next').disabled=!result.hasMore;$('next').onclick=()=>{cursor=result.cursor;refresh()};status('Loaded '+result.schools.length+' schools');}catch(e){status(e.message)}}
$('refresh').onclick=()=>{cursor=null;refresh()};
$('register').onclick=async()=>{if(mutating)return;try{if(!confirm('Register this school as INACTIVE and assign the first Admin?'))return;const form={id:$('schoolId').value.trim(),name:$('schoolName').value.trim(),iemisCode:$('iemis').value.trim()};mutating=true;$('register').disabled=true;$('logout').disabled=true;try{await onboardSchool({db,api,actor,form,adminUid:$('adminUid').value.trim()});cursor=null;await refresh();status('School registered as inactive. Activate after verification.')}finally{mutating=false;$('register').disabled=false;$('logout').disabled=false}}catch(e){status(e.message)}};
