# V47 release blockers (as of development branch)

1. Confirm Firestore rules compile and the emulator isolation suite passes on GitHub Actions.
2. Verify browser console sign-in against V47-only Firebase; never point at V46.
3. Verify inactive-first school registration, first Admin membership, activation and pagination with a test school.
4. Implement teacher assignment-aware marks and attendance writes with explicit rules and emulator tests.
5. Verify V46 feature parity in V47: CDC GPA, IEMIS 2083 ledgers, grade sheet, attendance, PWA, viewer read-only.
6. Test multiple schools, realistic 300–1500 student rosters and Spark-plan quotas.

No V47 production deployment until blockers are resolved. V46 production is excluded from these tests.
