// Read-only IEMIS score preview. This does not save or approve any result.
import {iemisComponentPreview,V46_TERM_MAP} from './iemis-component-preview.mjs';
import {previewIemisEntryValues} from './iemis-entry-values-preview.mjs';
import {previewIemisSummary} from './iemis-summary-preview.mjs';
export function previewIemisEntryResult(classNo,term,subject,draft){
 const klass=String(classNo).trim();
 if(!V46_TERM_MAP[term])throw Error('This term is not verified against V46 IEMIS');
 const schema=iemisComponentPreview(klass,term,subject);
 const record=previewIemisEntryValues(schema,draft);
 if(record===null)return {schema,record:null,summary:null};
 const summary=previewIemisSummary(record,{annual:term==='final',primary:Number(klass)<=5});
 return {schema,record,summary};
}
