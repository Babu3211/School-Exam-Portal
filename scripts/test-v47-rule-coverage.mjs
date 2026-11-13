/** Static guard only: emulator tests remain authoritative for authorization. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {V46_COLLECTION_POLICY} from "../src/v47/v46-collection-map.mjs";
const rules=readFileSync(new URL("../firestore.v47.prototype.rules",import.meta.url),"utf8");
const collections=Object.keys(V46_COLLECTION_POLICY);
for(const name of collections) {
 const expression=new RegExp("match\\s+/"+name+"/\\{id\\}\\s*\\{");
 assert.match(rules,expression,"Missing explicit tenant rules for "+name);
}
assert.match(rules,/function schoolActive\(schoolId\)/);
assert.match(rules,/function member\(schoolId\)[\s\S]*?schoolActive\(schoolId\)/);
assert.match(rules,/match \/\{document=\*\*\} \{ allow read, write: if false; \}/);
console.log("V47 rule coverage checks passed for",collections.length,"V46 collections");
