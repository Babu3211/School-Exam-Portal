import {neError} from './nepali-feedback.mjs';
import {connectSchoolFirebase,startVerifiedSchoolActivity,bindVerifiedModuleActivity} from './school-firebase-client.mjs';
import {partitionSchoolExams} from './exam-history.mjs';
import {verifySchoolSession} from './verified-school-session.mjs';
import {validateSchoolId} from './school-paths.mjs';
import {createSchoolExamTerm} from './exam-term-service.mjs';
const requestedSchool=new URL(location.href).searchParams.get('schoolId');
const $=id=>document.getElementById(id),status=message=>{$('message').textContent=message};
let auth,authSdk,api,db,actor,schoolId,busy=false,epoch=0;
function clear(){epoch++;actor=null;schoolId=null;$('work').hidden=true;$('terms').replaceChildren();$('history').replaceChildren();$('logout').disabled=true;$('create').disabled=true;}
function lock(value){busy=value;$('login').disabled=value||!auth;$('logout').disabled=value||!actor;$('create').disabled=value||!actor;$('refresh').disabled=value||!actor;}
$('connect').onclick=async()=>{try{({auth,authSdk,db,api}=await connectSchoolFirebase());$('connect').disabled=true;lock(false);if(requestedSchool){$('schoolId').value=validateSchoolId(requestedSchool);if(auth.currentUser)queueMicrotask(()=>$('login').click())}status('V47 मा जडान भयो।')}catch(e){status('जडान असफल: '+neError(e))}};
async function reverifyAdmin(){if(!actor||!schoolId||!auth?.currentUser?.uid||auth.currentUser.uid!==actor.uid)throw new Error('Authentication changed');const requested=schoolId,uid=actor.uid;const session=await verifySchoolSession({schoolId:requested,uid,readDocument:async path=>{const snap=await api.getDoc(api.doc(db,...path.split('/')));return snap.exists()?snap.data():null;}});if(session.role!=='school_admin'||auth.currentUser?.uid!==uid||schoolId!==requested)throw new Error('School Admin session required');return session;}
async function loadTerms(){
 if(!actor)return;
 const requested=schoolId,current=epoch,uid=auth?.currentUser?.uid;
 if(!uid)throw new Error('Sign-in required');
 $('terms').replaceChildren();$('history').replaceChildren();
 await reverifyAdmin();
 const snap=await api.getDocs(api.collection(db,'schools',requested,'exams'));
 if(current!==epoch||schoolId!==requested||auth?.currentUser?.uid!==uid)return;
 await reverifyAdmin();
 if(current!==epoch||schoolId!==requested||auth?.currentUser?.uid!==uid)return;
 const {configured,history}=partitionSchoolExams(requested,snap.docs);
 for(const row of configured){const li=document.createElement('li');li.textContent=row.label;$('terms').append(li)}
 if(!configured.length){const li=document.createElement('li');li.textContent='No exam terms created';$('terms').append(li)}
 for(const row of history){const tr=document.createElement('tr');for(const val of [row.year,row.className,row.term,row.name,row.start,row.end]){const td=document.createElement('td');td.textContent=val;tr.append(td)}$('history').append(tr)}
 if(!history.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=6;td.textContent='No historical exams';tr.append(td);$('history').append(tr)}
 status('परीक्षा अवधि: '+configured.length+' · पुराना परीक्षा: '+history.length);
}
$('login').onclick=async()=>{if(busy)return;clear();const attempt=epoch;lock(true);try{const id=validateSchoolId($('schoolId').value.trim());const freshSignIn=!auth.currentUser;const credential=freshSignIn?await authSdk.signInWithEmailAndPassword(auth,$('email').value,$('password').value):{user:auth.currentUser};$('password').value='';if(attempt!==epoch)return;const uid=credential.user.uid;const session=await verifySchoolSession({schoolId:id,uid,readDocument:async path=>{const snap=await api.getDoc(api.doc(db,...path.split('/')));return snap.exists()?snap.data():null;}});if(attempt!==epoch||auth.currentUser?.uid!==uid||session.role!=='school_admin')throw new Error('School Admin required');const school=await api.getDoc(api.doc(db,'schools',id));if(attempt!==epoch||auth.currentUser?.uid!==uid||!school.exists()||school.data().active!==true)throw new Error('School unavailable');schoolId=id;actor={role:session.role,active:true,schoolId,uid};if(freshSignIn)startVerifiedSchoolActivity();{const activityMember=actor;bindVerifiedModuleActivity(activityMember,()=>actor===activityMember&&auth?.currentUser?.uid===activityMember.uid);}$('heading').textContent='Exam Terms — '+String(school.data().name??id);$('work').hidden=false;await loadTerms();}catch(e){if(attempt===epoch){clear();try{await authSdk.signOut(auth)}catch{}status('लगइन असफल: '+neError(e))}}finally{lock(false)}};
$('logout').onclick=async()=>{if(busy)return;lock(true);clear();try{await authSdk.signOut(auth);status('सफलतापूर्वक लगआउट भयो।')}catch(e){status('लगआउट असफल: '+neError(e))}finally{lock(false)}};
$('refresh').onclick=async()=>{if(busy||!actor)return;lock(true);try{await loadTerms()}catch(e){status('विवरण लोड भएन: '+neError(e))}finally{lock(false)}};
$('create').onclick=async()=>{if(busy||!actor)return;const attempt=epoch;lock(true);try{await reverifyAdmin();const result=await createSchoolExamTerm({db,api,actor,schoolId,term:$('term').value});if(attempt===epoch&&auth?.currentUser?.uid===actor?.uid){await loadTerms();status('परीक्षा अवधि सिर्जना भयो: '+result.term)}}catch(e){if(attempt===epoch)status('सिर्जना असफल: '+neError(e))}finally{lock(false)}};

if(requestedSchool)queueMicrotask(()=>$('connect').click());
