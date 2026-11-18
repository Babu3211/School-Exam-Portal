# V47 Firestore emulator test plan (70 assertions authored; execution not yet verified)

1. Seed two active schools A/B using emulator security-disabled setup context.
2. Seed Super Admin and one active school_admin, teacher, viewer per school, with inactive counterparts.
3. Assert anonymous read/write denied everywhere.
4. Assert school A viewer cannot read or write any school B document, including nested paths and collection queries.
5. Assert school A teacher cannot write marks or attendance until teacher assignment rules are implemented.
6. Assert school A viewer cannot create/update/delete students, marks, attendance, or settings.
7. Assert inactive school and inactive membership deny data access.
8. Assert forged membership with mismatched uid or schoolId denies access.
9. Assert only Super Admin can create inactive schools and change activation; clients cannot self-provision Super Admin.
10. Assert school admin can provision only inactive teacher/viewer memberships, cannot self-promote or change roles, and cannot provision in other schools. Assert arbitrary top-level and nested paths denied; run all cases against `v47/firestore.rules`, not V46 rules.

The automated suite is `node v47/test-firestore-emulator.mjs` inside the dedicated V47 Firebase emulator CI job.\n\nDo not grant teacher writes from client assignment arrays: school-role guards intentionally fail closed until rules are implemented.\n\nDo not claim these tests passed until a real Firebase emulator run reports success. Do not deploy V47 rules without explicit approval.

Static code checks and the 70 emulator assertions are not substitutes for a successful CI run. Verify GitHub Actions logs and Firebase emulator outcomes before deployment.
