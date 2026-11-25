// Real browser rendering using only synthetic review papers and a local server.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {resolve,basename,join} from 'node:path';
import {createServer} from 'node:http';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright-core';
const review=process.env.SMSS_REVIEW_PACK_DIR,out=process.env.SMSS_LAYOUT_OUT;
assert.ok(review&&out&&process.env.CHROME_BIN);
await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{
 try{
  const path=new URL(req.url,'http://localhost').pathname;
  let file,mime;
  if(/^\/cdc-[a-z0-9-]+\.mjs$/.test(path)){file=resolve('.'+path);mime='text/javascript';}
  else if(/^\/papers\/[a-z0-9-]+\.html$/.test(path)){file=join(review,'papers',basename(path));mime='text/html';}
  else if(path==='/test'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><html><body></body></html>');return;}
  else{res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',mime+'; charset=utf-8');res.end(await readFile(file));
 }catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;
let browser;
try{
 browser=await chromium.launch({executablePath:process.env.CHROME_BIN,headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1200,height:850}});
 await page.route('**/*',route=>/^(blob:|data:)/.test(route.request().url())||route.request().url().startsWith(base+'/')?route.continue():route.abort());
 const names=(await readdir(join(review,'papers'))).filter(n=>n.endsWith('.html')).sort();
 assert.equal(names.length,32);
 for(const name of names){
  await page.goto(base+'/papers/'+name);
  await page.emulateMedia({media:'print'});
  await page.evaluate(()=>document.fonts.ready);
  const layout=await page.evaluate(()=>{
   const body=document.querySelector('.review-paper-body');
   return {columns:getComputedStyle(body).columnCount,figureCount:body.querySelectorAll('svg').length,empty:!body.innerText.trim()};
  });
  assert.equal(layout.columns,'2',name);
  assert.equal(layout.empty,false,name);
  const path=join(out,name.replace(/\.html$/,'.pdf'));
  await page.pdf({path,preferCSSPageSize:true,printBackground:true});
  const info=execFileSync('pdfinfo',[path],{encoding:'utf8'});
  const dim=/Page size:\s+([\d.]+)\s+x\s+([\d.]+)\s+pts/.exec(info);
  assert.ok(dim,name);
  assert.ok(Math.abs(Number(dim[1])-841.89)<3&&Math.abs(Number(dim[2])-595.28)<3,name+' must be landscape A4');
  assert.ok(Number(/Pages:\s+(\d+)/.exec(info)[1])>=1);
  const pdftext=execFileSync('pdftotext',[path,'-'],{encoding:'utf8'});
  assert.ok(pdftext.includes('REVIEW ONLY'),name+' review watermark');
  console.log('PDF PASS',name,dim[1],dim[2],layout.figureCount);
  // Export the entire review document, not just an isolated image fixture.
  const docx=await page.evaluate(async()=>{
   const m=await import('/cdc-optional-math-render.mjs');
   const area=document.createElement('section');
   const header=document.createElement('div');
   header.textContent=document.querySelector('h1').textContent+'\nREVIEW ONLY — NOT FOR EXAM / सन्दर्भ अभ्यास मात्र';
   area.append(header);
   const body=document.querySelector('.review-paper-body').cloneNode(true);
   body.classList.add('qp-paper-body');area.append(body);
   const figurePngs=await m.rasterizePaperFigures(area);
   return Array.from(m.buildQuestionPaperDocx(area,{figurePngs}));
  });
  const docxPath=join(out,name.replace(/\.html$/,'.docx'));
  await writeFile(docxPath,Uint8Array.from(docx));
  const verifyFull=[
   'import zipfile,sys,xml.etree.ElementTree as ET',
   'with zipfile.ZipFile(sys.argv[1]) as z:',
   ' assert z.testzip() is None',
   ' for n in z.namelist():',
   '  if n.endswith((".xml",".rels")): ET.fromstring(z.read(n))',
   ' x=z.read("word/document.xml").decode()',
   ' assert "REVIEW ONLY" in x and "NOT FOR EXAM" in x',
   ' assert "w:orient=\\"landscape\\"" in x and "w:cols w:num=\\"2\\"" in x',
   ' assert len([n for n in z.namelist() if n.startswith("word/media/")])==int(sys.argv[2])',
   ' assert x.count("<w:drawing>")==int(sys.argv[2])'
  ].join('\n');
  execFileSync('python3',['-c',verifyFull,docxPath,String(layout.figureCount)]);
  console.log('DOCX PASS',name,layout.figureCount);
 }
 await page.goto(base+'/test');
 const result=await page.evaluate(async()=>{
  const m=await import('/cdc-optional-math-render.mjs');
  const area=document.createElement('section');
  area.innerHTML='<div><h2>SMSS परीक्षण</h2></div><div class="qp-paper-body"><p>Question one / पहिलो प्रश्न</p>'+m.questionFigure({contextEn:'A circular pond has radius 14 m. Use π = 22/7.'},'both')+'<p>Question two / दोस्रो प्रश्न</p></div>';
  document.body.append(area);
  const figures=await m.rasterizePaperFigures(area);
  if(figures.size!==1)throw Error('Browser failed to rasterize one real question figure');
  const file=m.buildQuestionPaperDocx(area,{figurePngs:figures});
  return {docx:Array.from(file),png:Array.from([...figures.values()][0])};
 });
 await writeFile(join(out,'synthetic-figure-test.docx'),Uint8Array.from(result.docx));
 await writeFile(join(out,'synthetic-figure-test.png'),Uint8Array.from(result.png));
 const verify=[
  'import zipfile,sys,xml.etree.ElementTree as ET',
  'with zipfile.ZipFile(sys.argv[1]) as z:',
  ' assert z.testzip() is None',
  ' for n in z.namelist():',
  '  if n.endswith((".xml",".rels")): ET.fromstring(z.read(n))',
  ' x=z.read("word/document.xml").decode()',
  ' assert "w:orient=\\"landscape\\"" in x and "w:cols w:num=\\"2\\"" in x',
  ' assert x.index("Question one")<x.index("<w:drawing>")<x.index("Question two")',
  ' assert z.read("word/media/figure1.png")==open(sys.argv[2],"rb").read()',
  ' print("Actual browser PNG and DOCX ZIP/OOXML integrity PASS")'
 ].join('\n');
 execFileSync('python3',['-c',verify,join(out,'synthetic-figure-test.docx'),join(out,'synthetic-figure-test.png')],{stdio:'inherit'});
 console.log('PASS all 32 actual landscape PDFs, 32 full editable review DOCX files and browser-generated embedded Word image');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
