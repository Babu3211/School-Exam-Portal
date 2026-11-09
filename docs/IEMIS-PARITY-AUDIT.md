# IEMIS comparison — 2026-11-09

Reference: authenticated school UI at `https://emis.cehrd.gov.np/`. Read-only inspection; no marks saved, submitted, edited or exported. No student identities are included in this report or test fixtures.

| View | Observed IEMIS format | Implementation |
| --- | --- | --- |
| Markwise Ledger | S.No., School Name, School Code, Student Name, Symbol Number; primary subjects each have one marks column; Grade VI Final has IN/TH pairs | New default read-only IEMIS renderer; Grade VI subject order starts with local subject and ends with Computer Science |
| Gradewise Ledger | Adds DOB, Father Name and Mother Name; Grade VI has IN/TH/Total grades and Final GPA; primary subjects each have one grade | New default renderer with separate component grades, final grade and component-credit GPA |
| Grade Sheet | Primary: subject/CH/GP/grade/remarks; VI: TH/IN lines and final grade/remarks; IX: grade before GP; signatures and grade scale | Paired subject lines, per-view subject ordering and verified component-credit calculation integrated into the existing Grade Sheet renderer |
| Mark Entry Ledger | Entry identity columns are S.N, Student Name, Regd. No., Symbol No.; inspected selections did not expose subject-entry columns | Added read-only all-subject component register with these identity columns. Original single-subject entry and Excel import/export remain. Exact entry assessment-column parity is NOT VERIFIED |

Confirmed reference examples: Grade VI component-credit GPA rounds to 2.93; Grade IX rounds to 2.52. Final subject letters use the component-weighted GP bands, rather than mapping the raw combined marks percentage again. Primary sheet totals 30 CH, VI 36 CH and IX 32 CH in the inspected examples; these are school configuration values, not hardcoded defaults in the renderer.

The Markwise, Gradewise and Grade Sheet subject orders differ in IEMIS. The VI Markwise order reverses the seven core subjects with Computer Science last; the VI Grade Sheet has Computer Science first; the Grade Ledger has Nepali first. Only existing subjects are sorted; missing subjects/credits are never invented or written back.

The original detailed assessment renderer remains available by turning off **IEMIS format**. The new Mark Entry Ledger is read-only. Mark entry, result publication, question papers, PWA installation and the prior V44/V45 fixes remain available. No Firestore permissions are broadened.

## Unresolved reference discrepancies / release hold

- An inspected historical primary NG result displayed GP values 2.4, 3.2, 0, 0, 3.6, 4 with CH values 5, 4, 4, 8, 5, 4 (total 30), but displayed GPA 1.65. Straight weighting of the displayed figures gives 1.96. Do not silently reproduce an unexplained historical value or modify source marks to make it fit. Existing conservative NG behavior remains pending clarification.
- The inspected IEMIS Mark Entry selections either had no students or showed identity columns without subject-entry columns. Full entry-column and assessment-template parity cannot yet be claimed.
- Clicking IEMIS Print did not expose a print dialog in this Cloud Browser. Exact paper size, pagination and PDF parity remain unverified.
- Grades XI/XII were not verified against an enrolled school cohort. Their existing portal behavior is preserved, without claiming new parity.

Do not merge/deploy to production while these material comparison checks remain unresolved. Trial browser QA uses synthetic data only and connects to neither IEMIS nor Firebase. Trial workflow generates `qa/iemis-layout.html`; a clean production checkout does not contain this generated page.
