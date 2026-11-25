import {createModuleActivityTracker} from './module-activity-tracker.mjs';
import {V47_FIREBASE_CONFIG} from './v47-firebase-config.mjs';
export const SCHOOL_APP_NAME='smss-v47-school-session';
const IDLE_LIMIT=60*60*1000;
const ACTIVITY_KEY='smss-v47-last-activity';
let trackingInstalled=false,moduleActivity=null;
export function bindVerifiedModuleActivity(member,isCurrent){
 if(!moduleActivity)return;
 // Telemetry must never block an academic workflow.
 try{moduleActivity.bind(member,isCurrent);void moduleActivity.note()}catch{}
}
export function touchSchoolActivity(){
 const now=Date.now(),previous=Number(sessionStorage.getItem(ACTIVITY_KEY));
 if(previous&&now-previous>=IDLE_LIMIT)return false;
 sessionStorage.setItem(ACTIVITY_KEY,String(now));
 return true;
}
export function startVerifiedSchoolActivity(){
 sessionStorage.setItem(ACTIVITY_KEY,String(Date.now()));
}
export async function enforceSchoolIdle(auth,authSdk){
 const previous=Number(sessionStorage.getItem(ACTIVITY_KEY));
 if(auth.currentUser&&(!Number.isFinite(previous)||previous<=0||Date.now()-previous>=IDLE_LIMIT||previous>Date.now()+60*1000)){
  sessionStorage.removeItem(ACTIVITY_KEY);
  await authSdk.signOut(auth);
  return false;
 }
 return true;
}
export async function connectSchoolFirebase(){
 if(V47_FIREBASE_CONFIG.projectId!=='smss-exam-portal-v47')throw Error('V47 Firebase project required');
 const base='https://www.gstatic.com/firebasejs/11.10.0/';
 const [appSdk,authSdk,api]=await Promise.all([import(base+'firebase-app.js'),import(base+'firebase-auth.js'),import(base+'firebase-firestore.js')]);
 const app=appSdk.getApps().find(item=>item.name===SCHOOL_APP_NAME)??appSdk.initializeApp(V47_FIREBASE_CONFIG,SCHOOL_APP_NAME);
 if(app.options.projectId!=='smss-exam-portal-v47')throw Error('Unexpected Firebase project');
 const auth=authSdk.getAuth(app);
 await authSdk.setPersistence(auth,authSdk.browserSessionPersistence);
 await auth.authStateReady();
 await enforceSchoolIdle(auth,authSdk);
 const db=api.getFirestore(app);
 if(!moduleActivity)moduleActivity=createModuleActivityTracker({db,api,auth,storage:sessionStorage,visible:()=>!document.hidden});
 if(!trackingInstalled){
  trackingInstalled=true;
  for(const eventName of ['pointerdown','keydown'])document.addEventListener(eventName,()=>{
   if(!auth.currentUser)return;
   if(!touchSchoolActivity())void enforceSchoolIdle(auth,authSdk);
   else void moduleActivity?.note();
  },{capture:true,passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)void enforceSchoolIdle(auth,authSdk)});
  setInterval(()=>{void enforceSchoolIdle(auth,authSdk)},30*1000);
 }
 return {auth,authSdk,db,api};
}
