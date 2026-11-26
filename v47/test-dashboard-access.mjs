import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {schoolDashboardAccess} from './dashboard-access.mjs';
for(const role of ['school_admin','teacher','viewer'])assert.equal(schoolDashboardAccess(role,'module'),true);
assert.equal(schoolDashboardAccess('school_admin','school-admin'),true);
for(const role of ['teacher','viewer',null,'super_admin',''])assert.equal(schoolDashboardAccess(role,'school-admin'),false);
assert.equal(schoolDashboardAccess(undefined,'module'),false);
const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
const js=readFileSync(new URL('./dashboard-console.mjs',import.meta.url),'utf8');
assert.match(html,/data-school-module data-required-role="school_admin"/);
assert.match(js,/import \{schoolDashboardAccess\} from '\.\/dashboard-access\.mjs'/);
assert.match(js,/verifiedSchoolLabel\(/);
assert.match(js,/school_settings\/profile/);
assert.match(js,/Cross-school profile rejected/);
assert.match(js,/const allowed=!!verified&&schoolDashboardAccess/);
assert.match(js,/if\(!schoolDashboardAccess\(verified\.role/);
assert.match(js,/if\(!schoolDashboardAccess\(session\.role/);
assert.match(js,/verifySchoolSession\(\{schoolId:current\.schoolId,uid:current\.uid,readDocument\}\)/);
// The V46-style sidebar and quick menu reuse the SAME gated module anchors
// as the existing dashboard. A decorative href alone is not access control.
assert.match(html,/class="portal-sidebar"/);
assert.match(html,/aria-label="Quick Menu"/);
for(const name of ['Student Record','Manage Exam','Teacher | Staff','Reports','Settings','Grade Ledger (Preview)','Grade Sheet (Preview)'])
 assert.ok(html.includes(name),'Dashboard navigation missing: '+name);
for(const route of ['students.html','attendance.html','staff.html','exams.html','marks-entry.html','grade-ledger.html','grade-sheet.html','school-settings.html']){
 const matches=[...html.matchAll(new RegExp('<a([^>]*?)href="\\./'+route.replace('.','\\.')+'"','g'))];
 assert.ok(matches.length>=2,'Sidebar and Quick Menu must share route '+route);
 assert.ok(matches.every(m=>m[1].includes('data-school-module')),'School module missing verification gate: '+route);
}
assert.ok(html.includes('data-required-role="school_admin"'),'Admin-only module must be explicit');
assert.ok(html.includes('Marks Entry (Preview)')&&html.includes('Grade Sheet (Preview)'),'Draft results must not appear officially published');
console.log('V47 School Admin navigation is role-gated and reverified; other modules remain visible');

const deferred=[...html.matchAll(/<a\b[^>]*\bhref="\.\/(?:primary-assessment|question-paper)\.html"[^>]*>/g)];
const assessmentPreview=deferred.filter(([tag])=>tag.includes('data-assessment-preview'));
assert.equal(assessmentPreview.length,1);
assert.match(assessmentPreview[0][0],/data-required-role="school_admin"/);
assert.match(assessmentPreview[0][0],/data-school-module/);
const hiddenDeferred=deferred.filter(([tag])=>!tag.includes('data-assessment-preview'));
assert.equal(hiddenDeferred.length,3,'Keep experimental routes intact for post-release work');
for(const [tag] of hiddenDeferred){
 assert.match(tag,/\bhidden\b/);assert.match(tag,/\bdata-post-release\b/);
 assert.match(tag,/aria-disabled="true"/);assert.match(tag,/tabindex="-1"/);
}
assert.match(js,/&&!link\.hasAttribute\('data-post-release'\)/);
assert.match(js,/if\(link\.hasAttribute\('data-post-release'\)\)return;/);
console.log('PASS first-release scope: new assessment and question-paper references retained but not offered in normal exam navigation');
