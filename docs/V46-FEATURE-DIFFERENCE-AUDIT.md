# SMSS V46 — verified feature-difference audit (2026-11-12)

## Scope and release decision
User authorizes eventual single V46 on `main` and Firebase/GitHub Pages/APK, but requires **zero loss of previously successful work**. Integration branch `smss-v46-integration` is NOT ready to merge/deploy. Preserve V44/V45 refs as rollback until verified.

## Source inspection — `index.html` (GitHub fetched directly)
| Check | main | smss-v45-work | V46 currently |
| --- | --- | --- | --- |
| File length (characters) | 471502 | 418087 | 471502 |
| `window.roleHas=roleHas` | yes | yes | yes |
| `isViewer` identifier | not found | present | not found |
| `idleLogout` identifier | not found | present | not found |
| `userActivity` identifier | present | present | present |
| `loadStudents(` references | 11 | 11 | 11 |
| `loadAttendancePage(` references | 5 | 6 | 5 |

**Correction after deeper inspection:** These are only identifier-presence signals, not functional tests. The `main`/V46 index DOES import `idle-logout.js`, calls `initIdleLogout`, contains viewer references and `rolePageAllowed`. Absence of the exact `isViewer` and `idleLogout` identifier names does **not** prove missing functionality. Compare behavior and security before concluding a regression. The shared `idle-logout.js` content is identical on main and V45. Do not transplant V45 code based on names alone.

GitHub `main...smss-v45-work` comparison: diverged, 285 commits ahead / 344 behind; 22 files differ. The 22 include `index.html`, `firestore.rules`, `sw.js`, `firebase.json`, `manifest.webmanifest`, `cdc-question-paper.js`, `idle-logout.js`, `user-activity.js`, tests and workflow files.

## Recovered project requirements from prior conversations
- Student records previously described as 193 and staff as 24: these are **historical claims, not a current database count**; never modify real data to match counts.
- Teacher bulk import previously prepared for 14 teacher records; no passwords should appear in repo, handoff or test logs.
- Viewer can view permitted details/results/reports/roles/settings but never Add/Edit/Delete/Save/import/restore. Teacher access restricted to assignments; role IDs and mapping must be retained.
- Fix class-selection/Show Students and attendance auto-load without pressing Refresh; parallel data loads must not block Dashboard on School Settings.
- IEMIS 2083 grade structures and CDC NG/GPA; 1–5 like class 1, 6–8 like 6, 9–10 like 9; 9–10 Computer 4/36/10; grade-sheet page-wide repeated watermark.
- School branding Nepali and English on login, exam navigation English; approved HD PWA/APK icon, top install prompt without Later; auto hide on install.
- All old marks, students, attendance, staff, user roles and school settings retained; no destructive migrations.
- Both GitHub Pages old URL and Firebase Live must serve the final portal. Android APK and iPhone PWA must be verified after release.
- Manual role/browser end-to-end testing, Firebase security emulator, CDC/IEMIS regression, PWA, import transaction consistency, print and rollback evidence required.

## Immediate V46 tasks
1. Compare user-role handling, idle-logout, auto-loading and PWA code from both branches; resolve conflicts **function-by-function** and test each change.
2. Verify existing deployed V45 state and GitHub Pages separately; do not assume previous green Actions run proves browser login.
3. Prevent V44/V45 workflows from overwriting the final V46 live release; migrate to one audited V46-only production pipeline.
4. Record tests and commit SHA in this file before V46 promotion to main.

## Chat continuity
In a new conversation, start with `docs/V46-SINGLE-SOURCE-OF-TRUTH.md` and this audit. Do not reimplement login in isolation, blind-merge or run a V45 production release. Update these records as work is completed.
