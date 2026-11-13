import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const rules=readFileSync(new URL('../firestore.rules',import.meta.url),'utf8');
for(const name of ['loadClasses','loadExams']){
 const start=html.indexOf('async function '+name+'(){');
 const end=html.indexOf('\n}',start);
 assert.ok(start>=0&&end>start,name+' must exist');
 const fn=html.slice(start,end);
 assert.match(fn,/isAdmin\(\)\|\|roleHas\("viewer"\)/,name+' must permit viewer reads');
 assert.doesNotMatch(fn,/uid!==ADMIN_UID/,name+' must not deny viewers');
}
const catalog=html.slice(html.indexOf('function renderSubjectCatalog(){'),html.indexOf('\nasync function editSubjectCatalog(',html.indexOf('function renderSubjectCatalog(){')));
assert.match(catalog,/roleHas\("viewer"\)\&\&!isAdmin\(\)\?"":archived/,'Viewer must not see subject edit/archive controls');
const classes=html.slice(html.indexOf('function renderClasses(){'),html.indexOf('\nwindow.loadClasses=',html.indexOf('function renderClasses(){')));
assert.match(classes,/roleHas\("viewer"\)\&\&!isAdmin\(\)\?"View only"/,'Viewer must not see class edit/delete controls');
const exams=html.slice(html.indexOf('function renderExams(){'),html.indexOf('\nwindow.loadExams=',html.indexOf('function renderExams(){')));
assert.match(exams,/roleHas\("viewer"\)\&\&!isAdmin\(\)\?"View only"/,'Viewer must not see exam edit/delete controls');
for(const collection of ['classes','subjects','exams']){
 const start=rules.indexOf('match /'+collection+'/{documentId}');
 const end=rules.indexOf('\n    }',start);
 assert.ok(start>=0&&end>start,'Firestore rule must exist for '+collection);
 assert.match(rules.slice(start,end),/allow create, update, delete: if isAdmin\(\)/,'Viewer writes must remain denied for '+collection);
}
console.log('V46 Viewer read-only classes, subjects and exams regression passed.');
