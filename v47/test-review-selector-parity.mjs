import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const expectedClasses=['ECD','LKG','UKG',...Array.from({length:12},(_,i)=>String(i+1))];
const expectedTerms=['weekly','monthly','1st','2nd','3rd','final'];
for(const filename of ['marks-entry.html','marks-preview.html','ledger-exceptions.html']){
 const html=readFileSync(new URL(filename,import.meta.url),'utf8');
 const classOptions=html.match(/<select id="schoolClass">([\\s\\S]*?)<\\/select>/)?.[1]??'';
 const termOptions=html.match(/<select id="term">([\\s\\S]*?)<\\/select>/)?.[1]??'';
 const classes=[...classOptions.matchAll(/<option(?: value="[^"]+")?>([^<]+)<\\/option>/g)].map(m=>m[1]);
 const terms=[...termOptions.matchAll(/<option value="([^"]+)">/g)].map(m=>m[1]);
 assert.deepEqual(classes,expectedClasses,filename+' class list must match V47 catalog');
 assert.deepEqual(terms,expectedTerms,filename+' terms must match V47 exam terms');
 assert.match(html,/development|NOT a CDC|NOT verified/i,filename+' must remain clearly non-official');
}
console.log('V47 raw review selectors and non-official warnings passed');
