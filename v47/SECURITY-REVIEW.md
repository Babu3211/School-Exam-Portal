# V47 Security Review — deployment blocker

- All rules here are V47-only. Production V46 remains untouched.
- Super Admin bootstrap: provision `v47_super_admins/{uid}` through trusted Firebase Console/Admin SDK, never client writes.
- School collection listing is restricted to Super Admin. Other roles must read a known school document, not query all schools.
- Inactive schools deny ordinary membership access. Viewer is read-only. Teacher writes are disabled pending class/subject assignment rules.
- School deletion is denied to prevent orphaned subcollections.
- A school administrator can manage teacher/viewer members but cannot create, edit, or delete school-admin memberships.
- Emulator rules tests must pass, followed by a manual review and full app migration before deployment.
- Firestore rule checks are necessary but insufficient: validate every school-scoped path, all write schemas, query patterns and migration compatibility.
- The V47 main portal is not yet integrated; do not publish the dedicated rules or call this production-ready.
