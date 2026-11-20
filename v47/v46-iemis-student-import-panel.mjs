// Mountable V47 Students Details > Import Students preview panel.
// The host supplies already-parsed V46/IEMIS Excel rows and the school's IEMIS ID.
// This UI intentionally does not save: Firebase import must be wired and tested
// separately. No unverified client-side write is offered.
import {previewV46IemisStudentImport,filterV46IemisStudentPreview} from './v46-iemis-student-import-preview.mjs';
import {UI_LABELS,NEPALI_MESSAGES} from './smss-ui-language-policy.mjs';
export function mountV47IemisStudentPreview({container,rows,schoolId,existingIemisIds=[],existingAdmissionNumbers=[],cloudChecked=false}){
 if(!container||typeof container.replaceChildren!=='function')throw new TypeError('DOM container required');
 const preview=previewV46IemisStudentImport({rows,schoolId,existingIemisIds,existingAdmissionNumbers});
 const doc=container.ownerDocument;
 const root=doc.createElement('section');root.setAttribute('aria-label','IEMIS Student Import Preview');
 const title=doc.createElement('h3');title.textContent=UI_LABELS.students+' — '+UI_LABELS.preview;root.append(title);
 const summary=doc.createElement('p');summary.textContent=`Total: ${preview.total} | ${cloudChecked?'New':'Potential New'}: ${preview.ready} | Skipped: ${preview.skipped} | School IEMIS: ${schoolId}`;root.append(summary);
 const cloudNotice=doc.createElement('p');cloudNotice.setAttribute('role','status');cloudNotice.lang='ne';cloudNotice.textContent=cloudChecked?'हालको विद्यालयका विद्यार्थी विवरणसँग Duplicate जाँच गरिएको छ।':'सावधानी: हालको विद्यालयका विद्यार्थीको Cloud विवरण जाँचिएको छैन। New संख्या अन्तिम होइन; यो पूर्वावलोकन मात्र हो।';root.append(cloudNotice);
 const guidance=doc.createElement('p');guidance.textContent='यो पूर्वावलोकन मात्र हो। विद्यार्थी आयात गर्नुअघि विद्यालय र विवरण जाँच गर्नुहोस्।';root.append(guidance);
 const controls=doc.createElement('div');
 const input=(label,placeholder)=>{const wrap=doc.createElement('label');wrap.textContent=label+' ';const field=doc.createElement('input');field.placeholder=placeholder;wrap.append(field);controls.append(wrap);return field};
 const classInput=input('Class','Class');const sectionInput=input('Section','Section');const searchInput=input('Search','Name / Student IEMIS ID');
 const statusWrap=doc.createElement('label');statusWrap.textContent='Status ';const statusSelect=doc.createElement('select');for(const [value,label] of [['all','All'],['new','New'],['skip','Skipped']]){const option=doc.createElement('option');option.value=value;option.textContent=label;statusSelect.append(option)}statusWrap.append(statusSelect);controls.append(statusWrap);root.append(controls);
 const table=doc.createElement('table');const thead=doc.createElement('thead');const header=doc.createElement('tr');
 for(const name of ['Excel Row','Student IEMIS ID','Name','Class','Section','Gender','Permanent Address','Status / Reason']){const th=doc.createElement('th');th.textContent=name;header.append(th)}thead.append(header);table.append(thead);
 const body=doc.createElement('tbody');table.append(body);root.append(table);
 const draw=()=>{body.replaceChildren();for(const row of filterV46IemisStudentPreview(preview,{className:classInput.value,section:sectionInput.value,search:searchInput.value,status:statusSelect.value})){const tr=doc.createElement('tr');for(const item of [row.row,row.studentIemisId,row.name,row.class,row.section,row.gender,row.permanentAddress,row.errors.map(error=>error==='School IEMIS mismatch'?NEPALI_MESSAGES.schoolMismatch:error==='Student already exists'?NEPALI_MESSAGES.duplicate:error).join('; ')||(cloudChecked?'New':'Pending Cloud Check')]){const td=doc.createElement('td');td.textContent=String(item);tr.append(td)}body.append(tr)}};
 for(const field of [classInput,sectionInput])field.addEventListener('input',draw);
 searchInput.addEventListener('input',draw);statusSelect.addEventListener('change',draw);
 container.replaceChildren(root);draw();return Object.freeze({preview,refresh:draw});
}
