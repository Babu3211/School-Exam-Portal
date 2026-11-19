const $=id=>document.getElementById(id);
const status=message=>{$('status').textContent=message};
const config=Object.freeze({apiKey:"AIzaSyCqwHormyNH4Z5F8V0xJpW9rJcJeCtM0cQ",authDomain:"smss-exam-portal-v47.firebaseapp.com",projectId:"smss-exam-portal-v47",storageBucket:"smss-exam-portal-v47.firebasestorage.app",messagingSenderId:"570404092283",appId:"1:570404092283:web:b51a0d654bb9aaa82325de"});
const base='https://www.gstatic.com/firebasejs/11.10.0/';
let auth,authSdk,api,db,busy=false;
const schoolIdValid=id=>/^[A-Za-z0-9_-]{3,64}$/.test(id);
function reset(){ $('dashboard').hidden=true;$('loginArea').hidden=false;$('password').value='';$('uid').textContent='';$('schoolName').textContent='';$('currentSchoolId').textContent='';$('role').textContent=''; }
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
 const email=$('email').value.trim();if(!email||!$('password').value)throw new Error('Enter email and password');
 await initialize();await signOut();await authSdk.signInWithEmailAndPassword(auth,email,$('password').value);$('password').value='';
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
 $('loginArea').hidden=true;$('dashboard').hidden=false;status('School Admin access verified for '+sid);
 }catch(error){try{await signOut()}catch{}status(error?.code==='permission-denied'?'Access denied: check school membership and Firestore rules':(error?.message||'Sign-in failed'))}
 finally{busy=false;$('login').disabled=false}};
$('logout').onclick=async()=>{if(busy)return;busy=true;$('logout').disabled=true;try{await signOut();status('Signed out')}catch(e){status(e.message)}finally{busy=false;$('logout').disabled=false}};
