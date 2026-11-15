# SMSS V47 Multi-School — final release gates (15 November 2026)

## Verified in GitHub CI
- Isolated V47 automated test suite passed at commit `0f9bc5da`, run 43672089734.
- Production-boundary test compares V47 branch changes with `origin/main`; only V47-specific files are allowed.
- Verified server-side school registration, invitation, teacher assignment, tenant isolation, viewer restrictions and mock-backed HTTP integration tests.
- These checks use synthetic data and mocks. **They do not demonstrate a live Firebase staging deployment, production data compatibility or full V46 feature parity.**

## Release blockers — do not label production ready until completed
1. Provision an independent Firebase project for V47 staging (not `exam-portal-smss-95016`). Configure staging-only credentials and separate Auth/Firestore.
2. Deploy isolated `v47-runtime/server.mjs` and `prototypes/v47/verified-workspace-staging.html` with verified BS/AD adapters; record a real HTTPS staging URL.
3. Run real-device login/logout, two-school school chooser, school registration and admin invitation, teacher assignment, student reads/writes, marks and attendance, and viewer read-only tests against staging.
4. Integrate **actual** V46 UI features rather than relying on the experimental `v46-feature-bridge.mjs` contract. Check grade ledger, mark ledger, grade sheet, result/CDC calculations, IEMIS 2083 layout, ECD–12, print/PDF, staff, school settings and APK/PWA.
5. Verify all V46 Firestore collection paths and document shapes; execute read-only migration dry run with representative anonymized fixtures. Do not assume the V47 prototype marks schema matches V46.
6. Back up data, validate rollback, obtain explicit production approval, and only then plan a separate release. Never point staging at the V46 Firebase project.

## Current release decision
**HOLD: automated development CI green; live staging, real V46 integration and data migration verification incomplete.**
No production deploy or data migration authorized by this checklist.
