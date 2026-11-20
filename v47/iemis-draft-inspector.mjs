// V47 read-only IEMIS result validation gate; no Firestore writes.
import {previewIemisEntryResult} from './iemis-entry-result-preview.mjs';
export function inspectIemisDraft(classNo,term,subject,draft){
 try{
  const result=previewIemisEntryResult(classNo,term,subject,draft);
  if(!result.record)return {valid:false,reason:'Marks entry is empty',result:null};
  if(!result.summary?.complete)return {valid:false,reason:'Marks entry is incomplete',result};
  return {valid:true,reason:null,result};
 }catch(error){return {valid:false,reason:error.message,result:null};}
}
