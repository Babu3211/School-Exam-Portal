// Returns the Nepal-local Gregorian date (not Bikram Sambat).
export function nepalGregorianDate(now=new Date()){
 if(!(now instanceof Date)||Number.isNaN(now.getTime()))throw new TypeError('Invalid date');
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kathmandu',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const values=Object.fromEntries(parts.map(p=>[p.type,p.value]));
 return values.year+'-'+values.month+'-'+values.day;
}
