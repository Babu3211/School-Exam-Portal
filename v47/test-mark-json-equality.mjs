import assert from 'node:assert/strict';
import {sameMarkJson} from './mark-json-equality.mjs';
assert.equal(sameMarkJson({b:[{v:2,k:'x'}],a:1},{a:1,b:[{k:'x',v:2}]}),true);
for(const [a,b] of [[{a:1},{a:'1'}],[{a:1},{a:1,b:0}],[[1,2],[2,1]],[{x:NaN},{x:NaN}],[{x:undefined},{x:undefined}],[new Date(),new Date()],[{a:0},{a:false}],[{a:null},{}]])assert.equal(sameMarkJson(a,b),false);
assert.equal(sameMarkJson(new Array(1),[1]),false);
assert.equal(sameMarkJson(new Array(1),new Array(1)),false);
console.log('PASS strict marks JSON equality: reorder maps only, preserve all values and array order');
