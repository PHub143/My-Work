# AGENTS.md — `src/data/`

Static content and data files.

## Files

| File | Description |
|---|---|
| `ai103Content.json` | AI-103 course content (pages, questions, exhibits). Questions 1-160 come from the source PDF (except 76 and 77, which the PDF skips and have `sourcePages: []`); 161-194 are original practice questions (`sourcePages: []`, `origin: "original"`) whose answer keys are not exam-verified; 195-221 were added 2026-11-18 from the live CertyIQ site (`origin: "certyiq"`, `siteNumber` = the number on the site: 195 is site #146, 196-221 are site #162-187). The site's HOTSPOT/DRAG DROP answer areas are images, so for 197, 198, 203, 204, 206, 207, 208, 214 the exhibit/answer data was transcribed by hand and the explanations are written here, not copied; 211 has no site explanation either. Answer keys not exam-verified |
| `ai102Content.json` | AI-102 course content (pages, questions, exhibits) |
| `learningTracks.js` | Tiny title/subtitle/questionCount metadata for the LearningHome cards, so that screen doesn't import the multi-MB `ai10xContent.json` banks. Keep counts in sync with those files. |
| `ybm/manifest.js` | YBM 실전토익 1000 inventory: volumes, tests, part ranges, booklet page counts, per-section minutes |
| `ybm/keys/<test-id>.json` | Answer key for one test, keyed by question number |
| `hacker/manifest.js` | Hackers 해커스 신토익 1000제 inventory — mirrors `ybm/manifest.js` for the second TOEIC book collection |
| `hacker/keys/<test-id>.json` | Answer key for one Hacker test, keyed by question number |
| `hacker/content/<test-id>.json` | Transcribed Part 2-7 text (question stems, choices, passages, graphics) for one Hacker test — see [`hacker/content/AGENTS.md`](hacker/content/AGENTS.md) |
| `hacker/transcripts/<test-id>.json` | Listening script for one Hacker test, shown after Submit — see [`hacker/transcripts/AGENTS.md`](hacker/transcripts/AGENTS.md) |
