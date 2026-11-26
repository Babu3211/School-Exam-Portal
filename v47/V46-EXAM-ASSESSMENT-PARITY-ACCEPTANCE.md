# Required V46 exam and assessment parity before V47 activation

Owner requirement, 2026-11-26: V47 must retain the V46 exam system and Classes 1–5 assessment, without changing V46. Baseline V46 main observed at `82b01c45354e6a750ed1ab545deb6b15881eafaf` (merge of theme coverage fixes). Recheck deployed V46 source before certification. Multi-school scope and role isolation are the intended differences, not calculation or form changes.

## Required acceptance checks

- Exam Management: identical class/subject/term selection and original subject labels; existing marks, settings, optional subjects and historical exam identity preserved; same IEMIS 2083 components, absence handling, grading/GPA, entry ledger, marks ledger, grade ledger and grade sheet. Test class 1, 6 and 9, then each corresponding class group; Computer 9–10 internal 4/36/10. No silent conversion of historical records. XLSX only for tabular import/export.
- Assessment 1–5: retain the existing V46 2083 forms for both 1–3 and 4–5, per-subject language, theme/outcome lists, indicator block structure, dates, scores, support assessment and remarks. Preserve source catalogue and saved keys including irregular indicator blocks. Do not introduce 2084 forms. Assigned teacher only for entry; admin review and viewer read-only. Match portfolio, all-student PDF/Word/Excel and A4 print, dashboard/analytics/report views. Check each subject and class against V46; no invented values for missing source evidence.
- Security: canonical school scope for every read/write, no cross-school access, role/assignment verification including backend rules and negative tests. V46 remains read-only during migration. Preserve existing V47 Super Admins and prevent identity collision overwrite.
- Release: source inspection and private archive do not establish parity. Run realistic emulator and authenticated end-to-end tests and reconcile real migrated records before activation. No deploy to V46. Existing V47 reference page is not operational primary assessment, and existing marks write restrictions are unresolved.

School remains inactive until checks pass. Existing private snapshot and staged school records are not modified by this acceptance document.
