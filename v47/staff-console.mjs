import {neError} from './nepali-feedback.mjs';
import {connectSchoolFirebase,startVerifiedSchoolActivity,enforceSchoolIdle} from './school-firebase-client.mjs';
import {verifySchoolSession} from './verified-school-session.mjs';
import {validateSchoolId} from './school-paths.mjs';
import {createSchoolStore} from './firestore-adapter.mjs';
import {collectCompleteSchoolStaffExport} from './complete-school-staff-excel.mjs';
import {excelWorkbook} from './excel-workbook.mjs';
import {V46_STAFF_EXCEL_HEADERS,v46StaffExcelRow} from './v46-staff-excel-schema.mjs';
import {readV47StudentXlsx} from './read-v47-student-xlsx.mjs';
import {previewV46StaffExcelRows} from './staff-excel-preview.mjs';
import {importNewStaff,MAX_STAFF_IMPORT} from './staff-import-save.mjs';
import {checkExistingStaffEmployeeIds} from './staff-import-duplicate-preflight.mjs';
const $=id=>document.getElementById(id);
const requestedSchool=new URL(location.href).searchParams.get('schoolId');
let auth,authSdk,db,api,actor=null,store=null,schoolId=null,epoch=0,busy=false,loading=false,exporting=false,previewBusy=false,previewToken=0,cursor=null,seen=new Set(),hasMore=false;
let reviewedCells=null,importing=false;
const clearImport=()=>{reviewedCells=null;$('saveStaffImport').disabled=true;};
const status=s=>{$('message').textContent=s;};
const readDocument=async path=>{const snap=await api.getDocFromServer(api.doc(db,...path.split('/')));return snap.exists()?snap.data():null;};
function reset(){
 epoch++;previewToken++;clearImport();actor=null;
 $('staffImportArea').hidden=true;$('staffImportFile').value='';
 $('staffImportRows').replaceChildren();$('staffImportSummary').textContent='No Excel file reviewed';store=null;schoolId=null;cursor=null;seen=new Set();hasMore=false;loading=false;
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
   catch(e){status('विद्यालय छनोट अमान्य: '+neError(e));}
  }else status('V47 जडान भयो। विद्यालय Login प्रमाणित गर्नुहोस्।');
 }catch(e){status('जडान असफल: '+neError(e))}
};
$('login').onclick=async()=>{
 if(!auth||busy||loading||exporting||importing)return;
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
  $('mode').textContent=member.role==='viewer'?'Viewer — Read-only':member.role==='teacher'?'Teacher — Read-only':'School Admin — Staff management';
  $('records').hidden=false;$('staffImportArea').hidden=member.role!=='school_admin';$('logout').disabled=false;$('exportAll').disabled=false;
  busy=false;await loadPage(true);
 }catch(e){
  if(request===epoch){reset();try{if(auth?.currentUser)await authSdk.signOut(auth)}catch{}status('Login असफल: '+neError(e))}
 }finally{busy=false;$('login').disabled=!auth}
};
$('logout').onclick=async()=>{
 reset();
 try{if(auth)await authSdk.signOut(auth);status('Logout सफल भयो।')}
 catch(e){status('Logout असफल: '+neError(e))}
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
 }catch(e){if(token===epoch){hasMore=false;$('next').disabled=true;status('Staff विवरण लोड भएन: '+neError(e))}}
 finally{if(token===epoch){loading=false;$('refresh').disabled=false;$('next').disabled=!hasMore;$('exportAll').disabled=!actor||exporting;}}
}
$('downloadStaffTemplate').onclick=()=>{
 if(actor?.role!=='school_admin'||!actor.active)return;
 const url=URL.createObjectURL(excelWorkbook(V46_STAFF_EXCEL_HEADERS,[],{sheetName:'Staff'})),link=document.createElement('a');
 try{link.href=url;link.download='SMSS-Staff-Template.xlsx';document.body.append(link);link.click()}finally{link.remove();URL.revokeObjectURL(url)}
};
$('staffImportFile').onchange=()=>{
 previewToken++;clearImport();$('staffImportRows').replaceChildren();
 $('staffImportSummary').textContent='Excel changed. Review the selected file again.';
};
$('previewStaffImport').onclick=async()=>{
 if(previewBusy||importing||!actor||actor.role!=='school_admin')return;
 clearImport();
 const token=epoch,review=++previewToken,selectedActor=actor,selectedStore=store,selectedSchool=schoolId,uid=actor.uid;
 const file=$('staffImportFile').files?.[0];previewBusy=true;$('previewStaffImport').disabled=true;
 $('staffImportRows').replaceChildren();$('staffImportSummary').textContent='Checking staff Excel...';
 const assertSession=()=>{assertCurrent(token,selectedActor,selectedStore,selectedSchool,uid);
  if(review!==previewToken)throw new Error('Excel selection changed');
 };
 try{
  assertSession();
  if(!file||typeof file.name!=='string'||!/\.xlsx$/i.test(file.name))
   throw new Error('केवल Excel (.xlsx) फाइल छान्नुहोस्।');
  if(!await enforceSchoolIdle(auth,authSdk))throw new Error('Login समय समाप्त भयो');
  const before=await verifySchoolSession({schoolId:selectedSchool,uid,readDocument});
  assertSession();
  if(before.role!=='school_admin')throw new Error('School Admin permission required');
  const cells=await readV47StudentXlsx(file,{columns:11,maxDataRows:1500});
  assertSession();
  const result=previewV46StaffExcelRows({schoolId:selectedSchool,cells});
  const existing=await checkExistingStaffEmployeeIds({
   store:createSchoolStore({db,api:{...api,getDocs:api.getDocsFromServer},member:selectedActor,schoolId:selectedSchool,assertSession}),preview:result,assertSession,
   onProgress:count=>{assertSession();$('staffImportSummary').textContent=count+' existing Staff checked for duplicates...';}
  });
  assertSession();
  const after=await verifySchoolSession({schoolId:selectedSchool,uid,readDocument});
  assertSession();
  if(after.role!=='school_admin'||after.role!==before.role)throw new Error('School Admin role changed');
  for(const item of result.rows.slice(0,1500)){
   const tr=document.createElement('tr');
   for(const value of [item.row,item.employeeId,item.nameEnglish,item.nameNepali]){
    const td=document.createElement('td');td.textContent=String(value);tr.append(td);
   }
   $('staffImportRows').append(tr);
  }
  const details=[...result.errors.map(item=>'Row '+item.row+': '+item.error),
                 ...existing.duplicates.map(item=>'Row '+item.row+': Employee ID '+item.employeeId+' already exists in this school'),
                 ...result.warnings.map(item=>'Row '+item.row+': '+item.warning)];
  $('staffImportSummary').textContent=result.rows.length+' Excel rows; '+existing.scanned+
   ' existing school Staff checked; '+result.errors.length+' Excel errors; '+
   existing.duplicates.length+' matching existing Employee IDs; '+result.warnings.length+
   ' warnings. '+(existing.ready?'No conflicts found in this preflight. ':'Resolve conflicts before future import. ')+
   'अहिलेसम्म कुनै अभिलेख सुरक्षित गरिएको छैन।'+
   (details.length?' First issues: '+details.slice(0,8).join(' | '):'');
  if(existing.ready&&result.warnings.length===0&&result.rows.length>0&&result.rows.length<=MAX_STAFF_IMPORT&&existing.scanned+result.rows.length<=5000){reviewedCells=structuredClone(cells);$('saveStaffImport').disabled=false;}
  else $('staffImportSummary').textContent+=' सुरक्षित गर्न १–१०० त्रुटिरहित नयाँ अभिलेख, Employee ID र अंग्रेजी नाम आवश्यक छन्।';
 }catch(e){
  if(token===epoch&&review===previewToken&&actor===selectedActor)
   $('staffImportSummary').textContent='Excel पूर्वावलोकन असफल: '+neError(e)+' — कुनै अभिलेख परिवर्तन भएको छैन।';
 }finally{
  previewBusy=false;
  if(token===epoch)$('previewStaffImport').disabled=!actor||actor.role!=='school_admin';
 }
};
$('saveStaffImport').onclick=async()=>{
 if(importing||previewBusy||!reviewedCells||actor?.role!=='school_admin')return;
 const cells=reviewedCells,token=epoch,review=previewToken,selectedActor=actor,selectedStore=store,selectedSchool=schoolId,uid=actor.uid;
 if(!confirm('नयाँ कर्मचारी विवरण सुरक्षित गर्ने हो? पुराना विवरण र खाता परिवर्तन हुँदैनन्।'))return;
 importing=true;clearImport();$('staffImportFile').disabled=true;$('previewStaffImport').disabled=true;$('login').disabled=true;$('logout').disabled=true;
 const check=()=>{assertCurrent(token,selectedActor,selectedStore,selectedSchool,uid);if(review!==previewToken)throw Error('Excel selection changed')};
 try{
  check();if(!await enforceSchoolIdle(auth,authSdk))throw Error('Login समय समाप्त भयो');
  const liveStore=createSchoolStore({db,api:{...api,getDocs:api.getDocsFromServer},member:selectedActor,schoolId:selectedSchool,assertSession:check});
  const saved=await importNewStaff({db,api,actor:selectedActor,schoolId:selectedSchool,cells,store:liveStore,confirmed:true,assertCurrent:check});
  check();$('staffImportRows').replaceChildren();$('staffImportFile').value='';
  $('staffImportSummary').textContent=saved.count+' नयाँ कर्मचारी विवरण सुरक्षित भए। कुनै Teacher Account सिर्जना गरिएको छैन।';
  await loadPage(true);
 }catch(e){if(token===epoch&&actor===selectedActor)$('staffImportSummary').textContent='Import पुष्टि भएन: '+neError(e)+'। पुनः प्रयास गर्नुअघि Staff सूची र Excel फेरि जाँच्नुहोस्।';}
 finally{importing=false;$('staffImportFile').disabled=false;$('previewStaffImport').disabled=!actor||actor.role!=='school_admin';$('login').disabled=!auth;$('logout').disabled=!actor;}
};
$('refresh').onclick=()=>loadPage(true);
$('next').onclick=()=>loadPage(false);
$('exportAll').onclick=async()=>{
 if(!actor||!store||exporting||loading||importing)return;
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
 }catch(e){if(token===epoch&&actor===selectedActor)status('Excel Export रोकियो: '+neError(e))}
 finally{exporting=false;if(token===epoch&&actor===selectedActor)$('exportAll').disabled=false}
};
if(requestedSchool)queueMicrotask(()=>$('connect').click());
