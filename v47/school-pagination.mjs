export function boundedPageSize(value,maximum=100){
 if(!Number.isInteger(maximum)||maximum<1||maximum>500)throw new RangeError('Invalid maximum');
 if(!Number.isInteger(value)||value<1)return Math.min(50,maximum);
 return Math.min(value,maximum);
}
export function stablePage(items,{limit=50,afterId=null}={}){
 if(!Array.isArray(items))throw new TypeError('Items required');
 if(items.some(x=>!x||typeof x.id!=='string'||!x.id))throw new TypeError('Every item requires a nonempty string ID');
 if(afterId!==null&&typeof afterId!=='string')throw new TypeError('Invalid cursor');
 const size=boundedPageSize(limit);
 const sorted=[...items].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
 const filtered=afterId===null?sorted:sorted.filter(x=>String(x.id)>String(afterId));
 return {items:filtered.slice(0,size),nextCursor:filtered.length>size?String(filtered[size-1].id):null};
}
