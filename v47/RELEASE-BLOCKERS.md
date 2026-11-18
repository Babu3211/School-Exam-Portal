# V47 release blockers (as of development branch)

1. Confirm Firestore rules compile and the emulator isolation suite passes on GitHub Actions.
2. Verify browser console sign-in against V47-only Firebase; never point at V46.
3. Verify inactive-first school registration, first Admin membership, activation and pagination with a test school.
4. Implement teacher assignment-aware marks and attendance writes with explicit rules and emulator tests.
5. Verify V46 feature parity in V47: CDC GPA, IEMIS 2083 ledgers, grade sheet, attendance, PWA, viewer read-only.
6. Test multiple schools, realistic 300–1500 student rosters and Spark-plan quotas.

No V47 production deployment until blockers are resolved. V46 production is excluded from these tests.

## Final acceptance gate
Do not interpret new test cases or committed source as proof that tests passed. Verify the V47 GitHub Actions workflow conclusion is **success** on the exact release commit. Run the Super Admin console in a real browser against the separate V47 Firebase project and record a successful two-school isolation test. Confirm school-admin marks/attendance flows and full V46 feature parity before any V47 hosting release. No deployment to V46 or main from this development branch.

## Verified CI checkpoint — 2026-11-18

Commit `780dac79e4818d09b556da695eca62e947060f23` passed all four triggered workflows:
- V47 isolated module checks — run 44343625068: success
- V47 isolated security tests — run 44343625175: success
- V47 Firestore isolation — run 44343624907: success
- V47 Multi-School Development Checks — run 44343624977: success

This verifies the current automated checks for rule compilation, tenant isolation, and assignment-aware teacher mark/attendance correction. It does **not** establish live V47 Firebase sign-in, browser-based two-school testing, full V46 feature parity, or Spark-scale performance. Keep release blockers 2, 3, 5, and 6 open; blocker 4 has emulator coverage but still requires browser confirmation. Never deploy to V46 production/main from this branch.

## Expanded CI checkpoint — 2026-11-18

Commit `8124ec9372b22be3c7e789c74b7f8f0534aa450c` completed **six of six workflows successfully**:
- Tenant foundation — 44349440872
- Firestore isolation — 44349440500
- Isolated security — 44349440829
- Unit/security contract — 44349440864
- Module checks — 44349440748
- Multi-School Development — 44349440459

Offline pagination simulations now cover 1,500 records in one school and 30 schools with 500 records each (15,000 simulated records total). These are correctness simulations, **not** live Firestore performance, billing-quota, or cross-school production tests. Browser sign-in, real two-school isolation, V46 feature parity, and real-scale Spark quota measurements remain open release gates.
