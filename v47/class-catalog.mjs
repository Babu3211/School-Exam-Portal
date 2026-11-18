export const SCHOOL_CLASSES=Object.freeze(['ECD','LKG','UKG',...Array.from({length:12},(_,i)=>String(i+1))]);
export function validSchoolClass(value){return typeof value==='string'&&SCHOOL_CLASSES.includes(value);}
