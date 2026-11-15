# SMSS V47 Multi-School — final release gates (15 November 2026)

## Verified in GitHub CI
- Isolated V47 automated test suite passed at commit `0f9bc5da`, run 43672089734.
- Production-boundary test compares V47 branch changes with `origin/main`; only V47-specific files are allowed.
- Verified server-side school registration, invitation, teacher assignment, tenant isolation, viewer restrictions and mock-backed HTTP integration tests.
- These checks use synthetic data and mocks. **They do not demonstrate a live Firebase staging deployment, production data compatibility or full V46 feature parity.**

## Release blockers — do not label production ready until completed
1. **Project created (user-confirmed 15 November 2026):** independent Firebase project ID `smss-exam-portal-v47` (not `exam-portal-smss-95016`). **User-confirmed:** separate Email/Password Authentication enabled, default Firestore created with deny-all client rules, Firebase Web App registered with auth domain `smss-exam-portal-v47.firebaseapp.com`. **User reports completed:** first Auth user created and `platform_admins/{uid}` document with boolean `active: true` added. This is not yet independently verified by a running V47 API. **Still required:** staging-only API runtime deployment, verified server credentials, hosting and authenticated tests. No service-account secrets should be committed. Creation alone does not mean staging is deployed.
2. Deploy isolated `v47-runtime/server.mjs` and `prototypes/v47/verified-workspace-staging.html` with verified BS/AD adapters; record a real HTTPS staging URL.
3. Once the isolated HTTPS API exists, run the non-mutating smoke check: `V47_STAGING_API_ORIGIN=https://your-staging-host.example node scripts/test-v47-staging-smoke.mjs`. It checks anonymous access denial on registration, invitation, teacher assignment and student writes; it **cannot** verify authenticated flows or prove that staging is deployed until actually executed against a real URL.
4. Run real-device login/logout, two-school school chooser, school registration and admin invitation, teacher assignment, student reads/writes, marks and attendance, and viewer read-only tests against staging.
5. Integrate **actual** V46 UI features rather than relying on the experimental `v46-feature-bridge.mjs` contract. Check grade ledger, mark ledger, grade sheet, result/CDC calculations, IEMIS 2083 layout, ECD–12, print/PDF, staff, school settings and APK/PWA.
6. Verify all V46 Firestore collection paths and document shapes; execute read-only migration dry run with representative anonymized fixtures. Do not assume the V47 prototype marks schema matches V46.
7. Back up data, validate rollback, obtain explicit production approval, and only then plan a separate release. Never point staging at the V46 Firebase project.

## Current release decision
**HOLD: automated development CI green; live staging, real V46 integration and data migration verification incomplete.**
No production deploy or data migration authorized by this checklist.
