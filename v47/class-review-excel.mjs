import {excelWorkbook} from './excel-workbook.mjs';

// Validate complete read-only marks reviews and export a genuine Excel workbook.
// No CSV conversion or CSV user workflow is involved.
export function buildClassReviewExcel({json,studentNames={}}){
 if(typeof json!=='string'||new TextEncoder().encode(json).length>900000)throw new Error('Review JSON exceeds safe size');
 const review=JSON.parse(json);
 if(review?.format!=='smss-v47-class-mark-review-v1'||review.writeAuthorized!==false||review.publicationAllowed!==false||
 !Array.isArray(review.entries)||review.entries.length<1||review.entries.length>1500||
 !Array.isArray(review.componentLimits)||review.componentLimits.length<1||review.componentLimits.length>50||
 review.rosterCount!==review.entries.length)throw new Error('Complete read-only review required');
 const limits=new Map();
 for(const c of review.componentLimits){
  if(!c||typeof c.key!=='string'||!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(c.key)||
   typeof c.name!=='string'||!c.name.trim()||typeof c.fullMarks!=='number'||!Number.isFinite(c.fullMarks)||c.fullMarks<=0||
   limits.has(c.key))throw new Error('Invalid Examination Settings component');
  limits.set(c.key,c.fullMarks);
 }
 const columns=['Student ID','Student Name','Absent',...review.componentLimits.map(c=>c.name+' (max '+c.fullMarks+')'),'Total Obtained'];
 const seen=new Set(),rows=[];
 for(const row of review.entries){
  if(!row||typeof row.studentId!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(row.studentId)||seen.has(row.studentId)||
   typeof row.isAbsent!=='boolean')throw new Error('Invalid or duplicate review student');
  seen.add(row.studentId);
  if(row.isAbsent){
   if(row.values!==null||row.totalObtained!==0)throw new Error('Invalid absent student marks');
  }else{
   if(!row.values||typeof row.values!=='object'||Array.isArray(row.values)||
    Object.keys(row.values).length!==limits.size||typeof row.totalObtained!=='number'||!Number.isFinite(row.totalObtained))throw new Error('Invalid review marks');
   let sum=0;
   for(const [key,max] of limits){
    const value=row.values[key];
    if(!Object.hasOwn(row.values,key)||typeof value!=='number'||!Number.isFinite(value)||value<0||value>max)throw new Error('Review marks exceed configured limits');
    sum+=value;
   }
   if(Math.abs(sum-row.totalObtained)>1e-7)throw new Error('Review marks total mismatch');
  }
  rows.push([row.studentId,Object.hasOwn(studentNames,row.studentId)?String(studentNames[row.studentId]):'',
   row.isAbsent?'Yes':'No',...review.componentLimits.map(c=>row.isAbsent?'':row.values[c.key]),row.totalObtained]);
 }
 return excelWorkbook(columns,rows,{sheetName:'Class Marks Review'});
}
