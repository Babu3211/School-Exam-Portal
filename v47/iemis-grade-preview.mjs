// Read-only V47 grade band projection from root iemis-ledger.js.
// Does not approve marks entry, GPA, final results or production use.
const bands=Object.freeze([[90,'A+',4,'Outstanding'],[80,'A',3.6,'Excellent'],[70,'B+',3.2,'Very Good'],[60,'B',2.8,'Good'],[50,'C+',2.4,'Satisfactory'],[40,'C',2,'Acceptable'],[35,'D',1.6,'Basic'],[0,'NG',null,'Not Graded']].map(x=>Object.freeze(x)));
export function previewGrade(percent){if(typeof percent!=='number'||!Number.isFinite(percent)||percent<0||percent>100)return null;const [,grade,point,remark]=bands.find(([min])=>percent>=min);return {grade,point,remark}}
export function previewFinalGrade(point){if(point===null||typeof point!=='number'||!Number.isFinite(point)||point<0||point>4)return null;if(point===0)return {grade:'NG',point:null,remark:'Not Graded'};const band=[...bands].reverse().find(([, ,gp])=>gp!==null&&point<=gp+1e-9);return band?{grade:band[1],point:band[2],remark:band[3]}:null}
