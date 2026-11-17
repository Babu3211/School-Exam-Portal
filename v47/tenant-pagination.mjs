export function safePageSize(requested,maximum=100){
 if(!Number.isInteger(maximum)||maximum<1||maximum>500) throw new RangeError('Invalid maximum');
 if(requested===undefined)return Math.min(50,maximum);
 if(!Number.isInteger(requested)||requested<1)throw new RangeError('Invalid page size');
 return Math.min(requested,maximum);
}
