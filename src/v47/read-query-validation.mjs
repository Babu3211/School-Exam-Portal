/**
 * Bounded read-only HTTP query validation, independent of Firebase.
 * Rejects unknown keys, arrays, empty required values and oversized input.
 */
const MAX_LENGTH=128;
export function validateV47ReadQuery(query,kind) {
 const allowed=kind==="marks"
  ? ["schoolId","className","subject","section"]
  : kind==="attendance"
   ? ["schoolId","className","date","attendanceType"]
   : null;
 if(!allowed || !query || typeof query!=="object" || Array.isArray(query))return false;
 if(Object.keys(query).some(key=>!allowed.includes(key)))return false;
 const required=kind==="marks"?["schoolId","className","subject"]:["schoolId","className","date"];
 if(required.some(key=>typeof query[key]!=="string" || !query[key].trim()))return false;
 if(allowed.some(key=>query[key]!==undefined &&
   (typeof query[key]!=="string" || query[key].length>MAX_LENGTH ||
    /[\u0000-\u001f\u007f]/.test(query[key]))))return false;
 if(!/^[A-Za-z0-9_-]{8,64}$/.test(query.schoolId))return false;
 if(kind==="attendance" && !/^\d{4}-\d{2}-\d{2}$/.test(query.date))return false;
 return true;
}
