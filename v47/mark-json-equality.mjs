// Firestore maps are unordered; arrays (roster and component order) are ordered.
// Strict comparison of JSON-compatible marks/settings only. No coercion, no
// tolerance of unknown/missing fields, non-finite numbers, or exotic objects.
export function sameMarkJson(a,b){
 if(a===null||b===null)return a===b;
 if(typeof a!==typeof b)return false;
 if(typeof a==='number')return Number.isFinite(a)&&Number.isFinite(b)&&a===b;
 if(typeof a==='string'||typeof a==='boolean')return a===b;
 if(typeof a!=='object')return false;
 if(Array.isArray(a)||Array.isArray(b))return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((x,i)=>Object.hasOwn(a,i)&&Object.hasOwn(b,i)&&sameMarkJson(x,b[i]));
 const plain=v=>Object.getPrototypeOf(v)===Object.prototype||Object.getPrototypeOf(v)===null;
 if(!plain(a)||!plain(b))return false;
 const keys=Object.keys(a);
 return keys.length===Object.keys(b).length&&keys.every(k=>Object.hasOwn(b,k)&&sameMarkJson(a[k],b[k]));
}
