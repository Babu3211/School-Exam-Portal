# V46 → V47: Preserve the proven portal, add school isolation

**Source of truth:** repository root `index.html` (working V46). Do not rebuild its dashboard, reports, Excel, grading, or PWA from scratch. Do not change V46 production Firebase, branch or user records.

## Verified blockers in the actual source
- V46 still initializes `exam-portal-smss-95016` and contains one hard-coded `ADMIN_UID`.
- V46 uses approximately 90 `collection(db,...)` and 60 `doc(db,...)` call sites. Each needs an explicit school-scope review, including public branding, audit logs, activity, reports, settings and backups.
- A configuration-only switch to `smss-exam-portal-v47` is **not** a migration and is unsafe.
- The current `v47/index.html` is a development hub, not V46 parity.
- V47 marks writes remain deliberately disabled until complete-class save and security tests pass.

## Implementation sequence
1. **Fork V46 UI into V47 staging**, retaining the full interface and Excel/CDC/IEMIS logic. The staging page must not point at V46 Firebase. Keep all writes blocked until scoped.
2. Add a **school-session bootstrap**: authenticate against V47, select school, verify active school and `schools/{schoolId}/members/{uid}`, then initialize the V46 UI only for that school.
3. Route **every Firestore collection/document access** through audited school-scoped adapters. Include nested paths, transactions, batch writes, queries, real-time listeners and Storage. Never rely on a UI-selected school ID alone for authorization.
4. Replace single `ADMIN_UID` checks with verified per-school role checks. Super Admin may register schools; School Admin manages one school; Teacher permissions are assignment-scoped; Viewer is read-only.
5. Keep V46 **26-column student Excel**, staff Excel, mark-ledger Excel, samples/import validators, all class/term selectors, CDC/IEMIS 2083 calculations and print layouts unchanged except where school scoping requires changes.
6. Verify Firestore rules with two schools and real role matrices; ensure School A cannot read/write School B. Test existing student/mark/attendance data, 300–1500 student pagination, PWA, mobile, and Excel round-trip.
7. Build a separate V47 hosting output and pass release-readiness and browser end-to-end tests. Deploy **only** V47 after verified acceptance; do not deploy or delete V46.

Run `node v47/audit-v46-multischool-migration.mjs` to display blockers; nonzero exit is **expected** until every legacy access is safely migrated. Do not remove or bypass this gate merely to obtain green CI.

## IEMIS-verified V46 acceptance lock
- Treat the existing V46 subject definitions, subject order, class-specific component full marks, CDC grade/NG/GPA calculations, and IEMIS 2083 Mark Entry Ledger / Mark Ledger / Grade Ledger / Grade Sheet layouts as **immutable reference behavior** for V47. No speculative formula or subject replacement.
- Preserve V46 examination data semantics, including 9–10 Computer 4 / 36 / 10, and keep existing student and staff records intact. Any new terms or classes must be additive and must not change already verified V46 result logic.
- For every adapted exam module, compare the V47 output against the same V46 fixtures before allowing a write or release. Require explicit pass/fail evidence for subject order, totals, NG, GPA, ledger and print/PDF output; no claim of IEMIS re-verification without an actual comparison.
- Use a separate V47 Firebase project and school-scoped collections; never migrate live V46 data destructively or enable cross-school reads.

## V46 collection inventory — migration coverage
Run `node v47/inventory-v46-firestore.mjs` before and after porting. The V46 source contains direct references to these groups: students, staff, classes, subjects, marks, mark_settings, exams, attendance, user_roles, school_settings, school_public_branding, school_gallery, audit_logs, certificates, public_results, public_result_lookup and public_result_exams. All need a school-scope decision and matching Firestore rules. Public result lookup must never leak another school's records. A literal-call inventory is not a substitute for checking dynamic paths and transaction callbacks.

## Rules compatibility gate (critical)
Run `node v47/audit-v46-v47-rule-coverage.mjs`. The current V47 Firestore rules have an explicit allowlisted wildcard for staff, classes, mark_settings and school_settings (not missing). Eight V46 collections remain uncovered: audit_logs, certificates, school_public_branding, school_gallery, user_roles, public_result_exams, public_result_lookup, public_results. The V47 students validator allows only four fields while V46 Excel has 26 columns; V47 marks writes are disabled. Consequently, even if all 150 V46 Firestore references are path-scoped, the original V46 screens are **not yet usable** in V47. Do not publish the transformed page or weaken rules to hide these mismatches. Implement school-scoped schema-compatible rules and regression tests first, retaining V46 data and IEMIS formulas.
