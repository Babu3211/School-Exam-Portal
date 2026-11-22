// Excel-only import preview. Do not accept CSV or legacy XLS, even if renamed.
// This module validates file type/size/signature only; the caller still parses
// and reviews rows. It performs no Firebase reads, writes or student imports.
const XLSX_MAX_BYTES=5*1024*1024;
export async function readXlsxPreviewBytes(file){
 if(!file||typeof file.name!=='string'||!/\.xlsx$/i.test(file.name))
  throw new Error('केवल Excel (.xlsx) फाइल छान्नुहोस्। CSV वा XLS स्वीकार हुँदैन।');
 if(!Number.isSafeInteger(file.size)||file.size<4||file.size>XLSX_MAX_BYTES)
  throw new Error('Excel फाइल खाली, अपूर्ण वा ५ MB भन्दा ठूलो छ।');
 if(typeof file.arrayBuffer!=='function')throw new Error('Excel फाइल पढ्न मिलेन।');
 const buffer=await file.arrayBuffer();
 if(!(buffer instanceof ArrayBuffer)||buffer.byteLength!==file.size)
  throw new Error('Excel फाइलको आकार मिलेन वा अपूर्ण छ।');
 const bytes=new Uint8Array(buffer);
 if(bytes[0]!==0x50||bytes[1]!==0x4b||bytes[2]!==0x03||bytes[3]!==0x04)
  throw new Error('फाइल XLSX ZIP संरचनामा छैन। CSV वा नक्कली Excel फाइल अस्वीकार गरियो।');
 return buffer;
}
