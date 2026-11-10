import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync('index.html','utf8');
const marker='<!-- Display-only English labels for dropdown options; preserve option values and saved records. -->';
assert.equal(html.split(marker).length,2,'Dropdown translation script must exist exactly once');
const script=html.split(marker)[1].match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script,'Dropdown translation script must be standalone');

class Option {
 constructor(value,label){this.nodeType=1;this.value=value;this.textContent=label;}
 matches(selector){return selector==='option';}
 querySelectorAll(){return [];}
}
const options=[
 new Option('कक्षा १','कक्षा १'),
 new Option('कक्षा १०','कक्षा १०'),
 new Option('वार्षिक','वार्षिक'),
 new Option('प्रथम त्रैमासिक','प्रथम त्रैमासिक'),
 new Option('द्वितीय त्रैमासिक','द्वितीय त्रैमासिक'),
 new Option('विषयगत','विषयगत'),
 new Option('','विषय छान्नुहोस्')
];
const body={nodeType:1,matches:()=>false,querySelectorAll:selector=>selector==='select option'?options:[],};
let callback;
class MutationObserver {constructor(fn){callback=fn;}observe(){}}
vm.runInNewContext(script,{document:{body},MutationObserver},{timeout:1000});
assert.deepEqual(options.map(o=>o.textContent),['Class 1','Class 10','Annual','First Term','Second Term','Subject-wise','Select Subject']);
assert.deepEqual(options.map(o=>o.value),['कक्षा १','कक्षा १०','वार्षिक','प्रथम त्रैमासिक','द्वितीय त्रैमासिक','विषयगत','']);
const dynamic=new Option('तृतीय त्रैमासिक','तृतीय त्रैमासिक');
callback([{type:'childList',target:body,addedNodes:[dynamic]}]);
assert.equal(dynamic.textContent,'Third Term');
assert.equal(dynamic.value,'तृतीय त्रैमासिक');
callback([{type:'childList',target:body,addedNodes:[dynamic]}]);
assert.equal(dynamic.textContent,'Third Term','Translation must be idempotent');
console.log('Dropdown English display, dynamic options, idempotence and preserved stored values passed.');
