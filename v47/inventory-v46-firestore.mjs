// Inventory all V46 Firestore call sites before porting them to a multi-school backend.
// Run: node v47/inventory-v46-firestore.mjs
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const pattern=/\b(collection|doc)\(\s*db\s*,\s*(['"`])([^'"`]+)\2/g;
const byCollection=new Map();
for(const match of source.matchAll(pattern)){
 const name=match[3],kind=match[1],line=source.slice(0,match.index).split('\n').length;
 const item=byCollection.get(name)??{collection:0,doc:0,lines:[]};
 item[kind]++;item.lines.push(line);byCollection.set(name,item);
}
const critical=['students','staff','classes','subjects','marks','mark_settings','exams','attendance','user_roles','school_settings','school_public_branding','school_gallery','audit_logs','public_results','public_result_lookup','public_result_exams','certificates'];
for(const name of critical)if(!byCollection.has(name))throw new Error('V46 collection disappeared; review before continuing: '+name);
for(const [name,item] of [...byCollection].sort((a,b)=>a[0].localeCompare(b[0])))console.log(name+': '+item.collection+' collection refs, '+item.doc+' document refs; source lines '+item.lines.join(','));
const total=[...byCollection.values()].reduce((n,item)=>n+item.collection+item.doc,0);
console.log('Total literal V46 Firestore references:',total);
console.log('Dynamic paths and nested calls must also be reviewed manually; this inventory does not certify tenant isolation.');
