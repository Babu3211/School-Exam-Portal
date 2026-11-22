import assert from 'node:assert/strict';
import {validateComputerComponentEntry,computerComponentEntryId} from '../v47/computer-component-validation.mjs';
import {createComputerComponentMark} from '../v47/computer-component-create-service.mjs';
// Historical Computer schema is a reference only; it cannot save official marks.
const input={studentId:'s1',subjectId:'computer_9',class:'9',term:'final',scores:{component_a:4,component_b:36,component_c:10}};
assert.equal(computerComponentEntryId(input),'final:s1:computer_9');
for(const invalid of [{...input,class:'8'},{...input,scores:{...input.scores,component_b:37}},{...input,scores:{...input.scores,component_a:-1}},{...input,scores:{component_a:4,component_b:36}},{...input,scores:{...input.scores,extra:1}},{...input,term:'midterm'}])assert.throws(()=>validateComputerComponentEntry(invalid));
let transactions=0;
const api={runTransaction:async()=>{transactions++;throw new Error('Unsafe legacy write invoked')}};
for(const actor of [{uid:'admin-a',role:'school_admin',active:true,schoolId:'12345678'},{uid:'teacher-a',role:'teacher',active:true,schoolId:'12345678'},{uid:'viewer-a',role:'viewer',active:true,schoolId:'12345678'}]){
 await assert.rejects(()=>createComputerComponentMark({db:{},api,actor,schoolId:'12345678',input}),/saving is disabled/);
}
assert.equal(transactions,0,'No fixed-schema Computer marks write or transaction may occur');
console.log('V47 legacy fixed Computer writer is safely retired; configured class publication is required');
