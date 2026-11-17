import assert from 'node:assert/strict';import {diagnosticReportCsv} from '../v47/diagnostic-report-export.mjs';
const report={ready:false,publicationAllowed:false,schoolClass:'6',term:'1st',students:1,subjects:1,marks:0,expectedPairs:1,checkedPairs:0,blockers:['grade_engine_not_integrated']};
const csv=diagnosticReportCsv(report);assert.match(csv,/grade_engine_not_integrated/);assert.match(csv,/publicationAllowed/);assert.throws(()=>diagnosticReportCsv({...report,ready:true}));assert.throws(()=>diagnosticReportCsv({...report,blockers:Array(101).fill('x')}));
console.log('V47 diagnostic CSV safety tests passed');
