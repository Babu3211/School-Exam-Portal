import assert from 'node:assert/strict';
import {iemisComponentPreview,V47_IEMIS_TERMS,V46_TERM_MAP} from './iemis-component-preview.mjs';
assert.deepEqual(V47_IEMIS_TERMS,['weekly','monthly','1st','2nd','3rd','final']);
for(let c=1;c<=5;c++)assert.deepEqual(iemisComponentPreview(String(c),'1st').map(x=>x.key),['count','full','obtained']);
for(let c=6;c<=8;c++)assert.deepEqual(iemisComponentPreview(String(c),'2nd').map(x=>x.max),[4,36,10]);
for(let c=9;c<=10;c++){assert.deepEqual(iemisComponentPreview(String(c),'3rd','Computer Science').map(x=>x.max),[4,36,10]);assert.deepEqual(iemisComponentPreview(String(c),'final','English').map(x=>x.max),[3,16,6,75]);assert.deepEqual(iemisComponentPreview(String(c),'final','Computer Science').map(x=>x.max),[4,36,10,50]);}
assert.throws(()=>iemisComponentPreview('11','final','Computer Science'));
assert.throws(()=>iemisComponentPreview('1','invalid'));
assert.deepEqual(V46_TERM_MAP,{'1st':'first','2nd':'second','3rd':'third','final':'annual'});
assert.throws(()=>iemisComponentPreview('6','weekly','English'),/no verified V46/);
assert.throws(()=>iemisComponentPreview('9','monthly','Computer Science'),/no verified V46/);
assert.equal(iemisComponentPreview('6','1st','English')[2].name,'First Term Examination');
assert.equal(iemisComponentPreview('9','3rd','English')[2].name,'Third Term Examination');
assert.equal(iemisComponentPreview('9','final','English')[3].name,'TH (Theory)');
console.log('V47 read-only IEMIS schema preview checks passed');
