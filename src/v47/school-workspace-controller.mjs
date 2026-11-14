/**
 * Isolated V47 workspace state controller. No DOM, no Firebase writes,
 * and no modification to V46 production pages.
 */
import {createV47StudentWriteClient} from "./student-write-client.mjs";
import {createV47RecordsClient} from "./records-client.mjs";
import {createV47DashboardClient} from "./dashboard-client.mjs";
import {createV47ExamReadClient} from "./marks-attendance-client.mjs";
import {normalizeV47AttendanceDate} from "./attendance-date-adapter.mjs";

export function createV47SchoolWorkspace({getIdToken,fetchImpl,bsToAd}) {
 const dashboardClient=createV47DashboardClient({getIdToken,fetchImpl});
 const examClient=createV47ExamReadClient({getIdToken,fetchImpl});
 const recordsClient=createV47RecordsClient({getIdToken,fetchImpl});
 const studentWriter=createV47StudentWriteClient({getIdToken,fetchImpl});
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
  async saveStudent({studentId,mode,values}) {
   const school=current;
   if(!school)throw new Error("Select an authorized school first");
   if(!school.roles.includes("school_admin") || school.roles.includes("viewer"))throw new Error("School admin required");
   const requestGeneration=generation;
   const saved=await studentWriter.saveStudent({schoolId:school.schoolId,studentId,mode,values});
   if(requestGeneration!==generation || current!==school)throw new Error("School selection changed");
   return saved;
  },
  async readRecords({collection,limit=100}) {
   const school=current;
   if(!school)throw new Error("Select an authorized school first");
   const requestGeneration=generation;
   const rows=await recordsClient.readRecords({schoolId:school.schoolId,collection,limit});
   if(requestGeneration!==generation || current!==school)throw new Error("School selection changed");
   return rows;
  },
  async readMarks({className,subject,section=""}) {
   const school=current;
   if(!school)throw new Error("Select an authorized school first");
   const requestGeneration=generation;
   const rows=await examClient.readMarks({schoolId:school.schoolId,className,subject,section});
   if(requestGeneration!==generation || current!==school)
    throw new Error("School selection changed");
   return rows;
  },
  async readAttendance({className,date,calendar="AD",attendanceType="daily"}) {
   const school=current;
   if(!school)throw new Error("Select an authorized school first");
   const requestGeneration=generation;
   const adDate=normalizeV47AttendanceDate({value:date,calendar,bsToAd});
   const rows=await examClient.readAttendance({schoolId:school.schoolId,className,date:adDate,attendanceType});
   if(requestGeneration!==generation || current!==school)
    throw new Error("School selection changed");
   return rows;
  }
 });
}
