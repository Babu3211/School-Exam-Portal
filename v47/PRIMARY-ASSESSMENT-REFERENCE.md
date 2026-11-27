# V47 primary assessment reference — 2083

Pinned from V46 `feat/v46-cdc-assessment-official-forms` commit `d1fd5622`, source blob `b300bc9d51ef3f2e026d9e6a3302d65da3e0979d`. Recomputed all 129 upper-primary counts against the corresponding V46 catalogue and denominator/page list. Lower-primary 30 Our Surroundings themes retain source main outcome counts, indicator groups and score blocks. No revised 2084 forms. Lower-primary other subjects and local subject remain explicitly pending. This is an authenticated reference page, not student assessment entry, persistence, official print or exam grading. No change to Firestore rules or marks.

# CDC assessment source register — V46

This is a reference register for continuing PR #81 without redoing previously mapped forms. It contains URLs and provenance, not PDF bytes. Academic year 2083 uses the 2076 guide for Classes 1–3 and the 2083 guide for Classes 4–5 in the current implementation.

## Classes 1–3 — Student Assessment Guide 2076
- CDC publication page: https://moecdc.gov.np/content/644/student-assessment-guide-for-basic-level-class/
- Previously used PDF mirror: https://ggess.edu.np/wp-content/uploads/2021/06/STUDENTS-EVALUATION-GRADE-1-3.pdf
- Supporting curriculum (not a replacement for the assessment guide): https://giwmscdnone.gov.np/media/pdf_upload/Basic%20Level%20%28Grade%201-%203%29%20Curriculum_vtgf727.pdf
- As of 2026-11-24 the assessment guide mirror could not be reopened. Prior mapping notes in index.html reference Grade 3 English PDF pages 114–123 and the first three Grade 1 Our Surroundings reference forms on PDF pages 128–130. Reinspect source before certifying wording, layout, or expanding the forms.

## Classes 4–5 — Student Assessment Guide 2083
- CDC publication page: https://moecdc.gov.np/content/646/guide-to-student-assessment-in-basic-level/
- Government CEHRD resource: https://learning.cehrd.gov.np/mod/resource/view.php?id=1032
- Alternate PDF: https://nilaram.com.np/site-assets/uploads/2026/07/Students-Evaluation-2083.pdf
- The government resource was opened 2026-11-24 and identified as the 149-page CDC guide. Cover and Annex 3(f) Health, Physical and Creative Arts opening forms for Class 4 (PDF page 123, printed 122) and Class 5 (PDF page 136, printed 135) were visually inspected. The printed page number is not the same as the PDF viewer page number.
- The user also supplied a file titled विद्यार्थी मूल्याङ्कन मार्गदर्शन २०८३_eorih3h.pdf in the project. Use the project source for comparison where accessible. No PDF binary has been committed yet.

## Release guard
Keep source documents distinct by grade band and year; do not relabel draft paraphrases as exact CDC transcription. The source register and reference links do not constitute verification of every digital assessment form. Preserve existing student data, role restrictions, and V46 production. Keep PR #81 in draft until source, print, persistence, and regression checks are complete.

## 2026-11-24 — alternative curriculum copy, Class 1 Our Surroundings
- Alternate CDC curriculum copy: https://www.collegenp.com/uploads/pdf/2020/03/syllabus-for-compulsory-subjects-from-grade-one-to-three-2076.pdf
- Annex 3(d) screenshots: PDF viewer page 145 (printed 138), school: 2 main outcomes, 12 indicators; page 148 (printed 141), creation: 2 main outcomes, 12 indicators; page 150 (printed 143), communication and market: 2 main outcomes, 8 indicators; page 151 (printed 144), immediate world: 3 main outcomes, 8 indicators.
- The final sample shows irregular indicator group sizes (8+4 and 4+1+3). Do not use the existing four-boolean record shape or fabricate missing indicators for these samples. These counts are reference-only pending comparison with the assessment guide. Class 1 subtotal across ten themes in current mixed-source catalogue: 26 main outcomes, raw maximum 104, 108 indicators; not an official certified total.
- Printed page 144 explicitly limits the curriculum sample forms to Class 1; use the separate assessment guide for Classes 2–3 and the applicable local curriculum for local subject assessment. Do not extrapolate counts.

## 2026-11-24 — NEW official revised curriculum (2082), Classes 2–3 Our Surroundings
- Government CEHRD resource: https://learning.cehrd.gov.np/mod/resource/view.php?id=1259 (259-page CDC curriculum, 2076 revised 2082). Cover, section 15, Annex 1 and all 20 Class 2–3 Our Surroundings forms were visually inspected. This is a newer curriculum, NOT the separate 2076 assessment guide. The latter's DOE archival URL https://www.doe.gov.np/assets/uploads/files/ff5cbec92ccb2b84a6c71bcbd8b71831.pdf also failed to open.
- The revised forms use individually rated outcomes, regular and additional-support date/score columns, remarks and percentage = sum / (4 × number of outcomes) × 100. They are materially different from the older four-binary-indicator grouped forms; never reuse old record IDs or silently reinterpret existing records. Confirm academic-year applicability before switching production. Printed pages 231–240 and 241–250; corresponding zero-based PDF indices 237–246 and 247–256.

| Theme | Class 2 outcomes | Raw max | Printed page | Class 3 outcomes | Raw max | Printed page |
|---|---:|---:|---:|---:|---:|---:|
| म र मेरो परिवार | 18 | 72 | 231 | 16 | 64 | 241 |
| मेरो दैनिक जीवन | 13 | 52 | 232 | 14 | 56 | 242 |
| हाम्रो समुदाय | 13 | 52 | 233 | 16 | 64 | 243 |
| मेरो विद्यालय | 13 | 52 | 234 | 11 | 44 | 244 |
| हाम्रा वरपरका सजीवहरू | 6 | 24 | 235 | 5 | 20 | 245 |
| हाम्रो वातावरण | 7 | 28 | 236 | 7 | 28 | 246 |
| मेरो सिर्जना | 8 | 32 | 237 | 7 | 28 | 247 |
| हाम्रो संस्कृति | 4 | 16 | 238 | 5 | 20 | 248 |
| सञ्चार प्रविधि र बजार | 5 | 20 | 239 | 4 | 16 | 249 |
| हाम्रो वरपरको संसार | 8 | 32 | 240 | 12 | 48 | 250 |
| Total (raw, not official subject grade) | 95 | 380 | | 97 | 388 | |

- These are the revised **theme-form** row counts, not the earlier 25 class-level curriculum outcomes. Do not combine revisions or add both totals. Class 1 revised forms and other subject forms still require separate comparison. The revised Annex 4 (printed 251, PDF index 257) also provides a progress report with learning achievement count and overall achievement level. This register is a source-verification checkpoint only; no new assessment entry, migration or production release is authorized by it.

### Academic-year applicability — critical release guard
The revised 2082 curriculum is scheduled for academic year **2084**, not 2083, per the CDC implementation notice reported on 2026-08-03 (https://shikshyakhabar.com/2026/08/03/18283 and https://www.ratopati.com/story/581974/new-social-studies-curriculum-to-be-implemented-up-to-grade-12). The government bulletin also records the council recommendation for 2084 implementation: https://giwmscdnone.gov.np/media/pdf_upload/Bulletin%202083g_9zk5fth.pdf. All revised theme counts above are **2084 reference only**; 2083 grade 2–3 theme counts remain unverified against the 2076 assessment guide. Keep the 2083 UI and persistence unchanged and do not substitute these counts into its summary. Future 2084 forms need an independent catalogue and record version.

## 2026-11-24 — Original 2076 guide recovered; 2083 source blocker resolved
- Alternate host page: https://hemantaparajuli.com.np/contents/2025/08/1118 (link to the 149-page CDC original guide). Cover and all 20 Class 2–3 Our Surroundings forms inspected visually at zero-based PDF pages 134–148. This supersedes the earlier inaccessible-source note for these pages. No PDF bytes embedded yet.
- PDF index 127 explicitly instructs marking each achieved indicator and counting achieved indicators in groups of four for the score. A main outcome may span several separately dated/scored blocks. Keep main outcome count, indicator count and number of score blocks separate. Do NOT use four times the main outcome count when a main outcome spans multiple blocks. Do not silently normalize printed numbering anomalies (Class 2 family repeats the printed number 5 for the last main outcome; use stable unique internal IDs).

| Theme (catalogue label) | Class 2 indicators per main outcome | Class 2 indicators / raw max | PDF page (1-based) | Class 3 indicators per main outcome | Class 3 indicators / raw max | PDF page (1-based) |
|---|---|---:|---:|---|---:|---:|
| म र मेरो परिवार | 4+4+4+4+4+4 | 24 | 135 | 4+4+12+4 | 24 | 142 |
| मेरो दैनिक जीवन | 4+8+8+4 | 24 | 136 | 4+8+4 | 16 | 143 |
| हाम्रो समुदाय | 8+8+8 | 24 | 137 | 8+8+8 | 24 | 144 |
| हाम्रो विद्यालय | 8+4+4 | 16 | 138 | 4+4+8 | 16 | 145 |
| हाम्रा वरपरका जीवजन्तु | 4+4 | 8 | 139 | 8 | 8 | 146 |
| हाम्रो वातावरण | 4+8 | 12 | 139 | 4+4 | 8 | 146 |
| मेरो सिर्जना | 8+4 | 12 | 140 | 4+8 | 12 | 147 |
| हाम्रो संस्कृति | 4 | 4 | 140 | 8 | 8 | 148 |
| सञ्चार प्रविधि र बजार | 4+4 | 8 | 141 | 4+4 | 8 | 148 |
| हाम्रो वरपरको संसार | 4+4+4 | 12 | 141 | 4+8+4 | 16 | 149 |
| Total | 28 main outcome rows; 36 blocks | 144 | | 24 main outcome rows; 35 blocks | 140 | |

Raw max is the sum of the individual 4-indicator scoring blocks, not the official subject grade. The PDF's theme footer is an average score. The current 2083 UI still has unknown Class 2–3 summary values; integrate this verified catalogue and update the pending-summary regression together, preserving existing Class 1 IDs and historical records. Full wording, tools, print and persistence for the new forms still require implementation and testing. Class 1 mixed-source catalogue must also be reconciled with PDF pages 129–134 (1-based). Keep revised 2084 counts separate.

## 2026-11-25 — Class 2 Our Surroundings structural review completed
- Original 2076 guide PDF pages 135–141 (1-based): visually compared all ten forms with the working catalogue. Totals: 28 main outcome rows (including the repeated printed 5), 144 indicators, 36 scoring blocks per assessment stage. Indicator ordering, suggested assessment tools and scoring block layout checked. Working wording remains a summary, not an exact transcription; no new entry approvals or rules permissions.
- Clarified incomplete summaries in the community, school, environment, creative arts and communication themes. The source-review status and regression checks now cover all ten Class 2 themes. Earlier notes about missing Class 2 counts are superseded by the verified guide-count catalogue in the current implementation.

## 2026-11-25 — Class 3 Our Surroundings structural review completed
- Original 2076 guide PDF pages 142–149 (1-based): visually compared all ten forms with the working catalogue. Totals: 24 main outcome rows, 140 indicators, 35 scoring blocks per stage. Indicator ordering, assessment tool columns and score block layout were checked. The 16 tool cells in the My Daily Life form (p. 143) are blank in the original and remain blank in the review preview. Do not invent suggested tools for this source.
- Clarified incomplete summaries across family, daily life, community, school, environment, creative arts, communication and world themes. This is a structural and meaning review, not exact transcription certification. All 27 pending themes across Classes 1–3 remain preview-only, with existing production approval gates and permissions unchanged.

## 2026-11-25 — Upper-primary complete count and page cross-check
- User-supplied 149-page CDC 2083 assessment guide, Annex 3(a–f), PDF pp. 18–148: checked all 129 thematic form denominators (4 × N) against the digital catalogue. Added source page links for the 103 forms outside Health/Physical/Creative Arts. Counts are not exact-wording or print certification.
- Class 5 arithmetic begins on PDF p. 87, with a printed Class 4 heading inconsistency; continuation p. 88 contains rows 9 and 10 (fraction/percentage and decimal/percentage conversions) and denominator 4 × 10. The Class 5 catalogue previously omitted these two outcomes. Restored them without changing existing outcome titles or saved record identities. Arithmetic maximum 40; Class 5 mathematics raw total 120 (30 outcomes), not an official subject grade.
- Class 4 Science Matter spans PDF pp. 111–112 (14 outcomes). The summary links to the start page of each multi-page form. Source matching is restricted to academic year 2083. No local curriculum was inferred.

## 2026-11-25 — Grade 5 Mathematics form content review
- Visually inspected the user-supplied 2083 guide PDF pp. 86–91, all five Grade 5 mathematics themes (30 outcomes). Added the printed topic/content column labels and Nepali outcome display text with English counterparts; preserved existing record keys for unchanged skills. Geometry rows now follow the printed order, with parallel/perpendicular lines before solid objects.
- The guide specifies 0°–180°, not the previous catalogue's 0°–150°. This materially changed outcome uses a new canonical title. Existing 150° observations are not deleted, migrated or counted as 180° evidence; reassessment is required if any exist. No live records or rules were changed.
- Regression assertions cover all five source-labelled grids, row order and old-key exclusion. Source display refinement does not itself certify remaining subjects or the final print layout.

## 2026-11-25 — Grade 4 Mathematics form content review
- Inspected the user-supplied 2083 assessment guide PDF pp. 81–85 (printed pp. 80–84). Added source content labels and reviewed Nepali outcome display text with English counterparts for 30 outcomes across geometry (4), arithmetic (11), measurement (10), statistics (3), algebra (2). Raw maximum 120, not an official subject grade.
- Grade 4 angle task is restricted to multiples of ten from 0 to 180 degrees, unlike Grade 5. Grade 4 time measurement lists the explicit paired units in the guide. No existing Grade 4 observation title keys changed. Source labels now scoped by grade, theme and canonical title. Tests added for bilingual labels, counts, and grade-specific wording.
- Grade 4/5 math source display review covers ten forms and 60 outcomes; final print and live deployment remain subject to release gates.

## 2026-11-27 — V47 Our Surroundings display numbering
- Copied the exact printed-number mapping from pinned V46 source blob ad2e3b96a22601fed9d956397a98c564b3ffb768, not a new independent PDF verification. All 30 themes use the source's continuous numbering including the repeated Class 2 number 5. Export orders theme, main outcome, indicator, both stages and tools, matching the V46 column sequence.
- Display-only mapping: sourceRows, ordinal identities, draft hashes, scores and Firestore rules unchanged. Verbatim guide wording, exact print layout and official publication remain unapproved.

## 2026-11-27 — Upper-primary two-stage form correction
- CDC 2083 Annex 3 sample pages 18, 48, 81, 93, 111, 123 visually confirm separate regular and additional-support dates/ratings in all six national subjects. Upper-primary previously had only one stage. Existing stage-less draft identities remain the regular stage; only additional support receives a new format and hash suffix. No conversion or deletion. Exports and progress now read both stages separately. Content column mapping improved for mathematics; exact content labels, remarks, final percentage logic and full visual certification remain pending. Local subject remains a separate school-supplied source.

## 2026-11-27 — Shared remarks column in staged assessment drafts
- The uploaded CDC 2083 upper-primary guide shows a single remarks column following regular and remedial date/rating columns. A row note (up to 200 characters) is edited and saved with the regular draft; remedial stage displays it read-only. This is also used for staged lower Nepali and English. Existing draft identities and scores are unchanged, and all export modes include the shared note. Remarks-only saves without any regular rating are not supported. No official publication or full source certification is implied.

## 2026-11-27 — Upper-primary stage achievement percentages
- Reopened the supplied 149-page CDC 2083 guide, PDF page 15 (printed p.14), section on theme/unit assessment point 5: sum of achievement-level points divided by four times the number of assessed learning achievements, multiplied by 100. PDF page 16 (printed p.15) repeats the subject aggregate principle. Annex forms show full-theme denominator after all rows are assessed.
- Apply formula separately to saved regular/remedial stage and display assessed/expected coverage. No assessment = blank percentage, not zero. Subject progress weights by actual assessed count, never averages theme percentages. Current UI preview reflects current selected stage edits and saved peer; reports read saved records. No merged final-stage score or letter grade is inferred; official publication stays blocked. No schema, hashes or rules changed.

## 2026-11-27 — Combined upper-primary review
- Pinned V46 renderSubjectSummary selects support rating if present, otherwise regular, and blanks grade unless all catalogue outcomes are assessed. Its cdcAnnualSubjectAchievement differs: latest record by date. CDC 2083 printed p.15 provides the percentage and letter/point bands, but does not explicitly resolve this stage precedence difference. V47 now previews the V46 subject-summary convention, not the annual algorithm or an approved official grade. Weighted subject coverage and complete-only review grade are shown in Admin progress; theme review is included in worksheet and saved exports. No writes, source keys, official publication or release gate changes.

## 2026-11-27 — Annual date-order comparison
- Rechecked pinned V46 cdcAnnualSubjectAchievement and CDC 2083 guide PDF page 16. Admin subject progress now compares the existing support-preferred V46 summary with a separate annual latest-assessment-date preview. Individual saved row dates take precedence over default date. V47 drafts do not retain per-row creation timestamps; differing ratings with identical dates remain unresolved, rather than assuming a V46 tie-break. Counts, weighted percent, discrepancies and unresolved conflicts are displayed; incomplete subject grades remain blank. This is a draft-only comparison, not a certified annual report, and does not modify records or official publication gates.

## 2026-11-27 — Admin subject progress export
- Saved-only subject progress now exports all themes/stages for one selected student and assigned teacher, using A4 print/PDF, Word and XLSX. Upper-primary includes complete-only combined and annual date-order review rows, including explicit incomplete or conflict status. Stage progress uses assessed-count denominators and binary subjects retain indicator/group counts. No official records, historical merging, permissions or grade publication changed.

## 2026-11-27 — Upper-primary annual student draft review
- Reopened CDC 2083 guide PDF p.149, Annex 4 (printed p.148). Fixed seven subject rows with weekly periods 5,5,5,5,5,3,4. Admin selects one student and reads one unambiguous active assigned teacher per registered subject. Missing/ambiguous subjects or assignments stay blank. Only complete, non-conflicting date-order and stage-priority agreement yields a review grade. Local subject annual grade, attendance, school identity/signature details, migrated observations, lower-primary annual report and official publication remain pending. PDF/Word/XLSX are clearly marked review copies; no data writes or access changes.

## 2026-11-27 — Lower-primary annual student coverage review
- Reopened CDC 2076 guide via https://hemantaparajuli.com.np/contents/2025/08/1118, PDF pp. 9–10, 13–14 and 128–129 (one-based). Annex 2 lists Nepali 160, mathematics 128, English 128, Our Surroundings 256, local/mother tongue 160 annual curriculum hours. These are not weekly periods. The lower scale is A*, A, B, C, D, E, not the upper 2083 grade-point scale. Exact 90% is not expressly covered by the printed wording; no final grade inferred.
- Admin annual review now includes Classes 1–3 with five rows and separate saved regular/support coverage. Our Surroundings counts only complete four-indicator score blocks, not partial checks or main outcome rows. Missing sources, local curriculum grade, attendance, historical observations and final grade are not inferred. Draft-only print/Word/XLSX and school-scoped reads; release gates unchanged. Added synthetic browser regression for partial indicator stages and Excel.
