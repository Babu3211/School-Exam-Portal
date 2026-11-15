# V47 staging setup — isolated project

**Project:** `smss-exam-portal-v47` (user-confirmed Firebase Auth, Firestore and web app)
**Do not touch:** `exam-portal-smss-95016` (existing V46 production).

## Completed by school owner (reported, not independently verified)
- Separate Firebase project created; Web App registered.
- Email/Password Authentication enabled and initial Auth user added.
- Firestore default database created with deny-all client rules.
- Initial `platform_admins/{auth_uid}` document created with boolean `active: true`.

## Important runtime architecture
- Browser Firebase configuration is not a server credential.
- `v47-runtime/server.mjs` uses Firebase **Admin SDK** with `applicationDefault()`; it requires a trusted server runtime and separately provisioned server identity/credentials.
- Deny-all Firestore client rules remain in place: browser should not read or write Firestore directly. The trusted server verifies ID tokens and platform/school membership for each API request.
- `prototypes/v47/verified-workspace-staging.html` is **not** a deployed site. It requires an HTTPS host with a real `window.__SMSS_V47_STAGING_CONFIG__` injected before its module executes, same-origin `/api/v47/` proxy, and verified BS/AD date conversion functions.
- Firebase Hosting alone serves static files and does not execute this Node API. The existing free/Spark plan must **not** be assumed to support a managed server or Cloud Functions deployment without billing; confirm platform pricing and quotas before enabling anything.
- Never commit service-account JSON, private keys, user passwords or Firebase ID tokens.

## Required next actions
1. Choose an approved, cost-acceptable **separate trusted server host** for V47 staging; do not automatically enable billing or upgrade Firebase.
2. Configure the server's scoped identity with access to `smss-exam-portal-v47`, environment variable `V47_FIREBASE_PROJECT_ID=smss-exam-portal-v47`, and HTTPS reverse proxy forwarding `/api/v47/` to the V47 API. Do not expose Admin SDK credentials to the browser.
3. Publish the V47 staging HTML and its relative `src/v47/` modules under the same HTTPS origin as the API; inject staging-only Firebase Web App config and verified BS/AD adapters before the module runs.
4. Run `V47_STAGING_API_ORIGIN=https://<approved-staging-origin> node scripts/test-v47-staging-smoke.mjs` against that real host; then test authenticated onboarding, two-school isolation, viewer restrictions, V46 feature parity and backup/rollback.
5. Do not release to production until all gates in `docs/V47-FINAL-RELEASE-GATES.md` are met.

## Current state
**Not deployed.** GitHub automated tests pass, but they cannot establish a real hosting endpoint, server identity or production feature parity.
