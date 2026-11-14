/**
 * Browser-only V47 workspace view. Explicitly mount into a V47-owned element.
 * No writes, no V46 root collection access, and no automatic production mount.
 */
import {createV47VerifiedSchoolWorkspace} from "./verified-school-workspace.mjs";
export function mountV47SchoolWorkspace({root,document,getIdToken,fetchImpl,bsToAd,adToBs}) {
 if(!root || typeof root.replaceChildren!=="function" || !document?.createElement)
  throw new TypeError("V47 mount element and document required");
 if(typeof bsToAd!=="function" || typeof adToBs!=="function")
  throw new TypeError("Verified BS date converters required");
 const workspace=createV47VerifiedSchoolWorkspace({getIdToken,fetchImpl,bsToAd});
 let renderGeneration=0;
 const element=(tag,text)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=String(text);return el;};
 const status=element("p","Select a school to begin");
 const heading=element("h2","V47 School Workspace");
 const schoolInput=element("select");
 schoolInput.setAttribute("aria-label","Choose authorized school");
 const reloadButton=element("button","Load my schools");
 reloadButton.type="button";
 const selectButton=element("button","Open school");
 selectButton.type="button";
 const clearButton=element("button","Clear school");
 clearButton.type="button";
 const panel=element("section");
 const result=element("pre");
 result.setAttribute("aria-label","Read-only results");
 const classInput=element("input");
 classInput.setAttribute("placeholder","Class");
 classInput.setAttribute("aria-label","Class");
 const subjectInput=element("input");
 subjectInput.setAttribute("placeholder","Subject");
 subjectInput.setAttribute("aria-label","Subject");
 const dateInput=element("input");
 dateInput.setAttribute("placeholder","BS YYYY-MM-DD");
 dateInput.setAttribute("aria-label","Attendance date (BS)");
 const marksButton=element("button","View marks");
 marksButton.type="button";
 const attendanceButton=element("button","View attendance");
 attendanceButton.type="button";
 panel.append(classInput,subjectInput,dateInput,marksButton,attendanceButton,result);
 panel.hidden=true;
 root.replaceChildren(heading,reloadButton,schoolInput,selectButton,clearButton,status,panel);
 const loadSchools=async()=>{
  const current=++renderGeneration;
  panel.hidden=true;
  schoolInput.replaceChildren();
  status.textContent="Loading authorized schools...";
  try {
   const schools=await workspace.loadSchools();
   if(current!==renderGeneration)return;
   for(const school of schools){const option=element("option",school.schoolName);option.value=school.schoolId;schoolInput.append(option);}
   status.textContent=schools.length?"Choose your school":"No active school membership";
  }catch(error){if(current===renderGeneration)showError(error);}
 };
 reloadButton.onclick=loadSchools;
 const showError=error=>{status.textContent=error instanceof Error?error.message:"Request failed";};
 selectButton.onclick=async()=>{
  const current=++renderGeneration;
  panel.hidden=true;
  result.textContent="";
  status.textContent="Loading school...";
  try {
   const school=await workspace.selectSchool(schoolInput.value);
   if(current!==renderGeneration)return;
   status.textContent=school.schoolName+" ("+school.roles.join(", ")+")";
   panel.hidden=false;
  }catch(error){if(current===renderGeneration)showError(error);}
 };
 clearButton.onclick=()=>{
  renderGeneration++;
  workspace.clear();
  panel.hidden=true;
  result.textContent="";
  schoolInput.replaceChildren();
  status.textContent="Load your schools to begin";
 };
 const showRows=async(loader,formatRows=rows=>rows)=>{
  const current=renderGeneration;
  result.textContent="Loading...";
  try {
   const rows=await loader();
   if(current===renderGeneration)result.textContent=JSON.stringify(formatRows(rows),null,2);
  }catch(error){if(current===renderGeneration){result.textContent="";showError(error);}}
 };
 marksButton.onclick=()=>showRows(()=>workspace.readMarks({className:classInput.value.trim(),subject:subjectInput.value.trim()}));
 attendanceButton.onclick=()=>showRows(()=>workspace.readAttendance({className:classInput.value.trim(),date:dateInput.value.trim(),calendar:"BS"}),rows=>rows.map(row=>{
  const {date,...rest}=row;
  if(typeof date!=="string")return row;
  const bsDate=adToBs(date);
  if(typeof bsDate!=="string" || !/^\\d{4}-\\d{2}-\\d{2}$/.test(bsDate))throw new TypeError("BS date display conversion failed");
  return {...rest,date:bsDate};
 }));
 return Object.freeze({clearSession(){
  renderGeneration++;
  workspace.clear();
  panel.hidden=true;
  result.textContent="";
  schoolInput.replaceChildren();
  status.textContent="Load your schools to begin";
 },dispose(){
  renderGeneration++;
  workspace.clear();
  reloadButton.onclick=null;selectButton.onclick=null;clearButton.onclick=null;marksButton.onclick=null;attendanceButton.onclick=null;
  root.replaceChildren();
 }});
}
