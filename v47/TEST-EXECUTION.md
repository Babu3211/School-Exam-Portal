# V47 test execution (no production deployment)

## Run the offline checks
```sh
node v47/run-unit-checks.mjs
```
The runner prints PASS/FAIL for each of nine suites and exits nonzero if any suite fails.

## Run Firestore rules emulator checks
From the repository root, with Node 22 and Java 21 installed:
```sh
npm install --no-package-lock --no-audit --no-fund
npx firebase emulators:exec --project smss-v47-emulator-tests --only firestore --config v47/firebase.emulator.json "node v47/test-firestore-emulator.mjs"
```
This runs against a local emulator only; it does not deploy Firestore rules or modify the V46/V47 cloud projects.

## GitHub Actions
Workflow: `.github/workflows/v47-isolated-checks.yml`. It triggers on pushes to `smss-v47-multischool-work` and has an optional manual workflow_dispatch trigger. Inspect both job conclusions and logs in the repository Actions tab. A committed test file is **not** evidence that the test passed. Do not deploy while either job is unverified or failing.

## Known release blockers
Teacher write permissions are intentionally denied by Firestore rules; audited delete workflow, recoverable backups, real V46 feature parity and multi-school end-to-end UI testing are incomplete. V46 production must remain untouched.
