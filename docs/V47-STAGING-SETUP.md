# V47 Spark-only staging setup — isolated project

**V47 project:** `smss-exam-portal-v47` (reported created; not independently verified).  
**Protected V46 project:** `exam-portal-smss-95016` — never deploy or change it from V47 work.

## Current verified status
- GitHub development CI passed at commit `63c557e7`, run 43727330594. These are synthetic/emulator tests, **not** live browser or staging acceptance tests.
- The owner reports a separate Firebase Auth project, Firestore with deny-all deployed client rules, registered Web App and an initial active platform-admin record. These claims are **not independently verified**.
- V47 browser prototype: `prototypes/v47/spark-school-registration.html`; V47 draft rules: `firestore.v47.prototype.rules`. Neither is deployed.
- The current repository-root `firebase.json` points at `firestore.rules` and serves the whole repository. **Do not run a default root Firebase deploy for V47**; it could target the wrong project or deploy inappropriate rules/files.

## Approved architecture: Spark only, no billing
- Use **Firebase Hosting static assets**, Firebase Authentication Web SDK and Firestore Web SDK with **least-privilege tenant-scoped security rules**, in the **separate V47 Firebase project only**.
- Do not deploy `v47-runtime/server.mjs` on Cloud Functions/Run, or use paid servers, Blaze, billing accounts, or a browser-exposed Admin SDK/service-account key.
- The Admin SDK prototype `prototypes/v47/verified-workspace-staging.html` and `scripts/test-v47-staging-smoke.mjs` target an **unavailable trusted HTTP API**. They are **not valid acceptance tests** for Spark-only static browser staging.
- No browser client may self-grant platform-admin access: the pre-existing platform-admin document must be provisioned separately by an authorized operator, and the Firestore rules must verify it.
- Spark quotas apply; zero billing does not guarantee unlimited usage.

## Safe staging preparation — no deployment authorized by this document
1. Confirm the Firebase console shows project ID exactly `smss-exam-portal-v47`. Keep `exam-portal-smss-95016` entirely out of staging CLI aliases and commands.
2. Review the draft V47 rules, invitation acceptance, IEMIS uniqueness, school activation, teacher assignments, viewer read-only, school suspension and cross-tenant isolation. Run the Firestore emulator suite. **Keep deployed rules deny-all until reviewed and explicitly approved.**
3. Create a **V47-specific Hosting directory** containing only the Spark prototype, its required `src/v47/` browser modules, and a V47-only Firebase Web config loader. Never host the entire repository or publish private files. Keep Web App configuration restricted to the separate V47 project ID and auth domain.
4. Prepare a **separate V47-only Firebase configuration** (not the root `firebase.json`) with a static Hosting target and the reviewed V47 rules. Explicitly select the V47 project in any CLI command; never rely on the default project.
5. Only after staging authorization and rules review, deploy to the V47 project. Record its actual HTTPS Hosting URL; do not claim a URL exists before verifying it.
6. Perform real browser tests: platform-admin login, pending school registration and activation, two-school isolation, invitation acceptance, assignment permissions, viewer read-only, student/marks/attendance and sign-out.
7. Complete V46 feature parity (ECD–12, IEMIS 2083, CDC calculations, ledger/grade sheet/print, PWA/APK) and representative **read-only** migration dry runs. Back up and verify rollback before any data movement.

## Current decision
**HOLD** — no live V47 staging deployment, no confirmed V46 feature parity, no real data migration or production release. Never modify V46 production without explicit permission.
