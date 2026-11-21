# V47 release parity audit — 2083

This is a tracked engineering checkpoint, not production approval. Do not repeat completed IEMIS-ID / XLSX fixture repairs.

## Verified on branch commit a5d06659

- V47 isolated module checks: PASS.
- V47 isolated security tests: PASS.
- V47 Firestore isolation: PASS.
- V47 Multi-School Development Checks: PASS.
- Regression baseline runs first in the module-check workflow and prevents reintroducing legacy school IDs or CSV export expectations.

## Source comparison with V46 production `main`

- Shared root assets `cdc-question-paper.js`, `idle-logout.js`, `manifest.webmanifest`, and `firebase.json` had identical Git blob IDs at audit time.
- `index.html`, `iemis-entry.js`, `iemis-ledger.js`, `sw.js`, and root `firestore.rules` differed. Differences are **not** proof of a regression; review functionality before attempting any copy or merge.
- V47 uses isolated `v47/firebase.json` and `v47/firestore.rules`; never deploy root Firebase config as the V47 tenant rules.

## Blocking work (do not mark complete by changing tests)

1. V47 `marks-entry-console.mjs` explicitly disables Save/Publish; the UI is not a production marks-entry replacement.
2. V47 `class-mark-save.mjs` supports at most **three students**; this does not satisfy normal 300–1,500-student school use.
3. V47 `firestore.rules` denies writes to `marks` and `component_marks` until an audited complete-class publish mechanism exists. Do not weaken the deny rules merely to obtain green CI.
4. Compare V46 CDC/IEMIS entry, mark ledger, grade ledger, grade sheet, attendance, imports, roles, PWA and APK workflows against the **actual built V47 user experience**; isolated module success does not establish parity.
5. Run `node v47/build-hosting.mjs`, emulator tests, and `npm run test:v47:release` for release readiness. The release gate is intentionally blocking until critical functionality and sign-off exist.

## Working rules

- Preserve V46 production and real school data.
- Prefer adapting verified V46 workflows behind tenant-scoped access instead of rewriting them.
- Keep school IDs numeric IEMIS strings and user-facing selection labels in English; notifications may be Nepali.
- Any new feature must include authorization, cross-school denial, class completeness and regression tests before staging deployment.
