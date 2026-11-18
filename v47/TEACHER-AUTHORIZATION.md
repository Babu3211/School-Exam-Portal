# V47 teacher authorization — required before live enablement
Teacher-write contract, role-capability helpers, and school-role guards are **client-side validation only**. They do not grant access.

Rules must verify: active school, active teacher membership for the exact school, teacher's class+subject+section assignment from a trusted school-scoped document, matching student class/section, record school ID, permitted marks fields, and immutable identity fields. Never trust a client-provided assignment list or selected school.

Current V47 Firestore rules intentionally deny teacher marks/attendance writes. Keep that fail-closed behavior until Firebase emulator tests prove all checks. Test forged teacher membership, viewer writes, cross-school reads/writes, cross-class writes, absent assignment, disabled school, and arbitrary nested paths. No production deployment without separate approval.

`canWriteSchool` and `authorizeSchoolAction` both intentionally deny teacher writes until the Firestore rules implement verified assignments.
