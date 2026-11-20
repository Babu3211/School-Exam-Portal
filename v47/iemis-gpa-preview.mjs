// V46-equivalent read-only GPA projection; never used to approve or save student results.
export function previewIemisGpa(subjects,{annual=false,primary=false}={}){
 let weighted=0,credits=0;
 for(const {summary:s,creditHour} of subjects){
  const credit=Number(creditHour);
  if(!s?.complete||!Number.isFinite(credit)||credit<=0)return null;
  if(primary){if(s.totalGrade?.point==null)return null;weighted+=credit*s.totalGrade.point}
  else{if(!annual||s.inGrade?.point==null||s.theoryGrade?.point==null||s.full<=0)return null;weighted+=credit*(s.inFull*s.inGrade.point+s.theoryFull*s.theoryGrade.point)/s.full}
  credits+=credit;
 }
 return credits>0?weighted/credits:null;
}
