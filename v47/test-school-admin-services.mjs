import assert from 'node:assert/strict';
import {onboardSchool} from './school-onboarding.mjs';
import {setSchoolActive} from './school-status-service.mjs';
import {listSchools} from './school-list-service.mjs';

const admin={uid:'super123',role:'super_admin',active:true};
const viewer={role:'viewer',active:true,schoolId:'12345'};
const school={id:'12345',name:'Sample School',iemisCode:'12345'};
const makeDb=()=>({schools:new Map(),members:new Map(),updates:[]});
function mockApi(state){
 const key=(parts)=>parts.join('/');
 return {
  doc:(_db,...parts)=>key(parts),
  collection:(_db,...parts)=>key(parts),
  query:(collection,...constraints)=>({collection,constraints}),
  orderBy:(field)=>({orderBy:field}),
  limit:(size)=>({limit:size}),
  startAfter:(cursor)=>({startAfter:cursor}),
  getDocs:async(query)=>{const docs=[...state.schools.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([id,data])=>({id,data:()=>data}));const cursor=query.constraints.find(x=>x.startAfter)?.startAfter;const size=query.constraints.find(x=>x.limit)?.limit??30;const offset=cursor?docs.findIndex(x=>x.id===cursor.id)+1:0;return {docs:docs.slice(offset,offset+size)}},
  runTransaction:async(_db,callback)=>{
   const writes=[];
   const tx={
    get:async(ref)=>({exists:()=>ref.startsWith('schools/')&&!ref.includes('/members/')&&state.schools.has(ref.split('/')[1]),data:()=>state.schools.get(ref.split('/')[1])}),
    set:(ref,data)=>writes.push(['set',ref,data]),
    update:(ref,data)=>writes.push(['update',ref,data])
   };
   const result=await callback(tx);
   for(const [type,ref,data] of writes){
    const parts=ref.split('/');
    if(parts.length===2){const prev=state.schools.get(parts[1])??{};state.schools.set(parts[1],type==='update'?{...prev,...data}:data)}
    else if(parts.length===4)state.members.set(ref,data);
    state.updates.push([type,ref,data]);
   }
   return result;
  }
 };
}
const state=makeDb(),api=mockApi(state),db={};
let checks=0;
async function ok(name,fn){await fn();checks++;console.log('OK '+checks+' '+name)}
await ok('1 reject viewer school registration',async()=>{await assert.rejects(onboardSchool({db,api,actor:viewer,form:school,adminUid:'admin001'}))});
await ok('2 reject inactive Super Admin',async()=>{await assert.rejects(onboardSchool({db,api,actor:{...admin,active:false},form:school,adminUid:'admin001'}))});
await ok('3 reject invalid IEMIS ID',async()=>{await assert.rejects(onboardSchool({db,api,actor:admin,form:{...school,id:'abc'},adminUid:'admin001'}))});
await ok('3b reject missing IEMIS code',async()=>{await assert.rejects(onboardSchool({db,api,actor:admin,form:{...school,iemisCode:''},adminUid:'admin001'}))});
await ok('3c reject mismatched IEMIS code',async()=>{await assert.rejects(onboardSchool({db,api,actor:admin,form:{...school,iemisCode:'99999'},adminUid:'admin001'}))});
await ok('4 reject invalid admin UID',async()=>{await assert.rejects(onboardSchool({db,api,actor:admin,form:school,adminUid:'x'}))});
await ok('5 reject missing transaction SDK',async()=>{await assert.rejects(onboardSchool({db,api:{doc:api.doc},actor:admin,form:school,adminUid:'admin001'}))});
await ok('6 register school atomically',async()=>{await onboardSchool({db,api,actor:admin,form:school,adminUid:'admin001'});assert.equal(state.schools.size,1);assert.equal(state.members.size,1)});
await ok('7 school starts inactive',async()=>{assert.equal(state.schools.get('12345').active,false)});
await ok('8 first admin role scoped',async()=>{assert.deepEqual(state.members.get('schools/12345/members/admin001'),{uid:'admin001',schoolId:'12345',role:'school_admin',active:true})});
await ok('9 reject duplicate school',async()=>{await assert.rejects(onboardSchool({db,api,actor:admin,form:school,adminUid:'admin002'}));assert.equal(state.members.size,1)});
await ok('10 reject viewer school activation',async()=>{await assert.rejects(setSchoolActive({db,api,actor:viewer,schoolId:'12345',active:true}))});
await ok('11 reject invalid active value',async()=>{await assert.rejects(setSchoolActive({db,api,actor:admin,schoolId:'12345',active:'yes'}))});
await ok('12 reject nonexistent school activation',async()=>{await assert.rejects(setSchoolActive({db,api,actor:admin,schoolId:'67890',active:true}))});
await ok('13 activate existing school',async()=>{await setSchoolActive({db,api,actor:admin,schoolId:'12345',active:true});assert.equal(state.schools.get('12345').active,true)});
await ok('14 reject viewer school listing',async()=>{await assert.rejects(listSchools({db,api,actor:viewer}))});
await ok('15 school listing retains IEMIS document ID',async()=>{const result=await listSchools({db,api,actor:admin,pageSize:1});assert.equal(result.schools[0].id,'12345');assert.equal(result.hasMore,false)});
await ok('15b reject missing Firebase list SDK',async()=>{await assert.rejects(listSchools({db,api:{collection:api.collection},actor:admin}))});
await ok('15c reject invalid page size',async()=>{await assert.rejects(listSchools({db,api,actor:admin,pageSize:0}))});
await ok('16 reject oversized page',async()=>{await assert.rejects(listSchools({db,api,actor:admin,pageSize:1000000}))});
await ok('17 paginate with cursor without duplicates',async()=>{state.schools.set('23456',{...school,id:'23456',iemisCode:'23456',active:false});const first=await listSchools({db,api,actor:admin,pageSize:1});assert.equal(first.hasMore,true);const second=await listSchools({db,api,actor:admin,pageSize:1,cursor:first.cursor});assert.equal(second.schools[0].id,'23456')});

// Additional negative-path and state-integrity cases.
await ok('18 reject teacher school registration',async()=>{await assert.rejects(onboardSchool({db,api,actor:{role:'teacher',active:true,schoolId:'12345'},form:school,adminUid:'admin003'}))});
await ok('19 reject null registration actor',async()=>{await assert.rejects(onboardSchool({db,api,actor:null,form:school,adminUid:'admin003'}))});
await ok('20 reject numeric school ID',async()=>{await assert.rejects(onboardSchool({db,api,actor:admin,form:{...school,id:12345},adminUid:'admin003'}))});
await ok('21 reject too-short IEMIS ID',async()=>{await assert.rejects(onboardSchool({db,api,actor:admin,form:{...school,id:'1234',iemisCode:'1234'},adminUid:'admin003'}))});
await ok('22 reject too-long IEMIS ID',async()=>{await assert.rejects(onboardSchool({db,api,actor:admin,form:{...school,id:'123456789012345678901',iemisCode:'123456789012345678901'},adminUid:'admin003'}))});
await ok('23 reject empty school name',async()=>{await assert.rejects(onboardSchool({db,api,actor:admin,form:{...school,name:'  '},adminUid:'admin003'}))});
await ok('24 reject oversized school name',async()=>{await assert.rejects(onboardSchool({db,api,actor:admin,form:{...school,name:'x'.repeat(161)},adminUid:'admin003'}))});
await ok('25 reject admin UID containing slash',async()=>{await assert.rejects(onboardSchool({db,api,actor:admin,form:school,adminUid:'bad/uid'}))});
await ok('26 reject admin UID containing whitespace',async()=>{await assert.rejects(onboardSchool({db,api,actor:admin,form:school,adminUid:'bad uid'}))});
await ok('27 reject admin UID over 128 characters',async()=>{await assert.rejects(onboardSchool({db,api,actor:admin,form:school,adminUid:'x'.repeat(129)}))});
await ok('28 reject inactive Super Admin school activation',async()=>{await assert.rejects(setSchoolActive({db,api,actor:{...admin,active:false},schoolId:'12345',active:false}))});
await ok('29 reject malformed school activation ID',async()=>{await assert.rejects(setSchoolActive({db,api,actor:admin,schoolId:'../12345',active:false}))});
await ok('30 reject missing activation SDK',async()=>{await assert.rejects(setSchoolActive({db,api:{doc:api.doc},actor:admin,schoolId:'12345',active:false}))});
await ok('31 deactivate existing school',async()=>{await setSchoolActive({db,api,actor:admin,schoolId:'12345',active:false});assert.equal(state.schools.get('12345').active,false)});
await ok('32 deactivation preserves school identity',async()=>{assert.equal(state.schools.get('12345').iemisCode,'12345');assert.equal(state.schools.get('12345').name,'Sample School')});
await ok('33 reject inactive Super Admin school listing',async()=>{await assert.rejects(listSchools({db,api,actor:{...admin,active:false}}))});
await ok('34 reject fractional pagination size',async()=>{await assert.rejects(listSchools({db,api,actor:admin,pageSize:1.5}))});
await ok('35 reject negative pagination size',async()=>{await assert.rejects(listSchools({db,api,actor:admin,pageSize:-1}))});
await ok('36 reject string pagination size',async()=>{await assert.rejects(listSchools({db,api,actor:admin,pageSize:'1'}))});
await ok('37 list remains tenant-ID ordered',async()=>{const page=await listSchools({db,api,actor:admin,pageSize:2});assert.deepEqual(page.schools.map(x=>x.id),['12345','23456'])});
await ok('38 registration failures never create additional members',async()=>{assert.equal(state.members.size,1)});
await ok('39 registration failures never create additional schools',async()=>{assert.equal(state.schools.size,2)});

await ok('40 reject numeric IEMIS code',async()=>{await assert.rejects(onboardSchool({db,api,actor:admin,form:{...school,iemisCode:12345},adminUid:'admin003'}))});
await ok('41 reject numeric school name',async()=>{await assert.rejects(onboardSchool({db,api,actor:admin,form:{...school,name:12345},adminUid:'admin003'}))});
await ok('42 preserve leading-zero IEMIS code',async()=>{const leading={id:'00123',iemisCode:'00123',name:'Leading Zero School'};await onboardSchool({db,api,actor:admin,form:leading,adminUid:'admin004'});assert.equal(state.schools.get('00123').iemisCode,'00123')});

await ok('43 reject IEMIS ID with spaces',async()=>{await assert.rejects(onboardSchool({db,api,actor:admin,form:{...school,id:' 12345'},adminUid:'admin003'}))});
await ok('44 reject IEMIS ID with decimals',async()=>{await assert.rejects(onboardSchool({db,api,actor:admin,form:{...school,id:'123.45'},adminUid:'admin003'}))});
await ok('45 reject IEMIS ID with plus sign',async()=>{await assert.rejects(onboardSchool({db,api,actor:admin,form:{...school,id:'+12345'},adminUid:'admin003'}))});
await ok('46 reject IEMIS ID with slash',async()=>{await assert.rejects(onboardSchool({db,api,actor:admin,form:{...school,id:'12/345'},adminUid:'admin003'}))});
await ok('47 reject IEMIS ID with non-ASCII digits',async()=>{await assert.rejects(onboardSchool({db,api,actor:admin,form:{...school,id:'१२३४५'},adminUid:'admin003'}))});
await ok('48 reject IEMIS ID with newline',async()=>{await assert.rejects(onboardSchool({db,api,actor:admin,form:{...school,id:'12345\\n'},adminUid:'admin003'}))});
await ok('49 reject IEMIS mismatch with leading zero',async()=>{await assert.rejects(onboardSchool({db,api,actor:admin,form:{...school,id:'012345',iemisCode:'12345'},adminUid:'admin003'}))});
await ok('50 reject empty admin UID',async()=>{await assert.rejects(onboardSchool({db,api,actor:admin,form:school,adminUid:''}))});
await ok('51 reject numeric admin UID',async()=>{await assert.rejects(onboardSchool({db,api,actor:admin,form:school,adminUid:123456}))});
await ok('52 reject null school registration',async()=>{await assert.rejects(onboardSchool({db,api,actor:admin,form:null,adminUid:'admin003'}))});
await ok('53 reject array school registration',async()=>{await assert.rejects(onboardSchool({db,api,actor:admin,form:[],adminUid:'admin003'}))});
await ok('54 reject null school activation',async()=>{await assert.rejects(setSchoolActive({db,api,actor:admin,schoolId:'12345',active:null}))});
await ok('55 reject viewer deactivation',async()=>{await assert.rejects(setSchoolActive({db,api,actor:viewer,schoolId:'12345',active:false}))});
await ok('56 reject null school list actor',async()=>{await assert.rejects(listSchools({db,api,actor:null}))});
await ok('57 reject unsafe huge page size',async()=>{await assert.rejects(listSchools({db,api,actor:admin,pageSize:Number.MAX_SAFE_INTEGER}))});
await ok('58 reject malformed school document ID on listing',async()=>{const bad=makeDb();bad.schools.set('not-an-iemis',{id:'not-an-iemis',iemisCode:'not-an-iemis',name:'Invalid',active:false});await assert.rejects(listSchools({db,api:mockApi(bad),actor:admin}))});
await ok('59 reject mismatched school registry IEMIS code on listing',async()=>{const bad=makeDb();bad.schools.set('56789',{id:'56789',iemisCode:'99999',name:'Invalid',active:false});await assert.rejects(listSchools({db,api:mockApi(bad),actor:admin}))});
await ok('60 reject mismatched school registry ID on listing',async()=>{const bad=makeDb();bad.schools.set('56789',{id:'99999',iemisCode:'56789',name:'Invalid',active:false});await assert.rejects(listSchools({db,api:mockApi(bad),actor:admin}))});
await ok('61 reject missing school registry data on listing',async()=>{const bad=makeDb();bad.schools.set('56789',null);await assert.rejects(listSchools({db,api:mockApi(bad),actor:admin}))});
await ok('62 reject invalid school registry document with numeric ID field',async()=>{const bad=makeDb();bad.schools.set('56789',{id:56789,iemisCode:'56789',name:'Invalid',active:false});await assert.rejects(listSchools({db,api:mockApi(bad),actor:admin}))});


await ok('63 reject missing school name on listing',async()=>{const bad=makeDb();bad.schools.set('56789',{id:'56789',iemisCode:'56789',active:false});await assert.rejects(listSchools({db,api:mockApi(bad),actor:admin}))});
await ok('64 reject numeric school name on listing',async()=>{const bad=makeDb();bad.schools.set('56789',{id:'56789',iemisCode:'56789',name:123,active:false});await assert.rejects(listSchools({db,api:mockApi(bad),actor:admin}))});
await ok('65 reject empty school name on listing',async()=>{const bad=makeDb();bad.schools.set('56789',{id:'56789',iemisCode:'56789',name:'  ',active:false});await assert.rejects(listSchools({db,api:mockApi(bad),actor:admin}))});
await ok('66 reject too-long school name on listing',async()=>{const bad=makeDb();bad.schools.set('56789',{id:'56789',iemisCode:'56789',name:'x'.repeat(161),active:false});await assert.rejects(listSchools({db,api:mockApi(bad),actor:admin}))});
await ok('67 reject missing school active flag on listing',async()=>{const bad=makeDb();bad.schools.set('56789',{id:'56789',iemisCode:'56789',name:'Valid'});await assert.rejects(listSchools({db,api:mockApi(bad),actor:admin}))});
await ok('68 reject string school active flag on listing',async()=>{const bad=makeDb();bad.schools.set('56789',{id:'56789',iemisCode:'56789',name:'Valid',active:'true'});await assert.rejects(listSchools({db,api:mockApi(bad),actor:admin}))});
await ok('69 reject array school data on listing',async()=>{const bad=makeDb();bad.schools.set('56789',[]);await assert.rejects(listSchools({db,api:mockApi(bad),actor:admin}))});
await ok('70 reject absent school snapshot',async()=>{await assert.rejects(listSchools({db,api:{...api,getDocs:async()=>null},actor:admin}))});
await ok('71 reject missing school docs array',async()=>{await assert.rejects(listSchools({db,api:{...api,getDocs:async()=>({})},actor:admin}))});
await ok('72 reject oversized Firestore snapshot',async()=>{await assert.rejects(listSchools({db,api:{...api,getDocs:async()=>({docs:Array(3).fill({id:'12345',data:()=>school})})},actor:admin,pageSize:1}))});
await ok('73 reject school snapshot without data function',async()=>{await assert.rejects(listSchools({db,api:{...api,getDocs:async()=>({docs:[{id:'12345'}]})},actor:admin}))});
await ok('74 reject school snapshot with non-string ID',async()=>{await assert.rejects(listSchools({db,api:{...api,getDocs:async()=>({docs:[{id:12345,data:()=>school}]})},actor:admin}))});
await ok('75 reject school snapshot with missing ID',async()=>{await assert.rejects(listSchools({db,api:{...api,getDocs:async()=>({docs:[{data:()=>school}]})},actor:admin}))});
await ok('76 reject malformed Firestore docs object',async()=>{await assert.rejects(listSchools({db,api:{...api,getDocs:async()=>({docs:{length:1}})},actor:admin}))});
await ok('77 accept inactive school listing',async()=>{const page=await listSchools({db,api,actor:admin,pageSize:10});assert.equal(page.schools.find(x=>x.id==='12345').active,false)});
await ok('78 accept active school listing',async()=>{await setSchoolActive({db,api,actor:admin,schoolId:'12345',active:true});const page=await listSchools({db,api,actor:admin,pageSize:10});assert.equal(page.schools.find(x=>x.id==='12345').active,true);await setSchoolActive({db,api,actor:admin,schoolId:'12345',active:false})});
await ok('79 list leading-zero IEMIS school ID unchanged',async()=>{const page=await listSchools({db,api,actor:admin,pageSize:10});assert(page.schools.some(x=>x.id==='00123'&&x.iemisCode==='00123'))});
await ok('80 list results do not expose member records',async()=>{const page=await listSchools({db,api,actor:admin,pageSize:10});assert(page.schools.every(x=>!('members' in x)))});


await ok('81 reject non-string IEMIS code with boolean',async()=>{await assert.rejects(onboardSchool({db,api,actor:admin,form:{...school,iemisCode:true},adminUid:'admin003'}))});
await ok('82 reject null IEMIS code',async()=>{await assert.rejects(onboardSchool({db,api,actor:admin,form:{...school,iemisCode:null},adminUid:'admin003'}))});
await ok('83 reject undefined IEMIS code',async()=>{await assert.rejects(onboardSchool({db,api,actor:admin,form:{...school,iemisCode:undefined},adminUid:'admin003'}))});
await ok('84 reject object school name',async()=>{await assert.rejects(onboardSchool({db,api,actor:admin,form:{...school,name:{}},adminUid:'admin003'}))});
await ok('85 reject array school name',async()=>{await assert.rejects(onboardSchool({db,api,actor:admin,form:{...school,name:['School']},adminUid:'admin003'}))});
await ok('86 reject blank IEMIS code with whitespace',async()=>{await assert.rejects(onboardSchool({db,api,actor:admin,form:{...school,iemisCode:' 12345 '},adminUid:'admin003'}))});
await ok('87 reject malformed admin UID with period',async()=>{await assert.rejects(onboardSchool({db,api,actor:admin,form:school,adminUid:'admin.001'}))});
await ok('88 reject admin UID with at sign',async()=>{await assert.rejects(onboardSchool({db,api,actor:admin,form:school,adminUid:'admin@001'}))});
await ok('89 reject school status string false',async()=>{await assert.rejects(setSchoolActive({db,api,actor:admin,schoolId:'12345',active:'false'}))});
await ok('90 reject school status number zero',async()=>{await assert.rejects(setSchoolActive({db,api,actor:admin,schoolId:'12345',active:0}))});
await ok('91 reject invalid school ID for status update',async()=>{await assert.rejects(setSchoolActive({db,api,actor:admin,schoolId:'',active:true}))});
await ok('92 reject school list page size NaN',async()=>{await assert.rejects(listSchools({db,api,actor:admin,pageSize:NaN}))});
await ok('93 reject school list page size Infinity',async()=>{await assert.rejects(listSchools({db,api,actor:admin,pageSize:Infinity}))});
await ok('94 reject malformed school name containing only tabs',async()=>{await assert.rejects(onboardSchool({db,api,actor:admin,form:{...school,name:'\\t\\t\\t'},adminUid:'admin003'}))});
await ok('95 school listing does not mutate stored IEMIS records',async()=>{const before=JSON.stringify([...state.schools]);await listSchools({db,api,actor:admin,pageSize:10});assert.equal(JSON.stringify([...state.schools]),before)});


await ok('96 reject school registration with boolean name',async()=>{await assert.rejects(onboardSchool({db,api,actor:admin,form:{...school,name:true},adminUid:'admin003'}))});
await ok('97 reject school registration with null name',async()=>{await assert.rejects(onboardSchool({db,api,actor:admin,form:{...school,name:null},adminUid:'admin003'}))});
await ok('98 reject school registration with undefined name',async()=>{await assert.rejects(onboardSchool({db,api,actor:admin,form:{...school,name:undefined},adminUid:'admin003'}))});
await ok('99 reject school registration with nested ID object',async()=>{await assert.rejects(onboardSchool({db,api,actor:admin,form:{...school,id:{value:'12345'}},adminUid:'admin003'}))});
await ok('100 reject school registration with negative ID',async()=>{await assert.rejects(onboardSchool({db,api,actor:admin,form:{...school,id:'-12345'},adminUid:'admin003'}))});
await ok('101 reject school registration with scientific ID',async()=>{await assert.rejects(onboardSchool({db,api,actor:admin,form:{...school,id:'1e2345'},adminUid:'admin003'}))});
await ok('102 reject admin UID containing colon',async()=>{await assert.rejects(onboardSchool({db,api,actor:admin,form:school,adminUid:'admin:001'}))});
await ok('103 reject admin UID containing newline',async()=>{await assert.rejects(onboardSchool({db,api,actor:admin,form:school,adminUid:'admin\\n001'}))});
await ok('104 reject school status array',async()=>{await assert.rejects(setSchoolActive({db,api,actor:admin,schoolId:'12345',active:[]}))});
await ok('105 reject school status object',async()=>{await assert.rejects(setSchoolActive({db,api,actor:admin,schoolId:'12345',active:{value:true}}))});
await ok('106 reject school list page size null',async()=>{await assert.rejects(listSchools({db,api,actor:admin,pageSize:null}))});
await ok('107 reject school list page size boolean',async()=>{await assert.rejects(listSchools({db,api,actor:admin,pageSize:true}))});
await ok('108 reject school list page size object',async()=>{await assert.rejects(listSchools({db,api,actor:admin,pageSize:{value:1}}))});
await ok('109 reject school registry list with array name',async()=>{const bad=makeDb();bad.schools.set('56789',{id:'56789',iemisCode:'56789',name:['School'],active:true});await assert.rejects(listSchools({db,api:mockApi(bad),actor:admin}))});
await ok('110 reject school registry list with null active flag',async()=>{const bad=makeDb();bad.schools.set('56789',{id:'56789',iemisCode:'56789',name:'Valid',active:null});await assert.rejects(listSchools({db,api:mockApi(bad),actor:admin}))});


await ok('111 school list strips unexpected confidential fields',async()=>{const bad=makeDb();bad.schools.set('56789',{id:'56789',iemisCode:'56789',name:'Valid School',active:true,secret:'hidden',members:['admin']});const page=await listSchools({db,api:mockApi(bad),actor:admin});assert.deepEqual(page.schools[0],{id:'56789',iemisCode:'56789',name:'Valid School',active:true})});
await ok('112 school list returns exactly four public fields',async()=>{const page=await listSchools({db,api,actor:admin});assert(page.schools.every(x=>Object.keys(x).length===4))});
await ok('113 school list preserves true activation boolean',async()=>{const bad=makeDb();bad.schools.set('56789',{id:'56789',iemisCode:'56789',name:'Valid School',active:true});const page=await listSchools({db,api:mockApi(bad),actor:admin});assert.equal(page.schools[0].active,true)});
await ok('114 school list preserves false activation boolean',async()=>{const bad=makeDb();bad.schools.set('56789',{id:'56789',iemisCode:'56789',name:'Valid School',active:false});const page=await listSchools({db,api:mockApi(bad),actor:admin});assert.equal(page.schools[0].active,false)});
await ok('115 school list preserves IEMIS as text',async()=>{const page=await listSchools({db,api,actor:admin});assert(page.schools.every(x=>typeof x.iemisCode==='string'))});
await ok('116 school list preserves name as text',async()=>{const page=await listSchools({db,api,actor:admin});assert(page.schools.every(x=>typeof x.name==='string'))});
await ok('117 school list strips unexpected email field',async()=>{const bad=makeDb();bad.schools.set('56789',{id:'56789',iemisCode:'56789',name:'Valid School',active:false,email:'private@example.invalid'});const page=await listSchools({db,api:mockApi(bad),actor:admin});assert(!('email' in page.schools[0]))});
await ok('118 school list strips unexpected password field',async()=>{const bad=makeDb();bad.schools.set('56789',{id:'56789',iemisCode:'56789',name:'Valid School',active:false,password:'private'});const page=await listSchools({db,api:mockApi(bad),actor:admin});assert(!('password' in page.schools[0]))});
await ok('119 school list strips unexpected phone field',async()=>{const bad=makeDb();bad.schools.set('56789',{id:'56789',iemisCode:'56789',name:'Valid School',active:false,phone:'private'});const page=await listSchools({db,api:mockApi(bad),actor:admin});assert(!('phone' in page.schools[0]))});
await ok('120 school list strips unexpected token field',async()=>{const bad=makeDb();bad.schools.set('56789',{id:'56789',iemisCode:'56789',name:'Valid School',active:false,token:'private'});const page=await listSchools({db,api:mockApi(bad),actor:admin});assert(!('token' in page.schools[0]))});
await ok('121 school list strips unexpected metadata field',async()=>{const bad=makeDb();bad.schools.set('56789',{id:'56789',iemisCode:'56789',name:'Valid School',active:false,metadata:{secret:'private'}});const page=await listSchools({db,api:mockApi(bad),actor:admin});assert(!('metadata' in page.schools[0]))});
await ok('122 school list returns new objects',async()=>{const page=await listSchools({db,api,actor:admin});assert.notStrictEqual(page.schools[0],state.schools.get(page.schools[0].id))});
await ok('123 school list cannot modify registry via returned object',async()=>{const page=await listSchools({db,api,actor:admin});const original=state.schools.get(page.schools[0].id).name;page.schools[0].name='Changed';assert.equal(state.schools.get(page.schools[0].id).name,original)});
await ok('124 school list refuses missing active field despite valid other fields',async()=>{const bad=makeDb();bad.schools.set('56789',{id:'56789',iemisCode:'56789',name:'Valid School'});await assert.rejects(listSchools({db,api:mockApi(bad),actor:admin}))});
await ok('125 school list preserves leading zero after field filtering',async()=>{const page=await listSchools({db,api,actor:admin});const leading=page.schools.find(x=>x.id==='00123');assert.equal(leading.iemisCode,'00123')});


await ok('126 unchanged inactive school status does not write',async()=>{const bad=makeDb();bad.schools.set('56789',{id:'56789',iemisCode:'56789',name:'Valid School',active:false});await setSchoolActive({db,api:mockApi(bad),actor:admin,schoolId:'56789',active:false});assert.equal(bad.updates.length,0)});
await ok('127 unchanged active school status does not write',async()=>{const bad=makeDb();bad.schools.set('56789',{id:'56789',iemisCode:'56789',name:'Valid School',active:true});await setSchoolActive({db,api:mockApi(bad),actor:admin,schoolId:'56789',active:true});assert.equal(bad.updates.length,0)});
await ok('128 reject activation with mismatched IEMIS code',async()=>{const bad=makeDb();bad.schools.set('56789',{id:'56789',iemisCode:'12345',name:'Valid School',active:false});await assert.rejects(setSchoolActive({db,api:mockApi(bad),actor:admin,schoolId:'56789',active:true}));assert.equal(bad.updates.length,0)});
await ok('129 reject activation with mismatched school ID',async()=>{const bad=makeDb();bad.schools.set('56789',{id:'12345',iemisCode:'56789',name:'Valid School',active:false});await assert.rejects(setSchoolActive({db,api:mockApi(bad),actor:admin,schoolId:'56789',active:true}));assert.equal(bad.updates.length,0)});
await ok('130 reject activation with missing school data',async()=>{const bad=makeDb();bad.schools.set('56789',null);await assert.rejects(setSchoolActive({db,api:mockApi(bad),actor:admin,schoolId:'56789',active:true}));assert.equal(bad.updates.length,0)});
await ok('131 reject activation with missing active flag',async()=>{const bad=makeDb();bad.schools.set('56789',{id:'56789',iemisCode:'56789',name:'Valid School'});await assert.rejects(setSchoolActive({db,api:mockApi(bad),actor:admin,schoolId:'56789',active:true}));assert.equal(bad.updates.length,0)});
await ok('132 reject activation with string active flag',async()=>{const bad=makeDb();bad.schools.set('56789',{id:'56789',iemisCode:'56789',name:'Valid School',active:'false'});await assert.rejects(setSchoolActive({db,api:mockApi(bad),actor:admin,schoolId:'56789',active:true}));assert.equal(bad.updates.length,0)});
await ok('133 activation changes only status field',async()=>{const bad=makeDb();bad.schools.set('56789',{id:'56789',iemisCode:'56789',name:'Valid School',active:false});await setSchoolActive({db,api:mockApi(bad),actor:admin,schoolId:'56789',active:true});assert.deepEqual(bad.updates[0],['update','schools/56789',{active:true}])});
await ok('134 activation preserves school name',async()=>{const bad=makeDb();bad.schools.set('56789',{id:'56789',iemisCode:'56789',name:'Valid School',active:false});await setSchoolActive({db,api:mockApi(bad),actor:admin,schoolId:'56789',active:true});assert.equal(bad.schools.get('56789').name,'Valid School')});
await ok('135 activation preserves IEMIS code',async()=>{const bad=makeDb();bad.schools.set('56789',{id:'56789',iemisCode:'56789',name:'Valid School',active:false});await setSchoolActive({db,api:mockApi(bad),actor:admin,schoolId:'56789',active:true});assert.equal(bad.schools.get('56789').iemisCode,'56789')});
await ok('136 deactivation changes only status field',async()=>{const bad=makeDb();bad.schools.set('56789',{id:'56789',iemisCode:'56789',name:'Valid School',active:true});await setSchoolActive({db,api:mockApi(bad),actor:admin,schoolId:'56789',active:false});assert.deepEqual(bad.updates[0],['update','schools/56789',{active:false}])});
await ok('137 reject activation of malformed school data array',async()=>{const bad=makeDb();bad.schools.set('56789',[]);await assert.rejects(setSchoolActive({db,api:mockApi(bad),actor:admin,schoolId:'56789',active:true}))});
await ok('138 activation returns school ID unchanged',async()=>{const bad=makeDb();bad.schools.set('56789',{id:'56789',iemisCode:'56789',name:'Valid School',active:false});const result=await setSchoolActive({db,api:mockApi(bad),actor:admin,schoolId:'56789',active:true});assert.equal(result.schoolId,'56789')});
await ok('139 activation returns boolean status',async()=>{const bad=makeDb();bad.schools.set('56789',{id:'56789',iemisCode:'56789',name:'Valid School',active:false});const result=await setSchoolActive({db,api:mockApi(bad),actor:admin,schoolId:'56789',active:true});assert.strictEqual(result.active,true)});
await ok('140 unchanged status preserves existing record',async()=>{const bad=makeDb();bad.schools.set('56789',{id:'56789',iemisCode:'56789',name:'Valid School',active:false});const before=JSON.stringify([...bad.schools]);await setSchoolActive({db,api:mockApi(bad),actor:admin,schoolId:'56789',active:false});assert.equal(JSON.stringify([...bad.schools]),before)});


await ok('141 reject pagination cursor with missing ID',async()=>{await assert.rejects(listSchools({db,api,actor:admin,cursor:{}}))});
await ok('142 reject pagination cursor with numeric ID',async()=>{await assert.rejects(listSchools({db,api,actor:admin,cursor:{id:12345}}))});
await ok('143 reject pagination cursor with foreign path ID',async()=>{await assert.rejects(listSchools({db,api,actor:admin,cursor:{id:'../12345'}}))});
await ok('144 reject pagination cursor with non-IEMIS ID',async()=>{await assert.rejects(listSchools({db,api,actor:admin,cursor:{id:'abcdef'}}))});
await ok('145 accept pagination cursor with leading-zero IEMIS',async()=>{const page=await listSchools({db,api,actor:admin,pageSize:1});assert.equal(page.schools[0].id,'00123');const next=await listSchools({db,api,actor:admin,pageSize:1,cursor:page.cursor});assert.equal(next.schools[0].id,'12345')});


await ok('146 reject duplicate school IDs in snapshot',async()=>{const record={id:'56789',iemisCode:'56789',name:'Valid School',active:false};const doc={id:'56789',data:()=>record};await assert.rejects(listSchools({db,api:{...api,getDocs:async()=>({docs:[doc,doc]})},actor:admin,pageSize:2}))});
await ok('147 reject duplicate IDs even with different names',async()=>{const docs=[{id:'56789',data:()=>({id:'56789',iemisCode:'56789',name:'First School',active:false})},{id:'56789',data:()=>({id:'56789',iemisCode:'56789',name:'Other School',active:true})}];await assert.rejects(listSchools({db,api:{...api,getDocs:async()=>({docs})},actor:admin,pageSize:2}))});
await ok('148 reject activation with empty school name',async()=>{const bad=makeDb();bad.schools.set('56789',{id:'56789',iemisCode:'56789',name:'',active:false});await assert.rejects(setSchoolActive({db,api:mockApi(bad),actor:admin,schoolId:'56789',active:true}));assert.equal(bad.updates.length,0)});
await ok('149 reject activation with whitespace school name',async()=>{const bad=makeDb();bad.schools.set('56789',{id:'56789',iemisCode:'56789',name:'   ',active:false});await assert.rejects(setSchoolActive({db,api:mockApi(bad),actor:admin,schoolId:'56789',active:true}));assert.equal(bad.updates.length,0)});
await ok('150 reject activation with numeric school name',async()=>{const bad=makeDb();bad.schools.set('56789',{id:'56789',iemisCode:'56789',name:123,active:false});await assert.rejects(setSchoolActive({db,api:mockApi(bad),actor:admin,schoolId:'56789',active:true}));assert.equal(bad.updates.length,0)});
await ok('151 reject activation with array school name',async()=>{const bad=makeDb();bad.schools.set('56789',{id:'56789',iemisCode:'56789',name:[],active:false});await assert.rejects(setSchoolActive({db,api:mockApi(bad),actor:admin,schoolId:'56789',active:true}));assert.equal(bad.updates.length,0)});
await ok('152 reject activation with oversized school name',async()=>{const bad=makeDb();bad.schools.set('56789',{id:'56789',iemisCode:'56789',name:'x'.repeat(161),active:false});await assert.rejects(setSchoolActive({db,api:mockApi(bad),actor:admin,schoolId:'56789',active:true}));assert.equal(bad.updates.length,0)});
await ok('153 reject activation with missing school name',async()=>{const bad=makeDb();bad.schools.set('56789',{id:'56789',iemisCode:'56789',active:false});await assert.rejects(setSchoolActive({db,api:mockApi(bad),actor:admin,schoolId:'56789',active:true}));assert.equal(bad.updates.length,0)});
await ok('154 reject activation with null school name',async()=>{const bad=makeDb();bad.schools.set('56789',{id:'56789',iemisCode:'56789',name:null,active:false});await assert.rejects(setSchoolActive({db,api:mockApi(bad),actor:admin,schoolId:'56789',active:true}));assert.equal(bad.updates.length,0)});
await ok('155 reject activation with object school name',async()=>{const bad=makeDb();bad.schools.set('56789',{id:'56789',iemisCode:'56789',name:{text:'Valid School'},active:false});await assert.rejects(setSchoolActive({db,api:mockApi(bad),actor:admin,schoolId:'56789',active:true}));assert.equal(bad.updates.length,0)});
await ok('156 accept activation with valid 3-character name',async()=>{const bad=makeDb();bad.schools.set('56789',{id:'56789',iemisCode:'56789',name:'ABC',active:false});await setSchoolActive({db,api:mockApi(bad),actor:admin,schoolId:'56789',active:true});assert.equal(bad.schools.get('56789').active,true)});
await ok('157 accept activation with valid 160-character name',async()=>{const bad=makeDb();bad.schools.set('56789',{id:'56789',iemisCode:'56789',name:'A'.repeat(160),active:false});await setSchoolActive({db,api:mockApi(bad),actor:admin,schoolId:'56789',active:true});assert.equal(bad.schools.get('56789').active,true)});
await ok('158 reject malformed snapshot duplicate with valid pagination size',async()=>{const record={id:'56789',iemisCode:'56789',name:'Valid School',active:true};await assert.rejects(listSchools({db,api:{...api,getDocs:async()=>({docs:[{id:'56789',data:()=>record},{id:'56789',data:()=>record}]})},actor:admin,pageSize:10}))});
await ok('159 reject activation with string school record',async()=>{const bad=makeDb();bad.schools.set('56789','text');await assert.rejects(setSchoolActive({db,api:mockApi(bad),actor:admin,schoolId:'56789',active:true}));assert.equal(bad.updates.length,0)});
await ok('160 reject activation with boolean school record',async()=>{const bad=makeDb();bad.schools.set('56789',true);await assert.rejects(setSchoolActive({db,api:mockApi(bad),actor:admin,schoolId:'56789',active:true}));assert.equal(bad.updates.length,0)});


await ok('161 reject duplicate school in lookahead record',async()=>{const record=id=>({id,iemisCode:id,name:'Valid School',active:false});const docs=['56789','56789'].map(id=>({id,data:()=>record(id)}));await assert.rejects(listSchools({db,api:{...api,getDocs:async()=>({docs})},actor:admin,pageSize:1}))});
await ok('162 reject out-of-order school snapshots',async()=>{const record=id=>({id,iemisCode:id,name:'Valid School',active:false});const docs=['67890','56789'].map(id=>({id,data:()=>record(id)}));await assert.rejects(listSchools({db,api:{...api,getDocs:async()=>({docs})},actor:admin,pageSize:2}))});
await ok('163 reject school snapshot before pagination cursor',async()=>{const record={id:'56789',iemisCode:'56789',name:'Valid School',active:false};await assert.rejects(listSchools({db,api:{...api,getDocs:async()=>({docs:[{id:'56789',data:()=>record}]})},actor:admin,cursor:{id:'67890',data:()=>({})}}))});
await ok('164 reject school snapshot equal to pagination cursor',async()=>{const record={id:'56789',iemisCode:'56789',name:'Valid School',active:false};await assert.rejects(listSchools({db,api:{...api,getDocs:async()=>({docs:[{id:'56789',data:()=>record}]})},actor:admin,cursor:{id:'56789',data:()=>({})}}))});
await ok('165 accept ordered school snapshot with lookahead',async()=>{const record=id=>({id,iemisCode:id,name:'Valid School',active:false});const docs=['56789','67890'].map(id=>({id,data:()=>record(id)}));const page=await listSchools({db,api:{...api,getDocs:async()=>({docs})},actor:admin,pageSize:1});assert.equal(page.schools.length,1);assert.equal(page.hasMore,true)});
await ok('166 reject duplicate school lookahead on second page',async()=>{const record=id=>({id,iemisCode:id,name:'Valid School',active:false});const docs=['67890','67890'].map(id=>({id,data:()=>record(id)}));await assert.rejects(listSchools({db,api:{...api,getDocs:async()=>({docs})},actor:admin,pageSize:1,cursor:{id:'56789',data:()=>({})}}))});
await ok('167 reject nonnumeric school ID in lookahead',async()=>{const record=id=>({id,iemisCode:id,name:'Valid School',active:false});const docs=['56789','bad'].map(id=>({id,data:()=>record(id)}));await assert.rejects(listSchools({db,api:{...api,getDocs:async()=>({docs})},actor:admin,pageSize:1}))});
await ok('168 reject numeric school ID in lookahead',async()=>{const record={id:'56789',iemisCode:'56789',name:'Valid School',active:false};const docs=[{id:'56789',data:()=>record},{id:67890,data:()=>record}];await assert.rejects(listSchools({db,api:{...api,getDocs:async()=>({docs})},actor:admin,pageSize:1}))});
await ok('169 accept valid ordered snapshot after cursor',async()=>{const record={id:'67890',iemisCode:'67890',name:'Valid School',active:false};const page=await listSchools({db,api:{...api,getDocs:async()=>({docs:[{id:'67890',data:()=>record}]})},actor:admin,cursor:{id:'56789',data:()=>({})}});assert.equal(page.schools[0].id,'67890')});
await ok('170 reject reversed leading-zero school IDs',async()=>{const record=id=>({id,iemisCode:id,name:'Valid School',active:false});const docs=['12345','00123'].map(id=>({id,data:()=>record(id)}));await assert.rejects(listSchools({db,api:{...api,getDocs:async()=>({docs})},actor:admin,pageSize:2}))});


await ok('171 reject forged pagination cursor without snapshot data method',async()=>{await assert.rejects(listSchools({db,api,actor:admin,cursor:{id:'12345'}}))});
await ok('172 reject pagination cursor with nonfunction data',async()=>{await assert.rejects(listSchools({db,api,actor:admin,cursor:{id:'12345',data:true}}))});
await ok('173 reject pagination cursor with null data method',async()=>{await assert.rejects(listSchools({db,api,actor:admin,cursor:{id:'12345',data:null}}))});
await ok('174 accept valid leading-zero snapshot cursor',async()=>{const first=await listSchools({db,api,actor:admin,pageSize:1});const next=await listSchools({db,api,actor:admin,pageSize:1,cursor:first.cursor});assert.notEqual(first.schools[0].id,next.schools[0].id)});


await ok('175 reject lookahead school with mismatched IEMIS',async()=>{const good={id:'56789',iemisCode:'56789',name:'Valid School',active:false};const bad={...good,id:'67890',iemisCode:'56789'};await assert.rejects(listSchools({db,api:{...api,getDocs:async()=>({docs:[{id:'56789',data:()=>good},{id:'67890',data:()=>bad}]})},actor:admin,pageSize:1}))});
await ok('176 reject lookahead school with invalid active status',async()=>{const good={id:'56789',iemisCode:'56789',name:'Valid School',active:false};const bad={id:'67890',iemisCode:'67890',name:'Valid School',active:'yes'};await assert.rejects(listSchools({db,api:{...api,getDocs:async()=>({docs:[{id:'56789',data:()=>good},{id:'67890',data:()=>bad}]})},actor:admin,pageSize:1}))});
await ok('177 reject lookahead school without data method',async()=>{const good={id:'56789',iemisCode:'56789',name:'Valid School',active:false};await assert.rejects(listSchools({db,api:{...api,getDocs:async()=>({docs:[{id:'56789',data:()=>good},{id:'67890'}]})},actor:admin,pageSize:1}))});
await ok('178 accept valid lookahead school without exposing extra record',async()=>{const good={id:'56789',iemisCode:'56789',name:'Valid School',active:false};const next={id:'67890',iemisCode:'67890',name:'Next School',active:true};const result=await listSchools({db,api:{...api,getDocs:async()=>({docs:[{id:'56789',data:()=>good},{id:'67890',data:()=>next}]})},actor:admin,pageSize:1});assert.equal(result.schools.length,1);assert.equal(result.hasMore,true);assert.equal(result.cursor.id,'56789')});

console.log('PASS '+checks+' V47 school admin service checks (mock SDK; Firebase emulator verification still required)');
