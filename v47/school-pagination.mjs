export function boundedPageSize(value,maximum=100){
 if(!Number.isInteger(maximum)||maximum<1||maximum>500)throw new RangeError('Invalid maximum');
 if(!Number.isInteger(value)||value<1)return Math.min(50,maximum);
 return Math.min(value,maximum);
}
export function stablePage(items,{limit=50,afterId=null}={}){
 if(!Array.isArray(items))throw new TypeError('Items required');
 const size=boundedPageSize(limit);
 const sorted=[...items].sort((a,b)=>String(a.id).localeCompare(String(b.id)));
 const filtered=afterId===null?sorted:sorted.filter(x=>String(x.id)>String(afterId));
 return {items:filtered.slice(0,size),nextCursor:filtered.length>size?String(filtered[size-1].id):null};
}
