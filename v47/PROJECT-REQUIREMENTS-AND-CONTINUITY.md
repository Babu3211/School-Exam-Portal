# SMSS Exam Portal — Binding Requirements and Work Continuity
Updated: 2026-11-22. Source: user's project conversations and explicit instructions. This document is a project work record, not evidence that a feature is complete.

## Non-negotiable instructions
1. **Excel .xlsx ONLY** for every import, export, sample/template download, marks review, report data download, and IEMIS exchange. **Never introduce CSV** as an alternative or intermediate user workflow. Reuse working V46 Excel features and existing V47 XLSX code; do not reimplement the same function repeatedly.
2. **V47 = full working V46 portal + multi-school**, not a collection of replacement prototype screens. Preserve existing Dashboard, Login, Students, Teacher/Staff, Attendance, Exam Management, Examination Settings, Mark Entry, Mark Ledger, Grade Ledger, Grade Sheet, Reports, Roles, PWA/APK, maps, and workflows.
3. **Do not repeat finished work.** Before coding, inspect branch files, existing tests, commits and related prior requirements; fix only verified gaps. Group meaningful changes, run tests and report evidence rather than repeating promises or claiming unrun tests passed.
4. **V46 production and real student/marks/settings data are protected.** Do not edit, reset, migrate, overwrite or deploy V46 without explicit permission. V47 uses a separate Firebase project and development branch. Never use real student marks for destructive tests.
5. **No V47 production deployment until full V46 parity, school isolation, verified full-class marks save/publication, security rules, emulator/browser E2E tests, and release approval are confirmed.** Do not bypass release gates.

## Excel / IEMIS specifics
- Excel **.xlsx** for Student/Staff/Teacher import, marks import/export, IEMIS-compatible sample downloads, missing marks, reports and complete-class review.
- Preserve the IEMIS-compatible **grouped layout, subject serial/order, columns, and V46 validated formats**, including class-specific formats and print/Grade Sheet watermark.
- User specifically requested an **IEMIS Exam Importer**: red/blue movable panel visible automatically when Exam Management opens; detect current class/form/data; provide Mark Entry, separate Class 5 Mark Entry, Attendance, Sample Download, Excel Export/Import, and Copy/Paste; support transfer of SMSS marks to IEMIS. Verify actual behavior against IEMIS before marking complete. Do not assume external IEMIS writes are authorized or completed.
- **Examination Settings define the maximum marks and components for every subject.** Do not hardcode Computer 4/36/10 as the only allowed values. Preserve verified V46/IEMIS structures and any school-specific settings.
- Terms: Weekly, Monthly, 1st, 2nd, 3rd and Final. CDC/IEMIS grade, GPA, NG, marks ledger, grade ledger, grade sheet, print/PDF must match V46's previously verified behavior.
- Before saving a class's marks, validate **every student** in the authoritative roster; missing or invalid marks must block saving and show a Nepali explanation. Full-class consistency must hold even with concurrent enrollment changes.
- V47 import/export should support up to 1,500 students per class where applicable, with bounded validation and safe XLSX parsing.

## Multi-school and permissions
- School ID = official IEMIS number (5–20 numeric digits), strict school-scoped Firestore isolation.
- Super Admin registers schools; each school has School Admin, Teacher and Viewer. Viewer sees permitted screens/reports but has **read-only** access throughout.
- Teacher access restricted to verified assignments; Admin permissions verified. No cross-school reads/writes. Do not trust a browser-supplied role or school ID.
- Initially free Firebase Spark plan, **no billing**; scalable toward 20–30+ schools with 300–1,500 students each, without claiming unlimited capacity on free quotas.
- Class options ECD, LKG, UKG, 1–12. Menus, class/term choices, student/staff names shown in English; **Nepali for errors, confirmation, instructions and notifications**. Login school name/address in Nepali and English from settings where available.
- Student roll number and optional subject not mandatory; Attendance date auto-populates Nepal-local current date; one-hour inactivity auto logout; dashboard version, school map, activity and live counts.
- Preserve Android APK and iPhone/Android PWA install workflows and user-provided app icon.

## Existing branch work — inspect before modifying
- Repo: Babu3211/School-Exam-Portal
- V47 working branch: smss-v47-multischool-work
- V47 Firebase project: smss-exam-portal-v47
- Existing V47 modules include configured marks preflight, complete-class preview, JSON review verification, server-only fingerprint/confirmation/staging/pointer plans, official marks readers, school-scoped membership and teacher assignment, and Excel workbook writer.
- Existing V47 Marks Entry has development-only full-class XLSX sample download and XLSX draft import plus review export; **official Save/Publish is disabled**. XLSX import requires current roster, active settings, complete marks, and school-admin session; it has not been browser/E2E verified. Development hub is not full V46 dashboard parity.
- V47 Firestore rules currently deny official marks writes. **Do not call marks publication complete** based only on plans, validators or Excel exports.
- Excel work: v47/excel-workbook.mjs, v47/class-review-excel.mjs, v47/test-class-review-excel.mjs; reuse these. An older class-review-csv.mjs exists as leftover development code: it is **not a user requirement**, and must not be reintroduced into UI or test priorities.
- Release tracking: GitHub issue #78 and v47/release-readiness-gate.mjs. A commit is not proof of CI or browser success.

## Working procedure for every 'continue'
1. Read this record and inspect actual GitHub branch state, tests, blockers and prior commits.
2. Select the **highest-impact unfinished V46-to-V47 integration**, not another duplicate export/validator/prototype.
3. Implement cohesive functional changes, run or check tests, fix failures, and preserve V46.
4. Report exact files/commits, tests actually run, remaining blockers, and whether live deployment happened. Never imply deployment or success without evidence.
5. Keep this record updated when the user changes a requirement or a milestone is independently verified. User instructions take precedence over older conflicting notes.
