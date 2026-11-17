# V47 emulator authorization acceptance matrix

The V47 Firestore rules are a **conservative draft** and have NOT been compiled or tested in the emulator. Never deploy these to V46 or V47 until the following tests pass.

1. Unauthenticated clients cannot read, list, create, update, or delete any school data.
2. A school A member cannot read or write school B documents by any direct path, forged data field, or query.
3. Viewer can read authorized own-school records but cannot write any record or change membership.
4. Teacher can read own-school records; teacher writes intentionally DENIED in the current baseline until assignment tests exist.
5. School Admin can create/update own-school students, marks, attendance and allowed settings but cannot delete or modify other schools.
6. Only Super Admin can create schools, activate schools, or grant/revoke membership. No browser can create super admin documents.
7. Disabled schools, inactive memberships and missing memberships cannot access school records.
8. Nested/unlisted collections are denied by default. Test all V46 feature paths before feature parity.
9. Reject malformed IDs and schema; test read queries and rules are not filters.
10. Record emulator logs and green CI before merging or deploying.

Note: the school registration document starts inactive. Only Super Admin can activate it after registration.
