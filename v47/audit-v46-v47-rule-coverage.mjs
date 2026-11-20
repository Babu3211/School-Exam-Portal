// Compare actual V46 collections against explicit V47 Firestore rules.
// A successful path rewrite does not mean V46 screens can read or write V47 data.
// Run: node v47/audit-v46-v47-rule-coverage.mjs (expected nonzero until migrated).
import {readFileSync} from 'node:fs';
import {V46_COLLECTIONS} from './rewrite-v46-firestore-paths.mjs';
const rules=readFileSync(new URL('./firestore.rules',import.meta.url),'utf8');
const required=[...V46_COLLECTIONS];
const absent=required.filter(name=>!rules.includes('match /'+name+'/{'));
for(const name of required)console.log((absent.includes(name)?'MISSING ':'PRESENT ')+name);
const studentBlock=rules.match(/match \/students\/\{id\} \{([\s\S]*?)\n      \}/)?.[1]??'';
const studentRestricted=studentBlock.includes("hasOnly(['name','class','rollNo','schoolId'])");
if(studentRestricted)console.log('INCOMPATIBLE students: V47 write validator accepts only 4 fields; V46 Excel exports 26 columns');
const marksBlocked=/match \/marks\/\{id\} \{[\s\S]*?allow create, update, delete: if false;/.test(rules);
if(marksBlocked)console.log('BLOCKED marks: V47 mark writes are disabled');
if(absent.length||studentRestricted||marksBlocked){
 console.error('V46 -> V47 RULE PARITY BLOCKED: '+absent.length+' collection rules missing; student schema and marks writes require audited migration.');
 process.exitCode=1;
}
