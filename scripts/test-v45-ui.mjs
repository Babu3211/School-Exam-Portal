import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const html=await readFile('index.html','utf8');
const manifest=JSON.parse(await readFile('manifest.webmanifest','utf8'));
const nav=html.match(/<nav class="nav" id="nav"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
assert.ok(nav,'Sidebar navigation must exist');
const expected=['⚡','🏫','🎓','📝','👩‍🏫','📈','⚙️'];
const icons=[...nav.matchAll(/class="ico"[^>]*>(.*?)<\/span>/g)].map(m=>m[1]);
assert.deepEqual(icons,expected,'V45 must retain V44 sidebar icon order');
for(const title of ['Home','School Profile','Student Record','Manage Exam','Teacher | Staff','Reports','Settings','Marks Entry(1-12)','Mark wise ledger','Grade wise ledger','Grade Sheet']){
 assert.ok(nav.includes(title),'Missing V44 menu label: '+title);
}
assert.ok(html.includes('Exam Management Portal · V45</small>'),'V45 sidebar label missing');
assert.ok(html.includes('#smssInstallBanner{position:relative'),'Install banner must not overlay mobile dashboard');
assert.ok(html.includes('beforeinstallprompt'),'Android browser install event missing');
assert.ok(html.includes('Add to Home Screen'),'iOS install guidance missing');
assert.equal(manifest.display,'standalone');
for(const size of [192,512]){
 const icon=manifest.icons.find(i=>i.sizes===size+'x'+size);
 assert.ok(icon,'Missing '+size+'px manifest icon');
 const bytes=await readFile(icon.src.replace(/^\.\//,''));
 assert.equal(bytes.subarray(1,4).toString(),'PNG','Icon must be PNG');
 assert.equal(bytes.readUInt32BE(16),size,'Incorrect PNG width');
 assert.equal(bytes.readUInt32BE(20),size,'Incorrect PNG height');
}
const apple=await readFile('apple-touch-icon.png');
assert.equal(apple.subarray(1,4).toString(),'PNG','Apple touch icon must be PNG');
console.log('V45 menu, install banner, manifest and icon structure checks passed');
