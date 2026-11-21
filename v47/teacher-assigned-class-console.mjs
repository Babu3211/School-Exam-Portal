import {verifySchoolSession} from './verified-school-session.mjs';
import {verifyTeacherSubjectAssignment} from './verified-teacher-subject-assignment.mjs';
import {verifyTeacherAttendanceDuty} from './verified-teacher-attendance-duty.mjs';
import {loadCompleteClassRoster} from './complete-class-roster.mjs';
import {validateSchoolId} from './school-paths.mjs';
const $=id=>document.getElementById(id);
let auth,authSdk,api,db,actor=null,schoolId=null,epoch=0,selectionEpoch=0,busy=false;
const message=text=>{$('message').textContent=text};
function clear(){epoch++;selectionEpoch++;actor=null;schoolId=null;$('subjectId').replaceChildren();$('work').hidden=true;$('students').replaceChildren();$('count').textContent='';$('logout').disabled=true;$('load').disabled=true;$('loadAttendance').disabled=true}
function lock(value){busy=value;for(const id of ['login','logout','load','loadAttendance','loadAssignments','classId','subjectId','schoolId','email','password'])$(id).disabled=value;if(!value){$('login').disabled=!auth;$('logout').disabled=!actor;$('load').disabled=!actor||!$('subjectId').value;$('loadAttendance').disabled=!actor;$('loadAssignments').disabled=!actor;$('schoolId').disabled=!!actor;$('email').disabled=!!actor;$('password').disabled=!!actor}}
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
  db=api.getFirestore(app);$('connect').disabled=true;$('login').disabled=false;message('Connected to V47');
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
 finally{if(request===epoch)lock(false)}
};
$('logout').onclick=async()=>{if(busy)return;lock(true);clear();try{await authSdk.signOut(auth);message('Signed out')}catch(e){message('Sign out failed: '+e.message)}finally{lock(false)}};
$('classId').addEventListener('change',()=>{$('students').replaceChildren();$('count').textContent='';$('subjectId').replaceChildren();selectionEpoch++;if(!busy)lock(false)});
$('subjectId').addEventListener('change',()=>{$('students').replaceChildren();$('count').textContent='';selectionEpoch++;if(!busy)lock(false)});
$('loadAssignments').onclick=async()=>{
 if(busy||!actor)return;
 const request=epoch,selection=selectionEpoch,uid=actor.uid,id=schoolId,classId=$('classId').value;
 $('subjectId').replaceChildren();$('students').replaceChildren();$('count').textContent='';lock(true);
 const revalidate=async()=>{if(request!==epoch||selection!==selectionEpoch||auth?.currentUser?.uid!==uid||actor?.uid!==uid||schoolId!==id)throw new Error('School session or selection changed');await verifiedSession(uid,id)};
 try{
  await revalidate();
  const seen=new Set(),subjects=[];
  let cursor=null,pages=0;
  do{
   const constraints=[api.where('uid','==',uid),api.orderBy('__name__'),api.limit(100)];
   if(cursor)constraints.push(api.startAfter(cursor));
   const snap=await api.getDocs(api.query(api.collection(db,'schools',id,'teacher_assignments'),...constraints));
   await revalidate();
   if(!Array.isArray(snap?.docs)||snap.docs.length>100)throw new Error('Invalid teacher assignment page');
   if(++pages>20)throw new Error('Teacher assignment pagination limit exceeded');
   for(const document of snap.docs){
    const data=document.data();
    if(!document.id||document.id!==id+':'+uid+':'+data.classId+':'+data.subjectId||data.uid!==uid||data.schoolId!==id)throw new Error('Cross-school or forged teacher assignment');
    if(data.active!==true||data.classId!==classId||data.subjectId==='attendance')continue;
    if(seen.has(data.subjectId))throw new Error('Duplicate active teacher subject assignment');
    seen.add(data.subjectId);subjects.push(data.subjectId);
   }
   if(subjects.length>300)throw new Error('Too many assigned subjects');
   const next=snap.docs.length===100?snap.docs.at(-1):null;
   if(next&&next.id===cursor?.id)throw new Error('Teacher assignment pagination stalled');
   cursor=next;
  }while(cursor);
  const verified=[];
  for(const subjectId of subjects){
   const subject=await verifyTeacherSubjectAssignment({db,api,actor,schoolId:id,classId,subjectId,revalidate});
   verified.push({id:subjectId,name:subject.subjectName});
  }
  await revalidate();
  if(classId!==$('classId').value)throw new Error('Class changed');
  $('subjectId').replaceChildren();
  const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Select a verified subject';$('subjectId').append(placeholder);
  for(const subject of verified.sort((a,b)=>a.name.localeCompare(b.name,'en',{sensitivity:'base'})||a.id.localeCompare(b.id))){
   const option=document.createElement('option');option.value=subject.id;option.textContent=subject.name;$('subjectId').append(option);
  }
  $('load').disabled=true;
  message(verified.length+' assigned subjects verified. Choose a subject and load the class.');
 }catch(e){if(request===epoch&&selection===selectionEpoch){$('subjectId').replaceChildren();message('Assigned subject load failed: '+e.message)}}
 finally{if(request===epoch)lock(false)}
};
$('load').onclick=async()=>{
 if(busy||!actor)return;
 const request=epoch,selection=selectionEpoch,uid=actor.uid,id=schoolId,classId=$('classId').value,subjectId=$('subjectId').value.trim();
 $('students').replaceChildren();$('count').textContent='';lock(true);
 const revalidate=async()=>{if(request!==epoch||selection!==selectionEpoch||auth?.currentUser?.uid!==uid||actor?.uid!==uid||schoolId!==id)throw new Error('School session or selection changed');await verifiedSession(uid,id)};
 try{
  await verifyTeacherSubjectAssignment({db,api,actor,schoolId:id,classId,subjectId,revalidate});
  const roster=await loadCompleteClassRoster({db,api,actor,schoolId:id,classId});
  await revalidate();
  await verifyTeacherSubjectAssignment({db,api,actor,schoolId:id,classId,subjectId,revalidate});
  if(request!==epoch||selection!==selectionEpoch||classId!==$('classId').value||subjectId!==$('subjectId').value.trim())throw new Error('Selection changed');
  const fragment=document.createDocumentFragment();
  for(const student of [...roster.students].sort((a,b)=>String(a.name??a.id).localeCompare(String(b.name??b.id),'en',{sensitivity:'base',numeric:true})||a.id.localeCompare(b.id))){
   const tr=document.createElement('tr');
   for(const value of [student.name??student.id,student.class,student.id]){const td=document.createElement('td');td.textContent=String(value);tr.append(td)}
   fragment.append(tr);
  }
  $('students').append(fragment);$('count').textContent=roster.count+' assigned-class students (read-only)';message('विद्यार्थी सूची लोड भयो। यो पृष्ठबाट अंक Save गर्न मिल्दैन।');
 }catch(e){if(request===epoch&&selection===selectionEpoch){$('students').replaceChildren();$('count').textContent='';message('Access denied or roster unavailable: '+e.message)}}
 finally{if(request===epoch)lock(false)}
};

$('loadAttendance').onclick=async()=>{
 if(busy||!actor)return;
 const request=epoch,selection=selectionEpoch,uid=actor.uid,id=schoolId,classId=$('classId').value;
 $('students').replaceChildren();$('count').textContent='';lock(true);
 const revalidate=async()=>{if(request!==epoch||selection!==selectionEpoch||auth?.currentUser?.uid!==uid||actor?.uid!==uid||schoolId!==id)throw new Error('School session or selection changed');await verifiedSession(uid,id)};
 try{
  await verifyTeacherAttendanceDuty({db,api,actor,schoolId:id,classId,revalidate});
  const roster=await loadCompleteClassRoster({db,api,actor,schoolId:id,classId});
  await revalidate();
  await verifyTeacherAttendanceDuty({db,api,actor,schoolId:id,classId,revalidate});
  if(request!==epoch||selection!==selectionEpoch||classId!==$('classId').value)throw new Error('Class changed');
  const fragment=document.createDocumentFragment();
  for(const student of [...roster.students].sort((a,b)=>String(a.name??a.id).localeCompare(String(b.name??b.id),'en',{sensitivity:'base',numeric:true})||a.id.localeCompare(b.id))){
   const tr=document.createElement('tr');
   for(const value of [student.name??student.id,student.class,student.id]){const td=document.createElement('td');td.textContent=String(value);tr.append(td)}
   fragment.append(tr);
  }
  $('students').append(fragment);$('count').textContent=roster.count+' attendance-duty students (read-only)';
  message('Attendance जिम्मेवारी प्रमाणित भयो। विद्यार्थी सूची मात्र देखाइएको छ; Save गर्न मिल्दैन।');
 }catch(e){if(request===epoch&&selection===selectionEpoch){$('students').replaceChildren();$('count').textContent='';message('Attendance duty denied or roster unavailable: '+e.message)}}
 finally{lock(false)}
};
