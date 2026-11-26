import {EXAM_TERMS} from './term-catalog.mjs';
import {validateSchoolId} from './school-paths.mjs';
const terms={first:'1st',second:'2nd',third:'3rd',annual:'final',weekly:'weekly',monthly:'monthly','1st':'1st','2nd':'2nd','3rd':'3rd',final:'final'};
const label=t=>({weekly:'Weekly',monthly:'Monthly','1st':'First Term','2nd':'Second Term','3rd':'Third Term',final:'Final Term'}[t]||'Other');
export function partitionSchoolExams(schoolId,docs){
 validateSchoolId(schoolId);
 if(!Array.isArray(docs)||docs.length>5000)throw Error('Invalid exam inventory');
 const configured=[],history=[],ids=new Set();
 for(const doc of docs){
  const id=doc.id,d=doc.data();
  if(typeof id!=='string'||!id||id.includes('/')||ids.has(id)||!d||d.schoolId!==schoolId)throw Error('Invalid or foreign exam');
  ids.add(id);
  if(EXAM_TERMS.includes(id)){
   if(d.term!==id||Object.keys(d).some(k=>!['schoolId','term'].includes(k)))throw Error('Invalid configured exam');
   configured.push({id,label:label(id)});continue;
  }
  const term=Object.hasOwn(terms,d.termKey)?terms[d.termKey]:null;
  if(d.term!==undefined&&d.term!==term)throw Error('Conflicting historical exam term');
  if(typeof d.className!=='string'||!d.className.trim()||!['string','number'].includes(typeof d.academicYear))throw Error('Invalid historical exam');
  history.push({id,year:String(d.academicYear),className:d.className,term:term?label(term):String(d.termName||d.termKey||'Other'),name:String(d.examName||''),start:String(d.startDate||''),end:String(d.endDate||'')});
 }
 configured.sort((a,b)=>EXAM_TERMS.indexOf(a.id)-EXAM_TERMS.indexOf(b.id));
 history.sort((a,b)=>b.year.localeCompare(a.year)||a.className.localeCompare(b.className,'en',{numeric:true})||a.start.localeCompare(b.start)||a.id.localeCompare(b.id));
 return {configured,history};
}
