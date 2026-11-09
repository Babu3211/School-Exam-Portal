# IEMIS comparison — 2026-11-09

Reference: authenticated school UI at `https://emis.cehrd.gov.np/`. Read-only inspection; no marks saved, submitted, edited or exported. No student identities are included in this report or test fixtures.

| View | Observed IEMIS format | Implementation |
| --- | --- | --- |
| Markwise Ledger | S.No., School Name, School Code, Student Name, Symbol Number; primary subjects each have one marks column; Grade VI Final has IN/TH pairs | New default read-only IEMIS renderer; Grade VI subject order starts with local subject and ends with Computer Science |
| Gradewise Ledger | Adds DOB, Father Name and Mother Name; Grade VI has IN/TH/Total grades and Final GPA; primary subjects each have one grade | New default renderer with separate component grades, final grade and component-credit GPA |
| Grade Sheet | Primary: subject/CH/GP/grade/remarks; VI: TH/IN lines and final grade/remarks; IX: grade before GP; signatures and grade scale | Paired subject lines, per-view subject ordering and verified component-credit calculation integrated into the existing Grade Sheet renderer |
| Mark Entry Ledger | All nine combinations of 2083 Classes 1/6/9 and First/Second/Final terms were opened. Selecting the subject All checkbox exposes editable subject columns. | Added editable all-subject grid with subject/student selection, IsAbsent, per-term components, dirty-only saves and conflict checks. Original single-subject entry and Excel import/export remain. |

Confirmed reference examples: Grade VI component-credit GPA rounds to 2.93; Grade IX rounds to 2.52. Final subject letters use the component-weighted GP bands, rather than mapping the raw combined marks percentage again. Primary sheet totals 30 CH, VI 36 CH and IX 32 CH in the inspected examples; these are school configuration values, not hardcoded defaults in the renderer.

The Markwise, Gradewise and Grade Sheet subject orders differ in IEMIS. The VI Markwise order reverses the seven core subjects with Computer Science last; the VI Grade Sheet has Computer Science first; the Grade Ledger has Nepali first. Only existing subjects are sorted; missing subjects/credits are never invented or written back.

The original detailed assessment renderer remains available by turning off **IEMIS format**. The Mark Entry Ledger remains a read-only report; the Marks Entry page now has a separate editable IEMIS grid with its original single-subject view available. Mark entry, result publication, question papers, PWA installation and the prior V44/V45 fixes remain available. Existing-record read/write permissions remain scoped to the assigned teacher. Active subject teachers can additionally check an unused marks document ID before creating it in a transaction; this reveals no student record. Anonymous and inactive accounts cannot perform that missing-ID check.

## Unresolved reference discrepancies / release hold

- An inspected historical primary NG result displayed GP values 2.4, 3.2, 0, 0, 3.6, 4 with CH values 5, 4, 4, 8, 5, 4 (total 30), but displayed GPA 1.65. Straight weighting of the displayed figures gives 1.96. Do not silently reproduce an unexplained historical value or modify source marks to make it fit. Existing conservative NG behavior remains pending clarification.
- Mark Entry column verification is now complete for the requested representative classes/terms: Classes 1–5 have IsAbsent/count/Full Marks/obtained achievement in every term; Classes 6–8 use 4/36/10 and add final TH 50; Classes 9–10 use 3/16/6 plus final TH 75, with Computer practical 41 and TH 50. Third term remains supported.
- The original main rules showed expression-budget denials for custom multi-component Teacher writes. Follow-up bounded per-size validators and an equivalent cached active-role check now pass create/read/update/absence tests for all 1–6 custom components, in addition to verified IEMIS templates. Wrong types, missing fields, extra keys, totals, bounds, 80-character limits and absence are denied by regression tests. Legacy Admin access remains.
- Clicking IEMIS Print did not expose a print dialog in this Cloud Browser. Exact paper size, pagination and PDF parity remain unverified.
- Grades XI/XII were not verified against an enrolled school cohort. Their existing portal behavior is preserved, without claiming new parity.

Do not merge/deploy to production while these material comparison checks remain unresolved. Trial browser QA uses synthetic data only and connects to neither IEMIS nor Firebase. Trial workflow generates `qa/iemis-layout.html` and `qa/iemis-entry.html`; a clean production checkout does not contain these generated pages.

## Save safety

The grid writes only dirty, selected, authorized student/subject cells after two confirmations. All payloads are checked before the first write. Transactions check prior record versions and preserve record identity; known IEMIS component names/order are normalized only on an explicit user Save, without changing their numeric values. Student groups are committed atomically in batches of at most ten students to stay within rule-access limits. If a later batch fails, the UI reports exactly how many records saved and retains unsaved drafts. Absence is a validated optional boolean, never a silent zero grade. Learning-achievement totals use count × 4 and the actual obtained value; no old records are bulk-migrated.

## Verification evidence

Candidate commit `9ee49f5ca8253a652f07db83010e52b372752984` passed both V44/V45 JavaScript and Firestore Security workflows (runs 42621468643 and 42621468701), and the trial hosting workflow (42621466466). Local inline syntax, V44 requirement preservation, IEMIS ledger/entry, question-paper, and Firestore emulator tests passed. The emulator executed the actual portal save controller with 12 synthetic students, including Save/Reload/Update/Reload. No production marks were changed.

Cloud Browser checked the editable synthetic preview for all nine Class 1/6/9 × First/Second/Final combinations. Primary achievement count 3 derived full marks 12; obtained 14 was rejected without capturing records; obtained 10 saved exactly one changed student/subject. IsAbsent saved null component marks. Class IX final theory 76/75 was rejected; 70 saved only that subject, and repeated Save reported no changed marks. An unassigned optional subject displayed N/A. Browser console entries observed were extension metadata errors, with no application-origin errors observed.

Synthetic trial: https://exam-portal-smss-95016--v45-trial-0ratcjng.web.app/qa/iemis-entry

The Print button and native Ctrl+P did not expose a print dialog in this Cloud Browser; actual PDF output remains unverified. The current browser inventory no longer contains the authenticated IEMIS tab, so further authenticated reference checks require a new secure sign-in. This does not invalidate the nine earlier observed entry structures, but prevents further NG/PDF reference inspection in the current session.

## Dashboard navigation follow-up

After secure sign-in resumed, observed IEMIS Home, School Profile, Student Record, Manage Exam, Teacher | Staff, Reports and Settings. Navigation uses Poppins 12.8px, text RGB(62,70,91), active RGB(218,223,239), and header RGB(98,89,202). Matching SMSS modules now follow this relative order and those labels. The Manage Exam links follow the observed relative order: Sub Management(1-8), Subj Management(9-12), Marks Entry(1-12), Update Published Result, Mark wise ledger, Grade wise ledger, Grade Sheet. Mark Entry Ledger and existing SMSS-only functions remain accessible after these links. Both subject-management links open the existing class/subject manager, which retains its full class selector. Ledger links select their respective report modes directly.

This is navigation alignment for existing SMSS functions, not a claim to implement unrelated IEMIS EIE, PMT, disability, infrastructure, transfer, scholarship, or government request workflows. Those unsupported modules are not represented by misleading links. School Profile opens existing School Settings. Teacher and Staff retain the combined existing manager. Official Grade Sheet print fonts are not changed by the navigation theme. Mobile keeps 44px targets. The trial-only synthetic navigation preview is generated from actual application CSS, menu and renderers. No production data is used.

## Final confirmation follow-up

Authenticated Grade Ledger and Grade Sheet both display the same historical primary NG GPA (1.65), whereas weighting their displayed component grade points by their displayed credit hours gives 1.96. The Markwise ledger confirms that primary values are achievement totals rather than ordinary marks out of 100. The reference achievement-count and derived-full-mark inputs still need inspection before choosing an explanation. IEMIS returned to its login page when proceeding to that inspection; no credentials or real marks were read through an alternate channel and no Save/Submit was performed.

Legacy custom Teacher assessments were reproduced against current rules: 4–6 components previously exceeded the evaluation budget. Fixed-size validation avoids repeated size/index expressions; the assigned-teacher role check reads active status in the same cached role data. The 1–6 component create/read/update/absence matrix now passes the emulator, with strict negative validation tests. Name regex preserves the existing 1–80-character limit including newlines; missing required fields fail their direct accesses; incompatible numeric types fail the bounded comparisons. No authorized class, subject or section is expanded.

A trial-only responsive wrapper renders actual navigation/page markup in phone (375px) and tablet (768px) iframe viewports, without Firebase or IEMIS. This tests responsive CSS, not native mobile PWA installation. Native Print and actual app installation still require a visibly successful browser/OS outcome; asset and manifest smoke tests alone are not described as installation confirmation.
