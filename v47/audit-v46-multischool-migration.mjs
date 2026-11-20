// Fail-closed migration audit: never deploy a copied V46 page against V47 by only changing Firebase config.
import {readFileSync} from 'node:fs';
const root=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const checks={
 'legacy V46 Firebase project':root.includes('exam-portal-smss-95016'),
 'single-school ADMIN_UID':/const ADMIN_UID\s*=/.test(root),
 'unscoped Firestore collection calls':/collection\(db\s*,\s*['"][a-z_]+['"]\)/.test(root),
 'unscoped Firestore document calls':/doc\(db\s*,\s*['"][a-z_]+['"]/.test(root)
};
const counts={collectionCalls:root.split('collection(db,').length-1,documentCalls:root.split('doc(db,').length-1,adminUidReferences:root.split('ADMIN_UID').length-1};
for(const [name,detected] of Object.entries(checks))console.log((detected?'MIGRATION REQUIRED: ':'NOT DETECTED: ')+name);
console.log('V46 source migration inventory:',JSON.stringify(counts));
if(Object.values(checks).some(Boolean)){
 console.error('BLOCKED: V46 cannot safely be switched to V47 Firebase without tenant-scoped reads/writes and role migration.');
 process.exitCode=1;
}
