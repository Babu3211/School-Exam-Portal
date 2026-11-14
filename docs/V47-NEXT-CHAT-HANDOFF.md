# V47 continuation handoff — 2026-11-14

## Non-negotiable production boundary
- V46 is the real school production portal at https://exam-portal-smss-95016.web.app/ and Android APK.
- DO NOT edit, merge to, or deploy V46/main, APK, Firebase Hosting, production Firestore rules, or real data without explicit user approval.
- Work ONLY on branch `smss-v47-multischool-work` in `Babu3211/School-Exam-Portal`.
- User works on iPhone, wants actual GitHub commits and concise Nepali updates.

## Current verified status
- Last verified V47 Actions run **43540870453** for commit `fd333f1384f78e8915076a2c9ff1e344e66c5034` completed **success**.
- Workflow: `.github/workflows/v47-development-checks.yml`; it runs isolated Node tests, Firestore emulator isolation, and V46 preservation tests. It never deploys.
- This is isolated prototype test success, NOT proof that V47 is production-ready.

## Implemented isolated V47 modules
- Tenant domain, roles, subscriptions, onboarding, verified school sessions, server-only membership and school data path policy.
- V46 collection inventory and dry-run migration planner; 17 root collections mapped to school-scoped paths, but no real migration executed.
- Prototype Firestore rules and emulator tests, NOT approved production rules.
- Verified read-only marks and attendance HTTP handlers and Admin SDK read gateway.
- `src/v47/verified-school-dashboard.mjs`, `dashboard-http-handler.mjs`, `dashboard-client.mjs`.
- `src/v47/marks-attendance-client.mjs` and `school-workspace-controller.mjs` with stale cross-school read protection.
- `src/v47/school-workspace-view.mjs`: isolated browser DOM screen (school ID, dashboard, marks, attendance).
- `src/v47/firebase-workspace-auth.mjs`: Firebase current-user token bridge.
- `src/v47/mount-firebase-workspace.mjs`: explicit auth-state subscription, clears school data on logout/account change.
- Corresponding scripts/test-v47-* tests are wired into the V47 development workflow.

## Important unfinished work (in priority order)
1. **Real integration audit**: V46 `index.html` is monolithic, with root Firestore access. Inspect actual V46 attendance and marks schema/query code, especially `attendanceType` filter assumptions; do not claim compatible without proof.
2. **Production-safe server runtime**: V47 HTTP handlers are framework-neutral only. Add an isolated deployable server package and test end-to-end locally, without deploying or touching V46.
3. **V47-only UI entrypoint**: current DOM view is not mounted in an actual served page. Build a separate V47 entrypoint using existing Firebase config, without modifying `index.html` or production Hosting.
4. **Multi-school discovery/login**: authenticated membership list must be server-derived and safely paginated/scoped. Current UI requires manual school ID.
5. **Real migration plan**: test dry run against backup/export, handle actual V46 schema and security, preserve all 17 collections, avoid overwriting data.
6. **Authorization, CDC/IEMIS, role parity, teacher assignments, school registration/billing**: complete integration and realistic E2E tests.
7. **Only after all tests** request explicit user approval for any V47 staging/prod deploy. Never deploy by default.

## User's product requirements
- V47 multi-school, sole Super Admin, own school free, other schools custom annual fees.
- Each school has isolated students/marks/attendance/settings and school admin/teacher/viewer roles; viewer always read-only.
- Preserve V46 features: ECD through class 12, CDC/IEMIS 2083 calculations, computer subject class 9–10 4/36/10, PWA/APK, English exam menus, bilingual school identity.
- Never alter live V46 or real school data.

## Workflow for next chat
- Open this file directly from GitHub branch, verify latest Actions run and commit.
- Do substantive coding in V47 branch, add tests, check Actions conclusions, report factual status in concise Nepali.
- Do not start a new portal from scratch.
