/**
 * V47 subscription lifecycle calculations. Pure/offline; never modifies accounts.
 * Dates are UTC ISO calendar dates. Enforcement is deliberately not implemented.
 */
import {annualFeeNpr} from "./tenant-domain.mjs";
const DAY=86400000;
function day(s) {
 if(typeof s!=="string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new TypeError("ISO date required");
 const t=Date.parse(s+"T00:00:00Z");
 if(!Number.isFinite(t) || new Date(t).toISOString().slice(0,10)!==s) throw new TypeError("Invalid date");
 return t;
}
export function subscriptionPreview({annualFee,startDate,endDate,asOf,graceDays=30,isOwnerSchool=false,paid=false}) {
 const fee=isOwnerSchool?0:annualFeeNpr(annualFee);
 if(!Number.isSafeInteger(graceDays)||graceDays<0||graceDays>365) throw new TypeError("Invalid grace period");
 const start=day(startDate),end=day(endDate),today=day(asOf);
 if(end<start) throw new TypeError("End before start");
 const daysRemaining=Math.ceil((end-today)/DAY);
 const status=isOwnerSchool?"free":today<start?"upcoming":!paid?"unpaid":daysRemaining>=0?"active":daysRemaining>=-graceDays?"grace":"expired";
 return Object.freeze({annualFeeNpr:fee,status,daysRemaining,graceDays});
}
