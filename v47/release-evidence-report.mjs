import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
const root=dirname(fileURLToPath(import.meta.url));
const read=(name)=>readFileSync(join(root,name),'utf8');
const hub=read('index.html'),marks=read('marks-entry.html'),rules=read('firestore.rules'),hosting=JSON.parse(read('firebase.json'));
const checks=[
 ['V46 dashboard parity',!/development workspace|independent prototypes|Development Hub/i.test(hub),'V47 dashboard explicitly remains a development workspace'],
 ['Official marks save',!/Save\/Publish unavailable|Save\/Publish is disabled|Individual Save disabled/i.test(marks),'Marks page disables official Save/Publish'],
 ['CDC/IEMIS official grading',!/NOT verified CDC\/IEMIS|NOT a CDC\/IEMIS result/i.test(marks),'Marks page disclaims CDC/IEMIS verification'],
 ['Hosting target',hosting.hosting?.public==='dist','V47 Hosting must point at dist'],
 ['School-scoped security rules',/function activeMember\(sid\)/.test(rules)&&/function canRead\(sid\)/.test(rules),'School membership and scoped read helpers must exist']
];
const blocked=checks.filter(([,pass])=>!pass);
const report={project:'SMSS V47',branch:'smss-v47-multischool-work',productionReady:false,checks:checks.map(([name,pass,reason])=>({name,status:pass?'STATIC_CHECK_OK':'BLOCKED',reason:pass?'Static evidence only; not a runtime test':reason})),blockingCount:blocked.length};
console.log(JSON.stringify(report,null,2));
if(blocked.length)process.exitCode=1;
