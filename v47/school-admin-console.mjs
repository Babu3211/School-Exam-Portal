import {verifySchoolSession} from './verified-school-session.mjs';
import {getSchoolDetails} from './school-detail-service.mjs';
import {listSchoolMembers} from './member-list-service.mjs';
import {addSchoolMember} from './member-management.mjs';
import {setSchoolMemberActive} from './member-status-service.mjs';
import {createTeacherAssignment,setTeacherAssignmentActive} from './teacher-assignment-management.mjs';
import {validateSchoolId} from './school-paths.mjs';
const $=id=>document.getElementById(id);const status=msg=>{$('message').textContent=msg};let auth,authSdk,db,api,actor=null,schoolId=null,sessionEpoch=0,busy=false,loggingIn=false;
$('connect').onclick=async()=>{try{const config=JSON.parse($('config').value);if(config.projectId!=='smss-exam-portal-v47')throw new Error('V47 project only');const appSdk=await import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js');authSdk=await import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js');api=await import('https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js');const app=appSdk.initializeApp(config,'smss-v47-school-admin');auth=authSdk.getAuth(app);await authSdk.setPersistence(auth,authSdk.inMemoryPersistence);db=api.getFirestore(app);$('connect').disabled=true;$('login').disabled=false;status('Connected to V47');}catch(e){status(e.message)}};
$('login').onclick=async()=>{if(busy||loggingIn)return;loggingIn=true;$('login').disabled=true;actor=null;$('schoolArea').hidden=true;const current=++sessionEpoch;const loginAuth=auth;try{const requestedSchool=validateSchoolId($('schoolId').value.trim());schoolId=requestedSchool;const credential=await authSdk.signInWithEmailAndPassword(auth,$('email').value,$('password').value);$('password').value='';const uid=credential.user.uid;const selectedSchool=requestedSchool;if(current!==sessionEpoch){if(loginAuth.currentUser?.uid===uid)await authSdk.signOut(loginAuth);return}const session=await verifySchoolSession({schoolId:selectedSchool,uid,readDocument:async path=>{const snap=await api.getDoc(api.doc(db,...path.split('/')));return snap.exists()?snap.data():null;}});if(current!==sessionEpoch){if(loginAuth.currentUser?.uid===uid)await authSdk.signOut(loginAuth);return}if(loginAuth.currentUser?.uid!==uid||schoolId!==selectedSchool||session.role!=='school_admin')throw new Error('School Admin membership required');actor={role:'school_admin',active:true,schoolId,uid};const school=await getSchoolDetails({db,api,actor,schoolId});if(current!==sessionEpoch||loginAuth.currentUser?.uid!==uid){actor=null;return}$('schoolTitle').textContent=school.name+' ('+school.id+')';$('schoolArea').hidden=false;$('logout').disabled=false;await refresh();}catch(e){if(current===sessionEpoch){actor=null;$('schoolArea').hidden=true;try{if(loginAuth?.currentUser)await authSdk.signOut(loginAuth)}catch{}status(e.message)}}finally{loggingIn=false;$('login').disabled=false}};
$('logout').onclick=async()=>{if(busy){status('Wait for member save to finish');return}sessionEpoch++;actor=null;$('schoolArea').hidden=true;try{await authSdk.signOut(auth);$('schoolArea').hidden=true;$('logout').disabled=true;status('Signed out')}catch(e){status(e.message)}};
async function refresh(){if(!actor)return;try{const records=await listSchoolMembers({db,api,actor,schoolId});const tbody=$('members');tbody.replaceChildren();for(const member of records){const tr=document.createElement('tr');for(const value of [member.uid,member.role,member.active?'Yes':'No']){const td=document.createElement('td');td.textContent=String(value);tr.append(td)}if(['teacher','viewer'].includes(member.role)){const td=document.createElement('td');const btn=document.createElement('button');btn.textContent=member.active?'Deactivate':'Activate';btn.onclick=async()=>{if(busy)return;if(!confirm((member.active?'Deactivate ':'Activate ')+member.role+' '+member.uid+'?'))return;busy=true;btn.disabled=true;$('logout').disabled=true;try{await setSchoolMemberActive({db,api,actor,schoolId,uid:member.uid,active:!member.active});await refresh()}catch(e){status(e.message)}finally{busy=false;btn.disabled=false;$('logout').disabled=false}};td.append(btn);tr.append(td)}tbody.append(tr)}status('Loaded '+records.length+' members (first page)')}catch(e){status(e.message)}}
$('refresh').onclick=refresh;
$('add').onclick=async()=>{if(busy)return;try{if(!actor)throw new Error('Sign in as School Admin');const uid=$('memberUid').value.trim(),role=$('role').value;if(!confirm('Add '+role+' '+uid+' to '+schoolId+'?'))return;busy=true;$('add').disabled=true;$('logout').disabled=true;$('login').disabled=true;try{await addSchoolMember({db,api,actor,schoolId,uid,role});$('memberUid').value='';await refresh();status('Member created INACTIVE. An authorized admin must activate membership after verifying the Firebase Auth account.')}finally{busy=false;$('add').disabled=false;$('logout').disabled=false;$('login').disabled=false}}catch(e){status(e.message)}};

async function assignmentAction(kind){
 if(busy||!actor)return;
 const uid=$('assignmentUid').value.trim(),classId=$('assignmentClass').value,subjectId=$('assignmentSubject').value.trim();
 if(!confirm(kind+' teacher '+uid+' for class '+classId+' / subject '+subjectId+'?'))return;
 busy=true;
 for(const id of ['assignTeacher','activateAssignment','deactivateAssignment','logout'])$(id).disabled=true;
 try{
  if(kind==='Create')await createTeacherAssignment({db,api,actor,schoolId,uid,classId,subjectId});
  else await setTeacherAssignmentActive({db,api,actor,schoolId,uid,classId,subjectId,active:kind==='Activate'});
  status('Teacher assignment '+kind.toLowerCase()+' successful');
 }catch(e){status('Teacher assignment failed: '+e.message)}
 finally{busy=false;for(const id of ['assignTeacher','activateAssignment','deactivateAssignment','logout'])$(id).disabled=false;}
}
$('assignTeacher').onclick=()=>assignmentAction('Create');
$('activateAssignment').onclick=()=>assignmentAction('Activate');
$('deactivateAssignment').onclick=()=>assignmentAction('Deactivate');
