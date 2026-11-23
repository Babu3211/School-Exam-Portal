// Read-only, user-initiated satellite map lookup from a verified school's profile.
// This is a search, not a GPS-verified school pin. No Firebase writes or API keys.
import {validateSchoolId} from './school-paths.mjs';
export function schoolSatelliteMapLinks({schoolId,profile}){
 validateSchoolId(schoolId);
 if(!profile||typeof profile!=='object'||Array.isArray(profile))return null;
 const tidy=(value,max)=>{
  if(typeof value!=='string'||value.length>max||/[\u0000-\u001f\u007f]/.test(value))return '';
  return value.trim().replace(/\s+/g,' ');
 };
 const name=tidy(profile.nameEnglish,160)||tidy(profile.nameNepali,160);
 const address=tidy(profile.addressEnglish,300)||tidy(profile.addressNepali,300);
 if(!name||!address)return null; // Never guess a pin for a school with no address.
 const query=[name,address,/\bNepal\b/i.test(address)?'':'Nepal'].filter(Boolean).join(', ');
 const encoded=encodeURIComponent(query);
 return Object.freeze({
  query,
  embedUrl:'https://maps.google.com/maps?hl=en&q='+encoded+'&t=k&z=16&output=embed',
  openUrl:'https://www.google.com/maps/search/?api=1&query='+encoded
 });
}
