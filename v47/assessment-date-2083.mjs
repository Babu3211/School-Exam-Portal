// Academic year 2083 only. Cross-checked 2083 month lengths and epoch against:
// https://dateconverters.com/nepali-calendar/2083/
// https://nepdatewidget.rajuprasai.com.np/nepali-calendar-2083.html
// Not a generic BS conversion algorithm; never guess dates outside this year.
import {nepalGregorianDate} from './nepal-date.mjs';
const days=Object.freeze([31,31,32,31,31,31,30,29,30,29,30,30]);
const dayMs=86400000,epoch=Date.UTC(2026,3,14);
const pad=n=>String(n).padStart(2,'0');
export function validAssessmentDate2083(date){
 if(typeof date!=='string'||!/^2083-\d{2}-\d{2}$/.test(date))return false;
 const [,m,d]=date.split('-').map(Number);
 return m>=1&&m<=12&&d>=1&&d<=days[m-1];
}
export function todayAssessmentDate2083(now=new Date()){
 const ad=nepalGregorianDate(now);
 let offset=(Date.parse(ad+'T00:00:00Z')-epoch)/dayMs;
 if(!Number.isInteger(offset)||offset<0||offset>=365)return '';
 for(let m=0;m<days.length;m++){
  if(offset<days[m])return '2083-'+pad(m+1)+'-'+pad(offset+1);
  offset-=days[m];
 }
 return '';
}
