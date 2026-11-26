// Synthetic-only Chromium print regression. No Firebase or live student data.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {iemisEntrySchema} from '../iemis-entry.js';
import {createIemisGradeSheetPrinter,combineTerminalGradeSheets} from '../iemis-grade-sheet-print-preview.mjs';
const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext({viewport:{width:1200,height:1000},offline:true});
 const page=await context.newPage();
 const subjects=['Nepali','English','Mathematics','Science and Technology','Social Studies','Health and Physical Education','Computer','Local Subject'].map((name,i)=>({id:'sub'+i,name,creditHour:4}));
 const students=[{id:'s1',nameEnglish:'Synthetic Student Alpha',studentIemisNo:'0000001',symbolNo:'TEST-001',dob:'2070-01-01'},{id:'s2',nameEnglish:'Synthetic Student Beta',studentIemisNo:'0000002',symbolNo:'TEST-002',dob:'2070-02-01'}];
 for(const classNo of ['1','6','9','10'])for(const [term,v46term] of [['1st','first'],['2nd','second'],['3rd','third'],['final','annual']]){
  const draftsBySubject=Object.fromEntries(subjects.map(s=>{
   const schema=iemisEntrySchema(classNo,v46term,s.name);
   const values=Object.fromEntries(schema.filter(f=>!f.readonly).map(f=>[f.key,f.key==='count'?'10':f.key==='obtained'?'35':String(f.max)]));
   return [s.id,Object.fromEntries(students.map(st=>[st.id,{values:{...values},isAbsent:false,incompatible:false}]))];
  }));
  const printer=createIemisGradeSheetPrinter({school:{nameEnglish:'Synthetic Secondary School',nameNepali:'नमुना माध्यमिक विद्यालय',addressEnglish:'Municipality, Nepal',addressNepali:'नगरपालिका, नेपाल'},classNo,term,students,subjects,draftsBySubject});
  const final=term==='final';
  const result=final?printer('s1'):combineTerminalGradeSheets(printer,['s1','s2'],term);
  assert.equal(result.ready,true,'Ready '+classNo+' '+term);
  await page.setContent(result.html);
  await page.emulateMedia({media:'print'});
  await page.evaluate(()=>document.fonts.ready);
  const cards=await page.locator('.sheet').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect(),style=getComputedStyle(n);return {width:r.width,height:r.height,border:style.borderTopColor,inner:getComputedStyle(n,'::after').borderTopColor,scroll:n.scrollWidth,client:n.clientWidth,text:n.textContent,x:r.x,y:r.y}}));
  assert.equal(cards.length,final?1:2);
  const mm=96/25.4;
  for(const c of cards){
   assert.ok(Math.abs(c.width-(final?190:136)*mm)<2,'Card width');
   assert.ok(c.height<=(final?277:198)*mm+1,'Card height fits print page '+classNo+' '+term+' '+c.height/mm);
   assert.equal(c.border,'rgb(16, 0, 204)');assert.equal(c.inner,c.border);
   assert.ok(c.scroll<=c.client+1,'No horizontal overflow');
   assert.match(c.text,/NOT VALID FOR OFFICIAL USE/);
  }
  if(!final){assert.ok(cards[1].x>cards[0].x+cards[0].width);assert.ok(Math.abs(cards[1].y-cards[0].y)<1);assert.match(cards[1].text,/Synthetic Student Beta/)}
  const pdf=await page.pdf({preferCSSPageSize:true,printBackground:true});
  const body=pdf.toString('latin1');
  assert.equal((body.match(/\/Type\s*\/Page\b/g)||[]).length,1,'Exactly one physical PDF page: '+classNo+' '+term);
  console.log('PASS printed single page: class '+classNo+' '+term+' '+(final?'A4 portrait':'A4 landscape pair'));
 }
 await context.close();
}finally{await browser.close()}
