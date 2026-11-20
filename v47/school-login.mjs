import {installSchoolAdminFeatures} from './school-admin-features.mjs';
import {installExamWorkflows} from './school-exam-workflows.mjs';
const $=id=>document.getElementById(id);
const status=message=>{$('status').textContent=message};
const config=Object.freeze({apiKey:"AIzaSyCqwHormyNH4Z5F8V0xJpW9rJcJeCtM0cQ",authDomain:"smss-exam-portal-v47.firebaseapp.com",projectId:"smss-exam-portal-v47",storageBucket:"smss-exam-portal-v47.firebasestorage.app",messagingSenderId:"570404092283",appId:"1:570404092283:web:b51a0d654bb9aaa82325de"});
const base='https://www.gstatic.com/firebasejs/11.10.0/';
let auth,authSdk,api,db,busy=false,verifiedSchool=null;
const classes=['ECD','LKG','UKG',...Array.from({length:12},(_,i)=>String(i+1))];
for(const c of classes){for(const id of ['classFilter','studentClass','subjectFilter','subjectClass']){const o=document.createElement('option');o.value=c;o.textContent=c;$(id).append(o)}}

const subjectStatus=m=>{$('subjectStatus').textContent=m};
const subjectCollection=()=>api.collection(db,'schools',verifiedSchool,'subjects');
async function loadSubjects(){
 if(!verifiedSchool)return;
 $('loadSubjects').disabled=true;
 try{
  const filter=$('subjectFilter').value;
  const q=filter?api.query(subjectCollection(),api.where('class','==',filter),api.limit(201)):api.query(subjectCollection(),api.limit(201));
  const snap=await api.getDocs(q);
  const rows=snap.docs.map(d=>({id:d.id,...d.data()}))
   .filter(x=>!filter||x.class===filter)
   .sort((a,b)=>String(a.class).localeCompare(String(b.class),undefined,{numeric:true})||String(a.name).localeCompare(String(b.name)));
  $('subjectList').replaceChildren();
  for(const x of rows){
   const div=document.createElement('div');
   div.className='student-row';
   div.textContent=x.name+' — Class '+x.class+(x.active===false?' (inactive)':'');
   $('subjectList').append(div);
  }
  $('subjectCount').textContent='Showing '+rows.length+' subjects'+(snap.size>200?' (more records exist; refine by class)':'');
 }catch(e){subjectStatus(e.message)}
 finally{$('loadSubjects').disabled=false}
}
$('loadSubjects').onclick=loadSubjects;
$('subjectFilter').onchange=loadSubjects;
$('addSubject').onclick=async()=>{
 if(!verifiedSchool||busy)return;
 busy=true;$('addSubject').disabled=true;
 try{
  const name=$('subjectName').value.trim(),klass=$('subjectClass').value;
  if(name.length<2||name.length>160||!classes.includes(klass))throw new Error('Enter a valid subject name and class');
  await api.addDoc(subjectCollection(),{schoolId:verifiedSchool,name,class:klass,active:true});
  $('subjectName').value='';
  subjectStatus('Subject saved to this school');
  await loadSubjects();
 }catch(e){subjectStatus(e.message)}
 finally{busy=false;$('addSubject').disabled=false}
};

const studentStatus=m=>{$('studentStatus').textContent=m};
const studentList=()=>api.collection(db,'schools',verifiedSchool,'students');
async function loadStudents(){if(!verifiedSchool)return;$('loadStudents').disabled=true;try{const snap=await api.getDocs(api.query(studentList(),api.limit(200)));const filter=$('classFilter').value;const rows=snap.docs.map(d=>({id:d.id,...d.data()})).filter(x=>!filter||x.class===filter).sort((a,b)=>String(a.class).localeCompare(String(b.class),undefined,{numeric:true})||String(a.name).localeCompare(String(b.name)));const list=$('studentList');list.replaceChildren();for(const x of rows){const div=document.createElement('div');div.className='student-row';div.textContent=`${x.name} — Class ${x.class}${x.rollNo?` — Roll ${x.rollNo}`:''}`;list.append(div)}$('studentCount').textContent=`Showing ${rows.length} students (up to 200 fetched)`;}catch(e){studentStatus(e.message)}finally{$('loadStudents').disabled=false}}
$('loadStudents').onclick=loadStudents;$('classFilter').onchange=loadStudents;
$('addStudent').onclick=async()=>{if(!verifiedSchool||busy)return;busy=true;$('addStudent').disabled=true;try{const name=$('studentName').value.trim(),klass=$('studentClass').value,rollNo=$('studentRoll').value.trim();if(name.length<2||name.length>160||!classes.includes(klass)||rollNo.length>30)throw new Error('Check student name, class and roll number');await api.addDoc(studentList(),{schoolId:verifiedSchool,name,class:klass,rollNo});$('studentName').value='';$('studentRoll').value='';studentStatus('Student saved to this school');await loadStudents()}catch(e){studentStatus(e.message)}finally{busy=false;$('addStudent').disabled=false}};

const adminFeatures=installSchoolAdminFeatures({getContext:()=>verifiedSchool?{schoolId:verifiedSchool,api,db}:null});
const examWorkflows=installExamWorkflows({getContext:()=>verifiedSchool?{schoolId:verifiedSchool,api,db}:null});
const schoolIdValid=id=>/^[A-Za-z0-9_-]{3,64}$/.test(id);
function reset(){verifiedSchool=null;adminFeatures.reset();examWorkflows.reset();$('studentList').replaceChildren();$('studentCount').textContent='Not loaded';studentStatus('');$('subjectList').replaceChildren();$('subjectCount').textContent='Not loaded';subjectStatus(''); $('dashboard').hidden=true;$('loginArea').hidden=false;$('password').value='';$('uid').textContent='';$('schoolName').textContent='';$('currentSchoolId').textContent='';$('role').textContent=''; }
async function signOut(){if(auth?.currentUser)await authSdk.signOut(auth);reset()}
async function initialize(){if(auth)return;
 if(config.projectId!=='smss-exam-portal-v47')throw new Error('V47 Firebase project required');
 const appSdk=await import(base+'firebase-app.js');
 authSdk=await import(base+'firebase-auth.js');
 api=await import(base+'firebase-firestore.js');
 const app=appSdk.initializeApp(config,'smss-v47-school-login');
 auth=authSdk.getAuth(app);await authSdk.setPersistence(auth,authSdk.inMemoryPersistence);db=api.getFirestore(app);
}
$('login').onclick=async()=>{if(busy)return;busy=true;$('login').disabled=true;
 try{const sid=$('schoolId').value.trim();if(!schoolIdValid(sid))throw new Error('Enter a valid School ID');
 const email=$('email').value.trim();const password=$('password').value;
 if(!email||!password)throw new Error('Enter email and password');
 await initialize();await signOut();await authSdk.signInWithEmailAndPassword(auth,email,password);$('password').value='';
 const uid=auth.currentUser.uid;
 // Direct document reads are scoped to the supplied school. Never query all schools.
 const schoolSnap=await api.getDoc(api.doc(db,'schools',sid));
 if(!schoolSnap.exists())throw new Error('School not found or access denied');
 const school=schoolSnap.data();if(school.active!==true)throw new Error('School is inactive');
 const memberSnap=await api.getDoc(api.doc(db,'schools',sid,'members',uid));
 if(!memberSnap.exists())throw new Error('No school membership');
 const member=memberSnap.data();
 if(member.uid!==uid||member.schoolId!==sid||member.active!==true||member.role!=='school_admin')throw new Error('Active School Admin membership required');
 $('schoolName').textContent=school.name||sid;$('currentSchoolId').textContent=sid;$('role').textContent='School Admin';$('uid').textContent=uid;
 verifiedSchool=sid;$('loginArea').hidden=true;$('dashboard').hidden=false;status('School Admin access verified for '+sid);await loadStudents();await loadSubjects();await adminFeatures.refresh();await examWorkflows.refresh();
 }catch(error){try{await signOut()}catch{}status(error?.code==='permission-denied'?'Access denied: check school membership and Firestore rules':(error?.message||'Sign-in failed'))}
 finally{busy=false;$('login').disabled=false}};
$('logout').onclick=async()=>{if(busy)return;busy=true;$('logout').disabled=true;try{await signOut();status('Signed out')}catch(e){status(e.message)}finally{busy=false;$('logout').disabled=false}};
