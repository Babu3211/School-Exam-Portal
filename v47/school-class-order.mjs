export const V47_CLASS_ORDER=Object.freeze(['ECD','LKG','UKG',...Array.from({length:12},(_,i)=>'Class '+(i+1))]);
export function classRank(value){
 const i=V47_CLASS_ORDER.indexOf(value);
 if(i<0)throw new TypeError('Unknown class');
 return i;
}
export function sortClasses(classes){return [...classes].sort((a,b)=>classRank(a)-classRank(b));}
