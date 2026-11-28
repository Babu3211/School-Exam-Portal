# V47 Spark-compatible local runtime (development only)

Firebase Hosting on Spark serves static browser assets; it cannot run this Node API. Firebase Cloud Functions/Cloud Run integration requires a billing-enabled project. Do not upgrade to Blaze without explicit owner approval.

A school-owned, already available computer can run the built UI and the isolated API on one origin, without deploying a paid Firebase compute service. This is a development option, **not a verified production hosting solution**. A continuously available machine, independently secured HTTPS reverse proxy for remote users, Firebase authorized domains, credential protection, backups, quota checks and release approval are still required. No public server or DNS is configured by this change.

From the repository checkout:
```sh
node v47/build-hosting.mjs
npm install --prefix v47-runtime --no-package-lock --no-audit --no-fund
V47_FIREBASE_PROJECT_ID=smss-exam-portal-v47 V47_SERVE_BUILT_UI=true npm --prefix v47-runtime start
```
Requires appropriately scoped V47 Application Default Credentials on that computer; never commit keys or place them in dist. Default binding is loopback port 8080. Open http://127.0.0.1:8080 locally. Firebase Auth must allow the local origin. Do not use V46 credentials or data. The runtime refuses non-loopback binding. A reverse proxy must not expose debug endpoints, credentials or other machine services.

After starting the existing local runtime, verify that you reached the Node process rather than Firebase static Hosting:
```sh
curl --fail --silent --show-error http://127.0.0.1:8080/api/v47/runtime-status
```
The response must be JSON with format `smss-v47-runtime-status-v1`, version `V47`, and publicationEnabled, atomicAttendanceEnabled, productionReady and cdcGradeApproved all false. A static HTML response, network failure or different format is not a runtime confirmation. This probe makes no Firebase requests and exposes no school data. It is not a credential, connectivity, quota or production acceptance check.

The marks staging, final publication and atomic attendance write routes remain disabled in this runtime until audited release approval. Existing development endpoints retain their respective authorization gates. No billing, production deployment or data migration occurs here. Firestore read/write/storage quotas still apply across all schools in the project.

References: https://firebase.google.com/docs/hosting/serverless-overview and https://firebase.google.com/docs/firestore/quotas
