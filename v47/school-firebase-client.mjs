import {V47_FIREBASE_CONFIG} from './v47-firebase-config.mjs';
export const SCHOOL_APP_NAME='smss-v47-school-session';
export async function connectSchoolFirebase(){
 if(V47_FIREBASE_CONFIG.projectId!=='smss-exam-portal-v47')throw Error('V47 Firebase project required');
 const base='https://www.gstatic.com/firebasejs/11.10.0/';
 const [appSdk,authSdk,api]=await Promise.all([import(base+'firebase-app.js'),import(base+'firebase-auth.js'),import(base+'firebase-firestore.js')]);
 const app=appSdk.getApps().find(item=>item.name===SCHOOL_APP_NAME)??appSdk.initializeApp(V47_FIREBASE_CONFIG,SCHOOL_APP_NAME);
 if(app.options.projectId!=='smss-exam-portal-v47')throw Error('Unexpected Firebase project');
 const auth=authSdk.getAuth(app);
 await authSdk.setPersistence(auth,authSdk.browserSessionPersistence);
 await auth.authStateReady();
 return {auth,authSdk,db:api.getFirestore(app),api};
}
