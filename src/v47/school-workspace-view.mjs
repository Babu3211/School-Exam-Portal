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
 let rowsGeneration=0;
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
 const classInput=element("select");
 classInput.setAttribute("aria-label","Class");
 for(const name of ["ECD",...Array.from({length:12},(_,i)=>String(i+1))]){const option=element("option",name);option.value=name;classInput.append(option);}
 const subjectInput=element("input");
 subjectInput.setAttribute("placeholder","Subject");
 subjectInput.setAttribute("aria-label","Subject");
 const dateInput=element("input");
 dateInput.setAttribute("placeholder","BS YYYY-MM-DD");
 dateInput.setAttribute("aria-label","Attendance date (BS)");
 const recordsSelect=element("select");
 recordsSelect.setAttribute("aria-label","School records");
 for(const name of ["students","staff","classes","exams","subjects","certificates","school_settings","mark_settings"]){const option=element("option",name);option.value=name;recordsSelect.append(option);}
 const studentIdInput=element("input");studentIdInput.setAttribute("placeholder","Student ID");
 const studentNameInput=element("input");studentNameInput.setAttribute("placeholder","Student name (English only)");studentNameInput.setAttribute("aria-label","Student name in English");
 const studentClassInput=element("select");studentClassInput.setAttribute("aria-label","Student class");
 for(const name of ["ECD",...Array.from({length:12},(_,i)=>String(i+1))]){const option=element("option",name);option.value=name;studentClassInput.append(option);}
 const studentMode=element("select");for(const mode of ["create","update"]){const option=element("option",mode);option.value=mode;studentMode.append(option);}
 const saveStudentButton=element("button","Save student");saveStudentButton.type="button";saveStudentButton.hidden=true;
 const recordsButton=element("button","View school records");
 recordsButton.type="button";
 const marksButton=element("button","View marks");
 marksButton.type="button";
 const attendanceButton=element("button","View attendance");
 attendanceButton.type="button";
 panel.append(classInput,subjectInput,dateInput,marksButton,attendanceButton,result,recordsSelect,recordsButton,studentIdInput,studentNameInput,studentClassInput,studentMode,saveStudentButton);
 panel.hidden=true;
 root.replaceChildren(heading,reloadButton,schoolInput,selectButton,clearButton,status,panel);
 const loadSchools=async()=>{
  const current=++renderGeneration;
  ++rowsGeneration;
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
  ++rowsGeneration;
  panel.hidden=true;
  result.textContent="";
  status.textContent="Loading school...";
  try {
   const school=await workspace.selectSchool(schoolInput.value);
   if(current!==renderGeneration)return;
   status.textContent=school.schoolName+" ("+school.roles.join(", ")+")";
   panel.hidden=false;
   saveStudentButton.hidden=school.readOnly || !school.roles.includes("school_admin") || school.roles.includes("viewer");
  }catch(error){if(current===renderGeneration)showError(error);}
 };
 clearButton.onclick=()=>{
  renderGeneration++;
  rowsGeneration++;
  workspace.clear();
  panel.hidden=true;
  result.textContent="";
  schoolInput.replaceChildren();
  status.textContent="Load your schools to begin";
 };
 const showRows=async(loader,formatRows=rows=>rows)=>{
  const current=renderGeneration;
  const rowsRequest=++rowsGeneration;
  result.textContent="Loading...";
  try {
   const rows=await loader();
   if(current===renderGeneration && rowsRequest===rowsGeneration)result.textContent=JSON.stringify(formatRows(rows),null,2);
  }catch(error){if(current===renderGeneration && rowsRequest===rowsGeneration){result.textContent="";showError(error);}}
 };
 saveStudentButton.onclick=()=>showRows(()=>workspace.saveStudent({studentId:studentIdInput.value.trim(),mode:studentMode.value,values:Object.fromEntries([["name",studentNameInput.value.trim()],["className",studentClassInput.value.trim()]].filter(([,value])=>value))}));
 recordsButton.onclick=()=>showRows(()=>workspace.readRecords({collection:recordsSelect.value,limit:100}));
 marksButton.onclick=()=>showRows(()=>workspace.readMarks({className:classInput.value.trim(),subject:subjectInput.value.trim()}));
 attendanceButton.onclick=()=>showRows(()=>workspace.readAttendance({className:classInput.value.trim(),date:dateInput.value.trim(),calendar:"BS"}),rows=>rows.map(row=>{
  const {date,...rest}=row;
  if(typeof date!=="string")return row;
  const bsDate=adToBs(date);
  if(typeof bsDate!=="string" || !/^\d{4}-\d{2}-\d{2}$/.test(bsDate))throw new TypeError("BS date display conversion failed");
  return {...rest,date:bsDate};
 }));
 return Object.freeze({clearSession(){
  renderGeneration++;
  rowsGeneration++;
  workspace.clear();
  panel.hidden=true;
  result.textContent="";
  schoolInput.replaceChildren();
  status.textContent="Load your schools to begin";
 },dispose(){
  renderGeneration++;
  rowsGeneration++;
  workspace.clear();
  reloadButton.onclick=null;selectButton.onclick=null;clearButton.onclick=null;marksButton.onclick=null;attendanceButton.onclick=null;recordsButton.onclick=null;saveStudentButton.onclick=null;
  root.replaceChildren();
 }});
}
