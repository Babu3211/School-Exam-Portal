import {readFile,mkdir,writeFile} from 'node:fs/promises';
const source=await readFile('index.html','utf8');
const start=source.indexOf('function showGradeSheet(studentId)');
const end=source.indexOf("document.addEventListener('click',e=>{if(e.target.closest('#loadResultsBtn'))",start);
if(start<0||end<=start)throw new Error('Grade Sheet renderer not found');
const template=await readFile('scripts/fixtures/iemis-layout.html','utf8');
await mkdir('qa',{recursive:true});
await writeFile('qa/iemis-layout.html',template.replace('/* GRADE_SHEET_SOURCE */',source.slice(start,end)));
await writeFile('qa/iemis-entry.html',await readFile('scripts/fixtures/iemis-entry.html','utf8'));
console.log('Generated synthetic IEMIS layout fixture for trial browser QA. No Firebase or IEMIS connection.');

const css=source.match(/<style>([\s\S]*?)<\/style>/)[1];
const appStart=source.indexOf('<div class="app">');
const scriptStart=source.indexOf('<script>',appStart);
const app=source.slice(appStart,scriptStart);
const navScript=source.slice(scriptStart+8,source.indexOf('</script>',scriptStart));
await writeFile('qa/iemis-navigation.html',`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SMSS Navigation — Synthetic Preview</title><style>${css} .app{display:flex!important} #loginGate{display:none!important}.preview-note{padding:10px;background:#fff8e8;color:#533e14;font:14px Arial} </style></head><body><div class="preview-note">Synthetic navigation preview. No Firebase or IEMIS connection. Real application menu and page renderers; records are not loaded or saved.</div>${app}<script>${navScript}</script></body></html>`);
