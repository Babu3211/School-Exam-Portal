# Run V47 foundation checks

From repository root, with Node.js 22 or later:

```sh
node v47/test-school-scope.mjs
node v47/test-school-registry.mjs
node v47/test-registry-schema.mjs
node v47/test-tenant-query.mjs
node v47/test-rules-integrity.mjs
```

These tests cover path and data-shape logic only. They **do not** prove that the Firestore rules compile or enforce authorization. Firestore emulator tests must be implemented and pass before any deployment.
