import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const indexes=JSON.parse(readFileSync(new URL('../v47/firestore.indexes.json',import.meta.url),'utf8')).indexes;
const expected={students:['class','__name__'],subjects:['class','__name__'],subject_assignments:['class','__name__'],marks:['class','term','__name__'],component_marks:['class','term','__name__']};
for(const [name,paths] of Object.entries(expected)){
 const matches=indexes.filter(item=>item.collectionGroup===name&&item.queryScope==='COLLECTION'&&JSON.stringify(item.fields?.map(field=>field.fieldPath))===JSON.stringify(paths));
 assert.equal(matches.length,1,'Missing or duplicated V47 review index: '+name);
 assert.ok(matches[0].fields.every(field=>field.order==='ASCENDING'));
}
console.log('V47 ledger review index configuration checks passed');
