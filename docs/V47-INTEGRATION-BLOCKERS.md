# V47 integration status — reviewed 2026-11-21

**Source present is not tested or deployed.** Do not rebuild existing V47 prototypes or change V46 production.

## Existing V47 modules: reuse
- `v47/index.html`: Super Admin, School Admin, Students, Attendance, Academic Records, Subjects, Assignments, Exams, Marks, Computer components and Reviews are linked. The page explicitly says development hub, not integrated V46 portal.
- `v47/class-catalog.mjs`: ECD, LKG, UKG, 1–12.
- `v47/class-mark-draft-inspector.mjs`: read-only validation up to 1,500.
- `v47/class-mark-save.mjs`: atomic saving deliberately limited to 3; browser Save/Publish disabled.
- `v47/rewrite-v46-firestore-paths.mjs`: pure staging transformer, NOT a complete tenant integration.

## Prioritized unfinished work
1. Integrate existing V46 dashboard/UI into separate V47 staging, preserving all V46 features and data.
2. Audit tenant rewrite: `activeSchoolId` is not authenticated/defined by transformer; nested and dynamic paths and rules require review. Do not deploy generated source without review.
3. Audit schema/rules for every V46 collection: audit_logs, students, certificates, school_public_branding, school_gallery, school_settings, staff, classes, user_roles, subjects, marks, mark_settings, exams, public_result_exams, public_result_lookup, public_results, attendance.
4. Implement safe complete-class marks publication for >3 students with roster freshness, assignment checks and no partial saves.
5. Verify Computer 4/36/10 and CDC/IEMIS grade sheet, mark ledger, grade ledger, watermark and printing against V46.
6. Verify complete-class attendance, teacher assignment authorization and Viewer read-only permissions.
7. Restore V46 PWA/APK and dashboard behavior in V47 staging.
8. Run actual `npm run test:v47`, Firebase emulator, browser E2E and record PASS/FAIL evidence.
9. Obtain explicit approval before V47 production deployment. Keep `v47/release-readiness-gate.mjs` blocking until verified.

For each task record: files changed, commit, executed test command, actual result. Prioritize parity/integration over repeated micro-fixes. Do not touch V46 production or enable billing.
