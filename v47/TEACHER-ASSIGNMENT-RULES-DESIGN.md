# V47 teacher assignment authorization — not yet enabled

Proposed assignment schema: `schools/{sid}/subject_assignments/{assignmentId}` with fields `schoolId`, `teacherUid`, `className`, `subject`, `section`, `active`. Assignment IDs must be deterministic and Firestore-safe before rules use them. Do not treat the human-readable key from the helper as a persisted document ID.

Before enabling teacher writes, implement Firestore rules that check the authenticated teacher UID, active membership, active school, trusted assignment document, immutable record identity, student class/section, and bounded mark values. Assignments may be created only by school admins. Test cross-school, cross-class, cross-subject, inactive assignment, forged assignment, viewer write, and unauthorized update paths in emulator.

Current V47 rules intentionally deny teacher writes to marks and attendance. This file is a design contract, not a working permission grant.
