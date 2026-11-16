/**
 * V47 term identifiers are first/second/final; the preserved V46 IEMIS
 * calculation helpers use first/second/annual. Keep stored V47 data unchanged.
 * This is a pure adapter, not permission to read/write any tenant collection.
 */
const TO_V46=Object.freeze({first:"first",second:"second",final:"annual"});
const TO_V47=Object.freeze({first:"first",second:"second",annual:"final"});
export function toV46IemisTerm(v47Term){
 if(typeof v47Term!=="string" || !Object.hasOwn(TO_V46,v47Term))
  throw new TypeError("Unsupported V47 exam term");
 return TO_V46[v47Term];
}
export function toV47ExamTerm(v46Term){
 if(typeof v46Term!=="string" || !Object.hasOwn(TO_V47,v46Term))
  throw new TypeError("Unsupported V46 IEMIS exam term");
 return TO_V47[v46Term];
}
