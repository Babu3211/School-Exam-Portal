// V47 read-only IEMIS result validation gate; no Firestore writes.
import {previewIemisEntryResult} from './iemis-entry-result-preview.mjs';
export function inspectIemisDraft(classNo,term,subject,draft,{allowAbsent=false}={}){
 try{
  const result=previewIemisEntryResult(classNo,term,subject,draft);
  if(!result.record)return {valid:false,reason:'Marks entry is empty',result:null};
  if(allowAbsent&&draft?.isAbsent===true&&result.summary?.absent===true){
   const primary=Number(classNo)<=5;
   const count=String(draft.values?.count??'').trim();
   const entries=Object.entries(draft.values??{});
   if(entries.some(([key,v])=>!(primary&&key==='count')&&v!==null&&v!==undefined&&String(v).trim()!=='')||
      primary&&(!count||!Number.isSafeInteger(Number(count))||Number(count)<1||Number(count)>5000))
     return {valid:false,reason:'Explicit absence metadata invalid',result};
   return {valid:true,reason:null,result};
  }
  if(!result.summary?.complete)return {valid:false,reason:'Marks entry is incomplete',result};
  return {valid:true,reason:null,result};
 }catch(error){return {valid:false,reason:error.message,result:null};}
}
