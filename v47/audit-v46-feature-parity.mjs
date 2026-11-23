// Source-level V46 -> V47 feature inventory. This is NOT an end-to-end test.
// A development route or text mention is never counted as verified parity.
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const v46=read('index.html'),hub=read('v47/index.html');
const features=[
 {name:'Dashboard',v46:/dashboard/i,v47:['v47/index.html'],production:/development hub|development workspace|independent prototypes/i},
 {name:'School settings',v46:/school settings/i,v47:['v47/school-settings.html']},
 {name:'Student records',v46:/student/i,v47:['v47/students.html']},
 {name:'Teacher and staff records',v46:/teacher|staff/i,v47:['v47/staff.html']},
 {name:'Attendance',v46:/attendance/i,v47:['v47/attendance.html']},
 {name:'Exam management',v46:/exam/i,v47:['v47/exams.html']},
 {name:'Marks entry',v46:/mark/i,v47:['v47/marks-entry.html'],production:/read.only|development|disabled/i},
 {name:'Grade ledger',v46:/grade ledger/i,v47:['v47/grade-ledger.html'],production:/not valid for official use|development preview/i},
 {name:'Grade sheet',v46:/grade sheet/i,v47:['v47/grade-sheet.html'],production:/not valid for official use|development preview/i},
 {name:'Question paper',v46:/question paper/i,v47:['v47/question-paper.html'],production:/READ-ONLY PREVIEW|not official question paper generation/i},
 {name:'PWA install',v46:/manifest|serviceWorker/i,v47:['v47/manifest.webmanifest']},
 {name:'Super Admin',v46:null,v47:['v47/admin.html']},
 {name:'School Admin',v46:null,v47:['v47/school-admin.html']},
 {name:'Teacher assigned class',v46:null,v47:['v47/teacher-assigned-class.html']}
];
const inventory=features.map(f=>{
 const inV46=f.v46===null?null:f.v46.test(v46);
 const routes=f.v47.map(p=>({path:p,exists:existsSync(resolve(root,p)),linked:p==='v47/index.html'||hub.includes('./'+p.replace(/^v47\//,''))}));
 const sourcePresent=routes.every(r=>r.exists&&r.linked);
 const prototype=f.production?f.production.test(f.name==='Dashboard'?hub:routes.filter(r=>r.exists).map(r=>read(r.path)).join('\n')):false;
 return {feature:f.name,v46Evidence:inV46,v47Routes:routes,sourcePresent,prototypeWarning:prototype,parityVerified:false};
});
const report={kind:'v46-to-v47-source-inventory',note:'Route existence is not functional parity. No production readiness is asserted.',features:inventory,missingRoutes:inventory.filter(x=>!x.sourcePresent).map(x=>x.feature),prototypeWarnings:inventory.filter(x=>x.prototypeWarning).map(x=>x.feature),functionalParityVerified:false};
if(process.argv.includes('--json'))console.log(JSON.stringify(report,null,2));
else {
 console.log('V46 → V47 source inventory (not functional parity)');
 for(const item of inventory)console.log((item.sourcePresent?'ROUTE FOUND':'ROUTE MISSING')+' | '+item.feature+(item.prototypeWarning?' | DEVELOPMENT ONLY':''));
 console.log('Missing routes: '+(report.missingRoutes.join(', ')||'none'));
 console.log('Functional parity verified: NO');
}
if(process.argv.includes('--require-parity')){
 console.error('Full V46/V47 parity cannot be established by source inspection; independent verification required.');
 process.exitCode=1;
}
