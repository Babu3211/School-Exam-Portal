/**
 * Isolated V47 workspace state controller. No DOM, no Firebase writes,
 * and no modification to V46 production pages.
 */
import {createV47DashboardClient} from "./dashboard-client.mjs";
import {createV47ExamReadClient} from "./marks-attendance-client.mjs";

export function createV47SchoolWorkspace({getIdToken,fetchImpl}) {
 const dashboardClient=createV47DashboardClient({getIdToken,fetchImpl});
 const examClient=createV47ExamReadClient({getIdToken,fetchImpl});
 let current=null;
 let generation=0;
 const selected=()=>current;
 return Object.freeze({
  getSelectedSchool:selected,
  async selectSchool(schoolId) {
   const requestGeneration=++generation;
   current=null; // Never retain another school's data while switching.
   const dashboard=await dashboardClient.loadSchool(schoolId);
   if(requestGeneration!==generation)throw new Error("School selection changed");
   current=dashboard;
   return dashboard;
  },
  clear(){generation++;current=null;},
  async readMarks({className,subject,section=""}) {
   const school=current;
   if(!school)throw new Error("Select an authorized school first");
   const requestGeneration=generation;
   const rows=await examClient.readMarks({schoolId:school.schoolId,className,subject,section});
   if(requestGeneration!==generation || current!==school)
    throw new Error("School selection changed");
   return rows;
  },
  async readAttendance({className,date,attendanceType="daily"}) {
   const school=current;
   if(!school)throw new Error("Select an authorized school first");
   const requestGeneration=generation;
   const rows=await examClient.readAttendance({schoolId:school.schoolId,className,date,attendanceType});
   if(requestGeneration!==generation || current!==school)
    throw new Error("School selection changed");
   return rows;
  }
 });
}
