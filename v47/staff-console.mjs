import {connectSchoolFirebase,startVerifiedSchoolActivity,enforceSchoolIdle} from './school-firebase-client.mjs';
import {verifySchoolSession} from './verified-school-session.mjs';
import {validateSchoolId} from './school-paths.mjs';
import {createSchoolStore} from './firestore-adapter.mjs';
import {collectCompleteSchoolStaffExport} from './complete-school-staff-excel.mjs';
import {excelWorkbook} from './excel-workbook.mjs';
import {v46StaffExcelRow} from './v46-staff-excel-schema.mjs';
const $=id=>document.getElementById(id);
const requestedSchool=new URL(location.href).searchParams.get('schoolId');
let auth,authSdk,db,api,actor=null,store=null,schoolId=null,epoch=0,busy=false,loading=false,exporting=false,cursor=null,seen=new Set(),hasMore=false;
const status=s=>{$('message').textContent=s;};
const readDocument=async path=>{const snap=await api.getDoc(api.doc(db,...path.split('/')));return snap.exists()?snap.data():null;};
function reset(){
 epoch++;actor=null;store=null;schoolId=null;cursor=null;seen=new Set();hasMore=false;loading=false;
 $('records').hidden=true;$('staffRows').replaceChildren();$('count').textContent='';
 $('next').disabled=true;$('exportAll').disabled=true;$('logout').disabled=true;
}
const assertCurrent=(token,selectedActor,selectedStore,selectedSchool,uid)=>{
 if(token!==epoch||!selectedActor||actor!==selectedActor||store!==selectedStore||
    schoolId!==selectedSchool||auth?.currentUser?.uid!==uid)
  throw new Error('विद्यालय वा Login परिवर्तन भयो। फेरि प्रमाणित गर्नुहोस्।');
};
$('connect').onclick=async()=>{
 if(auth)return;
 try{
  ({auth,authSdk,db,api}=await connectSchoolFirebase());
  authSdk.onAuthStateChanged(auth,user=>{
   if(actor&&user?.uid!==actor.uid){reset();status('Login फेरिएको छ। पुनः Login गर्नुहोस्।');}
  });
  $('connect').disabled=true;$('login').disabled=false;
  if(requestedSchool){
   try{$('schoolId').value=validateSchoolId(requestedSchool);if(auth.currentUser)queueMicrotask(()=>$('login').click());}
   catch(e){status('विद्यालय छनोट अमान्य: '+e.message);}
  }else status('V47 जडान भयो। विद्यालय Login प्रमाणित गर्नुहोस्।');
 }catch(e){status('जडान असफल: '+e.message)}
};
$('login').onclick=async()=>{
 if(!auth||busy||loading||exporting)return;
 reset();const request=epoch;busy=true;$('login').disabled=true;
 try{
  const selectedSchool=validateSchoolId($('schoolId').value.trim());
  const freshSignIn=!auth.currentUser;
  const credential=freshSignIn?await authSdk.signInWithEmailAndPassword(auth,$('email').value,$('password').value):{user:auth.currentUser};
  $('password').value='';const uid=credential.user.uid;
  const session=await verifySchoolSession({schoolId:selectedSchool,uid,readDocument});
  const school=await readDocument('schools/'+selectedSchool);
  if(request!==epoch||auth.currentUser?.uid!==uid||school?.active!==true||school?.id!==selectedSchool)
   throw new Error('विद्यालय वा Login प्रमाणित भएन।');
  const member={uid,schoolId:selectedSchool,role:session.role,active:true};
  const selectedStore=createSchoolStore({db,api,member,schoolId:selectedSchool,
   assertSession:()=>{if(request!==epoch||auth?.currentUser?.uid!==uid||actor!==member||schoolId!==selectedSchool)throw new Error('School session changed')}});
  actor=member;schoolId=selectedSchool;store=selectedStore;
  if(freshSignIn)startVerifiedSchoolActivity();
  $('heading').textContent='Staff — '+String(school.name??selectedSchool);
  $('mode').textContent=member.role==='viewer'?'Viewer — Read-only':member.role==='teacher'?'Teacher — Read-only':'School Admin — staff Excel read-only';
  $('records').hidden=false;$('logout').disabled=false;$('exportAll').disabled=false;
  busy=false;await loadPage(true);
 }catch(e){
  if(request===epoch){reset();try{if(auth?.currentUser)await authSdk.signOut(auth)}catch{}status('Login असफल: '+e.message)}
 }finally{busy=false;$('login').disabled=!auth}
};
$('logout').onclick=async()=>{
 reset();
 try{if(auth)await authSdk.signOut(auth);status('Logout सफल भयो।')}
 catch(e){status('Logout असफल: '+e.message)}
};
async function loadPage(resetPage=false){
 if(!actor||!store||loading||exporting)return;
 const token=epoch,selectedActor=actor,selectedStore=store,selectedSchool=schoolId,uid=actor.uid;
 loading=true;$('next').disabled=true;$('refresh').disabled=true;
 try{
  const next=await selectedStore.listPage('staff',{pageSize:50,cursor:resetPage?null:cursor});
  assertCurrent(token,selectedActor,selectedStore,selectedSchool,uid);
  if(resetPage){$('staffRows').replaceChildren();seen=new Set();}
  for(const item of next.records){
   if(seen.has(item.id))throw new Error('Duplicate staff page: refresh required');
   seen.add(item.id);
   const fields=v46StaffExcelRow(item),tr=document.createElement('tr');
   for(const value of [fields[0],fields[2],fields[1],fields[4],item.email??item.emailId??'']){
    const td=document.createElement('td');td.textContent=String(value??'');tr.append(td);
   }
   $('staffRows').append(tr);
  }
  cursor=next.cursor;hasMore=next.hasMore;
  $('count').textContent=seen.size+' staff records loaded'+(hasMore?' — more available':' — end of school roster');
  status('विद्यालयका Staff विवरण पढियो।');
 }catch(e){if(token===epoch){hasMore=false;$('next').disabled=true;status('Staff विवरण लोड भएन: '+e.message)}}
 finally{if(token===epoch){loading=false;$('refresh').disabled=false;$('next').disabled=!hasMore;$('exportAll').disabled=!actor||exporting;}}
}
$('refresh').onclick=()=>loadPage(true);
$('next').onclick=()=>loadPage(false);
$('exportAll').onclick=async()=>{
 if(!actor||!store||exporting||loading)return;
 const token=epoch,selectedActor=actor,selectedStore=store,selectedSchool=schoolId,uid=actor.uid;
 exporting=true;$('exportAll').disabled=true;
 const assertSession=()=>assertCurrent(token,selectedActor,selectedStore,selectedSchool,uid);
 try{
  if(!await enforceSchoolIdle(auth,authSdk))throw new Error('Login समय समाप्त भयो।');
  assertSession();
  const before=await verifySchoolSession({schoolId:selectedSchool,uid,readDocument});
  if(before.role!==selectedActor.role)throw new Error('विद्यालय अनुमति फेरियो।');
  const result=await collectCompleteSchoolStaffExport({
   store:selectedStore,assertSession,onProgress:count=>{assertSession();status(count+' Staff Excel Export का लागि जाँचिँदैछन्।');}
  });
  assertSession();
  const after=await verifySchoolSession({schoolId:selectedSchool,uid,readDocument});
  if(after.role!==before.role)throw new Error('विद्यालय अनुमति फेरियो।');
  if(!await enforceSchoolIdle(auth,authSdk))throw new Error('Login समय समाप्त भयो।');
  assertSession();
  const workbook=excelWorkbook(result.headers,result.rows,{sheetName:'Staff'});
  assertSession();
  const url=URL.createObjectURL(workbook),link=document.createElement('a');
  try{
   link.href=url;link.download='smss-v47-all-staff-'+selectedSchool+'.xlsx';
   document.body.append(link);link.click();
  }finally{link.remove();URL.revokeObjectURL(url)}
  status(result.count+' Staff विवरण Excel (.xlsx) मा Export भयो। यो Database Backup होइन।');
 }catch(e){if(token===epoch&&actor===selectedActor)status('Excel Export रोकियो: '+e.message)}
 finally{exporting=false;if(token===epoch&&actor===selectedActor)$('exportAll').disabled=false}
};
if(requestedSchool)queueMicrotask(()=>$('connect').click());
