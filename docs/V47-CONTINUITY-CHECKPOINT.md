# V47 continuation checkpoint — 2026-11-22

This file is a **development checkpoint**, not a release approval. For current status always inspect the latest head of `smss-v47-multischool-work` and the corresponding GitHub Actions logs. Do not replay previous changes blindly.

## Branch and data safety
- Repository: `Babu3211/School-Exam-Portal`.
- `main` is the real V46 production portal used by staff. **Never deploy, force-push or edit it without a separately verified release authorization.**
- V47 development branch: `smss-v47-multischool-work`; isolated Firebase project: `smss-exam-portal-v47`.
- School document ID = numerical IEMIS code (5–20 digits). No cross-school reads or writes. Viewer is strictly read-only.
- No fake sign-off: the V47 release gate MUST remain blocking while feature parity, marks publication, hosting output or independent verification are missing.

## Work confirmed in current continuation
- `70215333`: restored 30 shared V46 assets (13 were missing) to their inspected `main` snapshot, preserving V47-only files. Corrected audited mark-transaction fixture. V46 `main` itself was unchanged.
- `535ddb09`: consolidated duplicate subject-assignment entry points onto the scoped, verified `assignment-create-service.mjs` and unique `studentId:subjectId` IDs. Aligned verified marks-query and configurable subject tests.
- `f75f38d1`, `67e1bcce`: removed fixed 4/36/10 input fields and retired the direct write path from the legacy Computer page, directed users to configured Class Marks Entry and guarded school-scoped roster against authentication changes/foreign records.
- `2606eaeb`: retired fixed-schema Computer direct writer (fail closed), required verified Admin UID for direct raw mark service and added explicit denial tests.
- This checkpoint adds XLSX-only static contract checks for the configured Class Marks page.

## Requirements from the school
- V47 must retain every V46 proven workflow; multicampus rollout is *additional*, not a replacement.
- Only **Excel .xlsx** for visible import/export/sample workflows, not CSV.
- Menus, subject names by language policy, student names, class/exam selectors in English; Nepali for UI guidance, confirmation and error notifications.
- English subject content English-only, Nepali subject content Nepali-only; other subjects may provide both languages as specified by the curriculum.
- CDC is authoritative for curriculum and grading/GPA; use already-verified V46 IEMIS/CDC behavior as reference, never invent formula or hardcode Computer 4/36/10. All marks maxima/components come from per-school Examination Settings.
- Classes ECD, LKG, UKG, 1–12; exam terms weekly, monthly, 1st, 2nd, 3rd, final.
- Students' roll numbers and optional subjects are optional; Viewer role is read-only; inactivity logout after one hour; mobile/PWA and V46 report parity must be tested.
- 20–30 schools initial scale; some school rosters up to 1500 students; pagination and server-side tenant checks.

## Known hard release blockers — do not suppress tests
`v47/release-readiness-gate.mjs` and `v47/release-evidence-report.mjs` intentionally fail because:
1. V47 dashboard is still a development hub rather than full V46 feature parity.
2. Full-class marks save has a three-student bound; production must support full cohorts (up to 1500).
3. Firestore raw marks and component marks writes are deliberately disabled. Implement an audited **complete-class** publication protocol before opening these; Firestore rules document access/transaction limits mean naïve 1500-document client-side atomic writes are not acceptable.
4. Hosting output and independent sign-off remain unverified.
Do **not** change the gate to report success without real code, emulator, E2E, data-isolation, CDC and deployment evidence.

## Verification sequence for next continuation
1. Inspect current V47 branch head and newest GitHub Actions logs (especially `V47 isolated module checks`, `V47 Multi-School Development Checks`, Firestore isolation, Full Verification).
2. Fix **actual** failures and obsolete tests together; do not loosen permission checks or hard-code Computer maxima for green CI.
3. Keep all commits on the V47 development branch with compare-and-swap expected SHA; collaborators may advance its head.
4. Complete full V46 parity and 1500-student verified publication *before* considering V47 production deployment. Never read/write actual student or marks data for testing.
