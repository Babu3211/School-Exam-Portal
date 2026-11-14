/**
 * V47 read-only date conversion boundary.
 * V46 stores attendance date in AD (YYYY-MM-DD), though UI selects BS.
 * The host must supply its verified V46-compatible BS -> AD converter.
 */
const DATE=/^\d{4}-\d{2}-\d{2}$/;
export function normalizeV47AttendanceDate({value,calendar="AD",bsToAd}) {
 if(typeof value!=="string" || !DATE.test(value))
  throw new TypeError("Attendance date must use YYYY-MM-DD");
 const [year,month,day]=value.split("-").map(Number);
 if(month<1 || month>12 || day<1 || day>32 || year<1900 || year>2200)
  throw new TypeError("Invalid attendance date");
 if(calendar==="AD") {
  const date=new Date(Date.UTC(year,month-1,day));
  if(date.getUTCFullYear()!==year || date.getUTCMonth()!==month-1 || date.getUTCDate()!==day)
   throw new TypeError("Invalid AD date");
  return value;
 }
 if(calendar!=="BS" || typeof bsToAd!=="function")
  throw new TypeError("Verified BS date converter required");
 const converted=bsToAd(value);
 if(typeof converted!=="string" || !DATE.test(converted))
  throw new TypeError("BS date conversion failed");
 return normalizeV47AttendanceDate({value:converted,calendar:"AD"});
}
