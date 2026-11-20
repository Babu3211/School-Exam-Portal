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

## V47 exam-term mapping and current safety boundary (2026-11-20)

- V47 `1st` maps to V46 `first`, `2nd` to `second`, `3rd` to `third`, and `final` to `annual` for **read-only component field previews** only. These are display mappings, not proof of identical saved results.
- `weekly` and `monthly` are V47 additions with no verified V46 component mapping for Classes 6–10; the preview refuses them instead of inventing marks structure.
- V47 Classes 1–10 simplified marks saves remain blocked until the verified V46 component writer, complete-class validation, CDC calculations and tenant-scoped rules are integrated and emulator-tested.
- The raw ledger is not a Grade Ledger and must not be used as a final result or Grade Sheet.
- V47 Firestore rule and index changes require independent publication to the V47 Firebase project; hosting-only preview does not publish them.

## Read-only V46 grade-band parity test

- `iemis-grade-preview.mjs` projects the grade bands and final-grade point mapping from the root V46 `iemis-ledger.js` source.
- `test-iemis-grade-preview.mjs` compares 10,001 percentage inputs and 4,001 grade-point inputs directly against V46 exports, plus invalid inputs. This does **not** verify V47 GPA, class-completeness, mark persistence, or Grade Sheet parity.
- School Admin can view a standalone grade-band example; it never saves marks or calculates a student result.

## V47 read-only calculation parity adapters (development only)

- `iemis-summary-preview.mjs` mirrors the V46 `iemisSummary` calculation and tests absent, incomplete, primary learning achievement, nonannual internal, annual internal/theory and grade boundaries against the real V46 source.
- `iemis-gpa-preview.mjs` mirrors `iemisGpa`, including credit-hour weighting, NG/incomplete fail-closed behavior, and primary vs annual distinction. Regression tests compare its output to V46.
- `test-iemis-schema-source-parity.mjs` compares all Classes 1–10, four mapped terms and English/Computer field structures directly with V46 `iemisEntrySchema` (80 combinations).
- These are isolated, read-only functions. **No class-wide IEMIS writer, grade ledger, grade sheet, print workflow, or production deployment is authorized by these tests.**

## Read-only entry draft and value parity

The V47 preview helpers `iemis-component-key-preview.mjs`, `iemis-entry-draft-preview.mjs`, and `iemis-entry-values-preview.mjs` replicate V46 component recognition, existing-record draft conversion, and draft-to-score validation without Firestore writes. Direct source parity tests compare against V46 `iemisComponentKey`, `iemisEntryDraft`, and `iemisEntryValues` across primary and secondary classes, first/second/third/final terms, and malformed/absent values. These helpers are not a production marks writer; do not enable V47 classes 1–10 simplified marks save until authorized tenant-scoped class-wide save, source parity, and real preview tests pass. Firestore rules and indexes must be published separately after review.

## Confirmed project decision — V46 IEMIS is the baseline (2026-11-20)

The school owner confirms that the V46 IEMIS implementation has already been fully checked. For V47, **reuse V46 behavior and presentation as-is**, including Mark Entry Ledger, Mark Ledger, Grade Ledger, Grade Sheet, CDC grades/GPA, NG rules, subject order, and print/watermark layout. Do not redesign the reports or demand another IEMIS comparison as a prerequisite to reusing the confirmed V46 implementation.

V47 work is an **adaptation**, not a replacement: wrap the existing V46 implementation in tenant-scoped data loading, authorization and write safeguards under `schools/{schoolId}`. Preserve V46 functions and calculation semantics; compare migrated V47 output to V46 regression fixtures, and retain full-class validation. Any current V47 print preview is a development-only scaffold, **not** the accepted V46 print layout, and should be replaced with the V46 renderer when integrating the workspace.

This confirmation does not mean the V47 tenant-specific integration, Firestore permissions or deployment have passed testing. Keep V46 production untouched and never deploy V47 production without explicit approval.
