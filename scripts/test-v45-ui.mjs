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
assert.ok(html.includes('Exam Management Portal · V46</small>'),'V46 sidebar label missing');
assert.ok(html.includes('#smssInstallBanner{position:relative'),'Install banner must not overlay mobile dashboard');
assert.ok(html.includes("banner.hidden=!isIOS()||standalone()"),'Install guidance must only appear on iOS browsers outside standalone mode');
assert.ok(html.includes("navigator.standalone===true"),'Installed iOS app must hide install guidance');
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
console.log('V46 menu, install banner, manifest and icon structure checks passed');

const viewerGuard=html.match(/function viewerReadOnlyGuard\(event\)\{([\s\S]*?)\n\}\ndocument\.addEventListener\("click",viewerReadOnlyGuard,true\)/)?.[1];
assert.ok(viewerGuard,'Viewer read-only guard must remain active');
assert.ok(viewerGuard.includes('event.preventDefault()')&&viewerGuard.includes('event.stopImmediatePropagation()'),'Viewer mutation actions must be intercepted');
assert.ok(viewerGuard.includes('action.id==="logoutBtn"'),'Viewer logout must remain accessible');
assert.ok(!viewerGuard.includes('if(assignedSubjectTask||assignedClassTask)return'),'Mixed Viewer and Teacher role must not bypass read-only guard');
assert.ok(html.includes('window.currentUserIsTeacher=teacher;window.rolePageAllowed=rolePageAllowed;'),'Viewer must not inherit Teacher-only hidden panels');
assert.ok(html.includes('if(roleHas("viewer"))return true;'),'Viewer must retain access to all navigable pages');
console.log('Viewer read-only, logout and full-page navigation static regression checks passed');

for(const formId of ['studentForm','staffForm','certificateForm','schoolSettingsForm','userCreateForm','subjectCatalogForm','classForm','examForm']){
 assert.ok(html.includes("'"+formId+"'"),'Viewer hidden-form list missing '+formId);
}
assert.ok(html.includes("v.querySelectorAll('form').forEach(form=>"),'Viewer form protection missing');
assert.ok(html.includes('v.querySelectorAll(\'input[type="file"]\')'),'Viewer file input protection missing');
console.log('Viewer create/edit forms and file upload restrictions verified');
