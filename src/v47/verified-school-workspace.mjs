/**
 * V47 school chooser + workspace orchestration.
 * A school can only be selected from the server-verified chooser result;
 * the dashboard endpoint independently re-verifies current membership.
 * No V46 production imports or Firestore writes.
 */
import {createV47SchoolsClient} from "./schools-client.mjs";
import {createV47SchoolWorkspace} from "./school-workspace-controller.mjs";
export function createV47VerifiedSchoolWorkspace({getIdToken,fetchImpl,bsToAd}) {
 const chooser=createV47SchoolsClient({getIdToken,fetchImpl});
 const workspace=createV47SchoolWorkspace({getIdToken,fetchImpl,bsToAd});
 let available=null;
 let generation=0;
 return Object.freeze({
  async loadSchools(){
   const request=++generation;
   workspace.clear();
   available=null;
   const schools=await chooser.listSchools();
   if(request!==generation)throw new Error("School selection changed");
   available=schools;
   return schools;
  },
  getAvailableSchools(){return available?Object.freeze([...available]):null;},
  getSelectedSchool:()=>workspace.getSelectedSchool(),
  async selectSchool(schoolId){
   if(!available?.some(school=>school.schoolId===schoolId))
    throw new Error("School not in verified membership list");
   const request=generation;
   const dashboard=await workspace.selectSchool(schoolId);
   if(request!==generation){workspace.clear();throw new Error("School selection changed");}
   return dashboard;
  },
  saveStudent:args=>workspace.saveStudent(args),
  readRecords:args=>workspace.readRecords(args),
  readMarks:args=>workspace.readMarks(args),
  readAttendance:args=>workspace.readAttendance(args),
  clear(){
   generation++;
   available=null;
   workspace.clear();
  }
 });
}
