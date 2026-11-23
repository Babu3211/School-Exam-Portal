import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {planClassMarksGridPaste as plan} from './class-marks-grid-paste.mjs';
const componentSet=[
 {key:'internal',name:'Internal',fullMarks:4},
 {key:'written',name:'Written',fullMarks:36},
 {key:'practical',name:'Practical',fullMarks:10}
];
const rows=Array.from({length:101},(_,i)=>({id:'s'+String(i).padStart(4,'0'),absent:false}));
const base={studentRows:rows,components:componentSet,startRowIndex:0,startComponentIndex:0};
const result=plan({...base,text:'4\t36\t10\n0\t0\t0\r\n3\t35\t9\n'});
assert.equal(result.rows,3);assert.equal(result.cells,9);
assert.equal(result.updates[0].studentId,'s0000');
assert.deepEqual(result.updates.slice(0,3).map(x=>x.componentKey),['internal','written','practical']);
assert.deepEqual(result.updates.slice(0,3).map(x=>x.value),['4','36','10']);
assert.equal(result.previewOnly,true);assert.equal(result.writeAuthorized,false);assert.equal(result.publicationAllowed,false);
assert.ok(Object.isFrozen(result.updates));
assert.equal(plan({...base,startRowIndex:1,startComponentIndex:1,text:'20\t5\n36\t10'}).cells,4);
assert.equal(plan({...base,text:'\t2'}).updates[0].value,'','Empty Excel cells clear local marks only');
assert.equal(plan({...base,text:'.5\t6.0'}).updates[0].value,'.5');
for(const input of ['5','-1','4.1','1e2','=2+2','NaN','Infinity','0,5','🤯']){
 await assert.rejects(Promise.resolve().then(()=>plan({...base,text:input})),/Invalid marks/);
}
for(const input of ['37','-3','=SUM(A1:A2)']){
 assert.throws(()=>plan({...base,startComponentIndex:1,text:input}),/Invalid marks/);
}
assert.throws(()=>plan({...base,text:'4\t36\t11'}),/Invalid marks/);
assert.throws(()=>plan({...base,text:'4\t36\t10\t1'}),/columns/);
assert.throws(()=>plan({...base,startRowIndex:100,text:'4\n4'}),/rows/);
assert.throws(()=>plan({...base,studentRows:[rows[0],rows[0]],text:'1'}),/Duplicate/);
assert.throws(()=>plan({...base,studentRows:[{...rows[0],absent:true}],text:'1'}),/absent/);
assert.throws(()=>plan({...base,components:[componentSet[0],componentSet[0]],text:'1'}),/duplicate/);
assert.throws(()=>plan({...base,startRowIndex:-1,text:'1'}),/starting cell/);
assert.throws(()=>plan({...base,text:'1'.repeat(300001)}),/Clipboard/);
const many=Array.from({length:1500},(_,i)=>({id:'r'+String(i).padStart(4,'0'),absent:false}));
const thousand=plan({studentRows:many,components:componentSet,startRowIndex:0,startComponentIndex:0,text:Array(1500).fill('4\t36\t10').join('\n')});
assert.equal(thousand.cells,4500);assert.equal(thousand.rows,1500);
assert.throws(()=>plan({studentRows:many,components:componentSet,startRowIndex:1,startComponentIndex:0,text:Array(1500).fill('4').join('\n')}),/rows/);
const ui=readFileSync(new URL('./marks-entry-console.mjs',import.meta.url),'utf8');
const html=readFileSync(new URL('./marks-entry.html',import.meta.url),'utf8');
assert.match(ui,/classMarkRows'\)\.addEventListener\('paste'/);
assert.match(ui,/planClassMarksGridPaste\(/);
assert.match(ui,/event\.preventDefault\(\)/);
assert.match(ui,/start\.dispatchEvent\(new Event\('input'/);
assert.match(ui,/actor\?\.role!=='school_admin'/);
assert.match(html,/id="classPasteHint"/);
console.log('PASS V47 local multi-cell marks paste: dynamic 4\/36\/10 settings, complete rejection before edits, 1500 students, admin-only and review invalidation');
