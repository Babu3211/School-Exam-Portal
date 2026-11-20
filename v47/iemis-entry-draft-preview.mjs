// Read-only projection of V46 iemisEntryDraft, without DOM or database access.
import {previewIemisComponentKey} from './iemis-component-key-preview.mjs';
export function previewIemisEntryDraft(record,schema){
 const values=Object.fromEntries(schema.filter(c=>!c.readonly).map(c=>[c.key,'']));
 let incompatible=false;
 for(const score of record?.scores||[]){
  const key=previewIemisComponentKey(score.name),component=schema.find(c=>c.key===key);
  if(!key||!component){incompatible=true;continue;}
  if(schema[0].key!=='count'&&Number(score.fullMarks)!==component.max)incompatible=true;
  if(key!=='full')values[key]=key==='count'&&record?.isAbsent?String(score.fullMarks):score.obtained===null||score.obtained===undefined?'':String(score.obtained);
 }
 return {values,isAbsent:record?.isAbsent===true,dirty:false,incompatible};
}
