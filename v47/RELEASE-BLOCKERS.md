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
