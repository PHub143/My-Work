# AGENTS.md — `src/data/`

Static content and data files.

## Files

| File | Description |
|---|---|
| `ai103Content.json` | AI-103 course content (pages, questions, exhibits) |
| `ai102Content.json` | AI-102 course content (pages, questions, exhibits) |
| `ybm/manifest.js` | YBM 실전토익 1000 inventory: volumes, tests, part ranges, booklet page counts, per-section minutes |
| `ybm/keys/<test-id>.json` | Answer key for one test, keyed by question number |
| `hacker/manifest.js` | Hackers 해커스 신토익 1000제 inventory — mirrors `ybm/manifest.js` for the second TOEIC book collection |
| `hacker/keys/<test-id>.json` | Answer key for one Hacker test, keyed by question number |
| `hacker/content/<test-id>.json` | Transcribed Part 2-7 text (question stems, choices, passages, graphics) for one Hacker test — see [`hacker/content/AGENTS.md`](hacker/content/AGENTS.md) |
