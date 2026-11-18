export const V47_DEFAULT_PAGE_SIZE=50;
export const V47_MAX_PAGE_SIZE=100;
export function assertBoundedBatch(size){
 if(!Number.isInteger(size)||size<1||size>V47_MAX_PAGE_SIZE)throw new RangeError('Unbounded batch');
 return size;
}
