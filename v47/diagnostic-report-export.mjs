// CSV of validation blockers, not an official grade ledger.
function cell(value){let s=String(value??'');if(/^[\s\u0000-\u001f]*[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"'}
export function diagnosticReportCsv(report){
 if(!report||report.ready!==false||report.publicationAllowed!==false||!Array.isArray(report.blockers))throw new Error('Only non-publishable diagnostic reports can be exported');
 if(report.blockers.length>100||report.blockers.some(code=>typeof code!=='string'||code.length>128))throw new RangeError('Invalid blocker list');
 for(const key of ['students','subjects','marks','expectedPairs','checkedPairs'])if(!Number.isSafeInteger(report[key])||report[key]<0)throw new TypeError('Invalid diagnostic count: '+key);
 return [['field','value'],...['schoolClass','term','students','subjects','marks','expectedPairs','checkedPairs','publicationAllowed'].map(key=>[key,report[key]]),...report.blockers.map(code=>['blocker',code])].map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';
}
