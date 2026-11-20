# V46-verified CDC/IEMIS preservation contract for V47

V46 is the verified source of truth for CDC/IEMIS 2083. Do not invent or substitute generic theory/practical or GPA formulas during V47 multi-school migration.

## Verified implementation sources retained at repository root
- `iemis-entry.js`: class/term/subject-specific assessment component schemas, entry drafts, normalization and validation. Classes 1–5 use learning-achievement entries, not a generic theory/practical pair. Classes 6–10 have component-based entries; Class 9–10 Computer has the 4/36/10 component structure.
- `iemis-ledger.js`: existing subject ordering, mark ledger, grade ledger, grade sheet, grade bands, subject labels, component handling and presentation helpers. Reuse these exact functions after mapping tenant records into the verified V46 data shape.
- `index.html`: V46 screens and workflows, not a safe drop-in V47 page because Firebase paths/auth and roles differ.
- `scripts/test-iemis-ledger.mjs`, `scripts/test-iemis-entry.mjs`: preservation regression checks.

## Required integration gates
1. Identify and document V46 source record schema, terms and grade calculations for each class band (1–5, 6–8, 9–10) before migration.
2. Map V47 records only within `schools/{schoolId}/...`; never write V46 collections or change the production Firebase project.
3. Preserve existing V46 CDC/IEMIS calculations and subject order; do not infer a new GPA formula.
4. Make entry form depend on class, subject, term and component schema; reject incomplete and out-of-range components, and enforce full-class completeness before bulk save as V46 does.
5. Ensure mark ledger, grade ledger, grade sheet and printing produce the same results as V46 for the same test records.
6. Preserve viewer read-only and tenant isolation in Firestore rules; test cross-school denial with the emulator.
7. Run V46 IEMIS regression tests and V47 tenant tests before claiming parity.
8. No production deployment or copying real student marks without explicit authorization.

## Current status
The initial V47 school-admin `school-exam-workflows.mjs` has a provisional two-field marks form and raw ledger. This is NOT CDC/IEMIS parity. Saving that simplified form for Classes 1–10 is explicitly blocked until the verified V46 component workflow is integrated and tested. Existing test-school records are not automatically migrated or modified.
