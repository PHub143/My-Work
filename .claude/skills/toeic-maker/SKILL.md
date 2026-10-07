---
name: toeic-maker
description: Builds, audits, and repairs TOEIC tests in this repo's YBM and Hacker collections (allinone/ + api/). Turns scanned source PDFs/MP3s into a playable test (page images, answer key, audio, Drive upload, manifest), upgrades a test's Parts 2-7 from scanned pages into structured HTML content, and adds Listening transcripts. Also audits which layer or part of a test is missing or inconsistent (vol-1-test-01 is the reference for a complete YBM test) and fills exactly that gap. Use this whenever the user asks to "digitize", "add", "process", "map", "wire up", "complete", "check", or "fix" a specific test — e.g. "do vol 2 test 3", "add the next test", "what's missing from vol 3 test 4", "add transcripts", "bring this test up to vol-1-test-01" — or asks why a test shows "Not available", or reports a wrong answer key, a missing page or audio file, or a part that still shows scanned pages. Also use it when the user asks to "refactor", "convert to text", or "make it real HTML instead of images", the way vol-1-test-01 (YBM) and vol-2-test-01 (Hacker) were done.
---

# TOEIC test maker

Turns one test's worth of scanned source material into a playable entry in
this app's TOEIC feature, and/or upgrades an already-playable test so its
Reading/Listening parts render as real text instead of scanned page images.
This is a **repo-specific pipeline** — it only makes sense inside
`/Volumes/Samsung_T5/My Work`, and depends on the scripts, manifest, and
Drive-backed asset route that already exist here. Read
`.claude/rules/architecture.md`'s "YBM asset pipeline" section first if you
haven't — it's the map this skill is a detailed instance of (the Hacker
collection mirrors it file-for-file under its own `hacker` names).

## What this skill covers

Start with **Reference** (what a complete test is made of) and **Audit and
repair** (find what a given test lacks, then fill exactly that gap). They
tell you which of Parts 1–3 you actually need.

- **Reference — anatomy of a complete YBM test**: the seven layers of
  `vol-1-test-01` with real counts and data shapes — the target every build
  or repair aims at.
- **Audit and repair**: `scripts/audit-ybm.mjs` reports which layer or part
  of any YBM test is missing or inconsistent, and a playbook maps each
  finding to its fix. Use it to bring an existing test up to the reference,
  or to decide what a new test still needs.
- **Part 1 — Digitizing a new test**: turn scanned source PDFs/MP3s into
  booklet page images + an answer key + audio, uploaded to Drive and wired
  into the manifest so the test is playable at all (as a scanned booklet).
- **Part 2 — Content refactor**: for a test that's *already* playable via
  Part 1, transcribe its question stems/choices/passages into structured
  JSON and render them as real HTML instead of the scanned page — this is
  what turned Hacker's `vol-2-test-01` from "flip through booklet photos"
  into the current text UI, across several rounds of fixes in the same
  session. A test needs Part 1 done before Part 2 applies to it.
- **Part 3 — Listening transcripts**: transcribe a test's Listening script
  into `transcripts/<id>.json` so the exam can show it after Submit (YBM
  Vol 1 via `Script/` PDFs; Vol 2 via the explanations section of
  `lc 1000 - 2.pdf` — see Part 3).

A request to "do the next test" almost always means Part 1, then Parts 2 and
3 as far as the volume's sources allow. A request to "refactor", "convert",
or reporting that a specific already-playable test's UI should work like
another one that already got the Part 2 treatment, means Part 2. "What's
missing from…", "complete…", or "bring vol N test M up to vol-1-test-01"
means audit first.

## Collections in this repo

Two parallel collections exist, `ybm` and `hacker` — same file layout under
different names (`scripts/<collection>/render-pages.mjs`,
`allinone/src/data/<collection>/manifest.js`,
`allinone/src/data/<collection>/keys/<test-id>.json`,
`allinone/src/utils/<collection>.js`, `api/scripts/upload-<collection>-assets.js`,
`api/data/<collection>-assets/<test-id>.json`, `GET /<collection>/:testId/:filename`).
Everything in Part 1 below applies to either — substitute `<collection>` for
whichever one the user means (check `allinone/src/pages/English.jsx` or ask
if it's ambiguous which book/collection a "Vol N Test M" refers to).

**One difference matters a lot for Part 2**: whether the collection's source
PDFs have an embedded text layer.

| Collection | Text layer? | Part 2 transcription cost |
|---|---|---|
| `hacker` | Yes (confirmed on every source PDF checked so far) | Cheap — extract with `pdftotext`, cross-check against images |
| `ybm` | No (300dpi scans, no OCR layer at all) | Expensive — every word needs eyes-on transcription from the image, no shortcut |

Don't assume a YBM Part 2 refactor costs the same as a Hacker one — check
the source PDF first (see "Check whether this is even cheap to do" below)
and flag the difference to the user before committing to it.

Everything from "Reference" through "Audit and repair" is written for `ybm`.
Hacker has the same layers 0–5 (content under
`allinone/src/data/hacker/content/`, renderer `HackerReadingContent.jsx`), plus a
transcripts layer for Vols 2 and 3 (`allinone/src/data/hacker/transcripts/`, panel
in `HackerExam.jsx`) — see "Hacker transcripts" in Part 3. `audit-ybm.mjs` does not
read Hacker; to run it on Hacker, copy it and swap its four path constants and
the `YBM_VOLUMES` import for Hacker's `HACKER_VOLUMES` (it then reports 0
findings for Vol 2; on Vol 3 only test 4's documented source-scan hole).

---

# Reference — anatomy of a complete YBM test (`vol-1-test-01`)

`vol-1-test-01` is the worked example of a *fully built* YBM test: all seven
layers below exist for it, and `vol-1-test-02`…`10` have the same shape. Vol 2
and 3 tests are identical except they may lack a transcript layer (Vol 2's
script sits in `lc 1000 - 2.pdf`'s explanations, so it *can* be built —
`vol-2-test-01` has one; Vol 3's source is unchecked) and have shorter
booklets. Whatever you build or
repair, this is the target.

## The seven layers

Each layer is independent and the app degrades gracefully without it — which
is what makes partial builds and targeted repairs possible. `<id>` is
`vol-N-test-MM`, zero-padded.

| # | Layer | Where | Git | If it is absent, the app… |
|---|---|---|---|---|
| 0 | Source PDFs + MP3 | `/Volumes/Samsung_T5/Download/YBM/<volume folder>/` | outside the repo | can't rebuild anything |
| 1 | Booklet pages, audio, crops | `allinone/public/ybm/<id>/` | gitignored | dev shows broken images; prod is fine if Drive has them |
| 2 | Drive copy + manifest | `api/data/ybm-assets/<id>.json` | committed | prod 404s every page and the audio (local dev still works from layer 1) |
| 3 | Page counts | `allinone/src/data/ybm/manifest.js` | committed | that section isn't offered ("Not available") |
| 4 | Answer keys | `allinone/src/data/ybm/keys/<id>.json` | committed | that section isn't offered; if neither is, a "not ready yet" screen |
| 5 | Structured content (Parts 2–7) | `allinone/src/data/ybm/content/<id>.json` | committed | each missing part renders as scanned booklet pages |
| 6 | Listening transcripts | `allinone/src/data/ybm/transcripts/<id>.json` | committed | no transcript panel after Submit |
| 7 | Renderer + runtime | `pages/YbmExam.jsx`, `pages/YbmReadingContent.jsx`, `utils/ybm.js`, `api/services/ybmAssetService.js` | committed | — adding a test never touches these |

Not a layer: per-question audio clips (`lc-qNN.mp3`). `QUESTION_AUDIO` in
`utils/ybm.js` is an empty allowlist, so every test plays its one
`listening.mp3` — a test without clips isn't missing anything.

## `vol-1-test-01` by the numbers

**0 · Source.** Vol 1 is a `perTest` volume — the 전면개정판 full revision
(`manifest.js` dates it Dec 2024; the source folder is named `2025 edition`,
which is what this skill calls it). Under
`/Volumes/Samsung_T5/Download/YBM/Vol 1 - 2025 edition/YBM TOEIC Vol.1 2025/`:
`LC/TEST 1.pdf` (14 pp) · `RC/TEST 1.pdf` (30 pp) · `Script/TEST 1.pdf` (30 pp
— the Listening script + Korean translation + explanations, ending at Q100;
test 1 alone opens with a cover, hence `scriptFirstPage: {1: 2}`) ·
`RC Key.pdf` (4 pp shared by all tests) · `YBM TOEIC LC 1000 Vol_1 Audio Chia
Từng Test/Test 01.mp3`. All are scans with no text layer. The sibling folder
`Vol 1/` is an *older edition* — see "Same edition as the booklet" in Part 1.
`RC/TEST 10.pdf` runs 34 pages (it swallows the back-of-book answers
appendix), capped by `readingLastPage: {10: 30}` in `render-pages.mjs`.

**1 · Local assets — 76 files.** `lc-p01…p14.jpg` (`p01` = the "LC TEST 1"
cover, `p02` = directions + Part 1 example, `p03…p05` = Part 1's six photos,
`p06` = Part 2) · `rc-p01…p30.jpg` (`p01` = cover, `p02` = directions + the
start of Part 5, `p29` = "Stop! This is the end of the test.", `p30` = a
non-exam closing page, the YBM RC1000 checklist — a `perTest` PDF is rendered
whole, so its cover and closing pages are included) ·
`listening.mp3` (re-encoded to 64 kbps mono, 45.4 min, ~22 MB) ·
`lc-graphic-096.jpg` + `lc-graphic-100.jpg` (crops cut from `lc-p13.jpg`) ·
`sc-p01…p29.jpg` (script pages: a *working set* for transcripts, never served).

**2 · Drive manifest — 47 files:** everything above except the `sc-p*` pages.

**3 · manifest.js.** Vol 1 sets `listeningPages: 14` and `readingPages: 30` at
the volume level with **no per-test overrides** — a Vol 1 test needs one only
if its counts differ. Vols 2 and 3 set the volume defaults to `null` and list
a count per mapped test in `listeningPageOverrides`/`readingPageOverrides`
(`null` is what keeps an un-mapped test "Not available").

**4 · Keys.** 100 + 100 letters and where each grid was read — shape below.

**5 · Content — Parts 2–7, 194 of 200 questions** (Part 1's photo questions
stay on the scanned page):

| Part | Questions | `type` | What `vol-1-test-01` holds |
|---|---|---|---|
| 1 | 1–6 | *(not transcribed)* | photos → scanned pages `lc-p03…p05` |
| 2 | 7–31 | `text-only`, `batchSize: 25` | 25 items with **no `choices`** (the book prints only "Mark your answer on your answer sheet.") |
| 3 | 32–70 | `text-only` | 39 items = 13 conversations × 3, plus `graphics` for [62–64] notice, [65–67] invoice, [68–70] schedule — all transcribed as text tables |
| 4 | 71–100 | `text-only` | 30 items = 10 talks × 3, plus `graphics` for [95–97] and [98–100] — spatial diagrams, so `kind:"graphic"` crops |
| 5 | 101–130 | `text-only` | 30 items, the blank written `_______` |
| 6 | 131–146 | `passage-set` | 4 sets × 4 (article, letter, email, article) with `[[n]]` blank tokens; the sentence-insertion items (134, 137, 142, 145) carry `"type":"sentence"` |
| 7 | 147–200 | `passage-set` | 15 sets, 54 items: 10 single-passage, 2 double, 3 triple; kinds notice, email, chat, form, article, webpage, schedule |

`imageOnlyPages` is `{ "listening": 5 }`: `lc-p01…p05` (cover, directions,
Part 1's photos) stay scanned images and Part 2 starts on `lc-p06`. Reading
has no entry because every reading part is transcribed.

**6 · Transcripts — 54 entries covering Q1–100:** Part 1 → 6 entries, Part 2
→ 25, Part 3 → 13 (3 questions each), Part 4 → 10 (3 each).

### The volumes side by side

| | Vol 1 | Vol 2 | Vol 3 |
|---|---|---|---|
| Edition (per `manifest.js`) | 전면개정판 (folder: `2025 edition`) | 2018 고득점 대비 최신판 | 2021 최신판 |
| Source shape | one PDF per test (`perTest: true`) | one combined LC + one combined RC PDF; `pageRanges` found by hand | same as Vol 2 |
| Booklet pages (LC / RC) | 14 / 30, covers included | 12 / 28 or 30, per test | 12 / 28 (tests 9–10: 30) |
| Page counts in `manifest.js` | volume-level | per-test overrides | per-test overrides |
| Where to read the listening key | first page of `Script/TEST N.pdf` | `lc 1000 - 2.pdf` explanations grid | `KEY LC.pdf` |
| Where to read the reading key | `RC Key.pdf` | `rc 1000 - 2.pdf` | `KEY RC.docx` (embedded image) |
| Transcripts | yes (`Script/` PDFs) | script inside `lc 1000 - 2.pdf`'s explanations (test 1 = pp. 171–200; only test 1 built so far) | unchecked |
| `imageOnlyPages.listening` | 5 | 4 | 4 |

For a new test in an existing volume, start from a sibling's values, then
verify each against the actual page images.

## Data shapes

```jsonc
// keys/vol-1-test-01.json — a section may be null (then that section isn't offered)
{ "testId": "vol-1-test-01",
  "listening": "<100 letters A-D>", "listeningSource": "<file>, page <n> (TEST 1 answer grid)",
  "reading":   "<100 letters A-D>", "readingSource":   "<file>, page <n> (TEST 1)" }

// api/data/ybm-assets/vol-1-test-01.json — NOT a flat map; written by upload-ybm-assets.js
{ "testId": "vol-1-test-01", "files": { "lc-p01.jpg": "<driveFileId>", "listening.mp3": "<driveFileId>" } }

// content/vol-1-test-01.json — full field reference: content/AGENTS.md
{ "testId": "vol-1-test-01", "source": "…", "note": "…",
  "imageOnlyPages": { "listening": 5 },
  "parts": {
    "2": { "type": "text-only", "batchSize": 25,
           "items": [{ "number": 7, "stem": "Mark your answer on your answer sheet." }] },
    "3": { "type": "text-only",
           "items": [{ "number": 32, "stem": "…", "choices": { "A": "…", "B": "…", "C": "…", "D": "…" } }],
           "graphics": [{ "questions": [62, 63, 64], "passage": { "kind": "notice", "heading": "…" } }] },
    "6": { "type": "passage-set",
           "sets": [{ "id": "p6-set-131-134", "questions": [131, 132, 133, 134],
                      "instruction": "Questions 131-134 refer to the following article.",
                      "passage": { "kind": "article", "paragraphs": ["… [[131]] …"] },
                      "items": [{ "number": 131, "choices": { "A": "…", "B": "…", "C": "…", "D": "…" } }] }] } } }

// transcripts/vol-1-test-01.json — schema and conventions: Part 3
{ "testId": "vol-1-test-01",
  "entries": [
    { "from": 1,  "to": 1,  "lines": ["(A) He's looking at a mobile phone.", "(B) …", "(C) …", "(D) …"] },
    { "from": 7,  "to": 7,  "lines": ["W-Am|Where are the recycling bins located?", "M-Au|(A) In the hallway.", "(B) Every weekday.", "(C) Just paper and glass."] },
    { "from": 32, "to": 34, "lines": ["W-Am|Sorry to bother you, Carl, …", "M-Cn|He's at a doctor's appointment, …"] } ] }
```

## What the exam does with missing or partial layers

Read from `YbmExam.jsx`, `YbmReadingContent.jsx` and `utils/ybm.js`. This is
why the partial-content rules below exist.

- **A section is offered** only if its page count is mapped (layer 3) *and* its key is valid (layer 4). No section offered → a "not ready yet" screen naming what's missing.
- **Per question**, the exam looks at `content.parts[<that question's part>]`: present → the structured view; absent → the scanned-page viewer.
- **Structured view** = the transcribed parts of the section, in order, as one flat list of units (a Part 2 batch, a Part 3/4 graphics group, a Part 6/7 set…). At its first unit, Prev returns to the scanned viewer at page `imageOnlyPages[section]`; at its last, Next becomes "Continue → <other section>".
- **Scanned viewer** pages through `1…imageOnlyPages[section]` (every page if the key is unset). At the last of those pages, if a later part is transcribed, Next becomes "Continue →" into it.
- **Transcript panel**: only after Submit, only in Listening — the entry containing the focused question, with the `(A)…(D)` line equal to the *key's* answer highlighted. A wrong key therefore visibly highlights the wrong choice.
- **Asset route** `GET /ybm/:testId/:filename` serves only names listed in `api/data/ybm-assets/<id>.json`, and only `.jpg`/`.jpeg`/`.mp3` (else 400). Manifests are cached per API process.

Three rules follow for a test whose content is only partly transcribed:

1. **Transcribe a contiguous run that ends at the section's last part**, growing backwards: Listening 4 → 3–4 → 2–4; Reading 7 → 6–7 → 5–7 (Part 1 is never transcribed). An untranscribed part *after* a transcribed one gets skipped by Next, and with `imageOnlyPages` set its pages are unreachable. — audit `CONTENT-NOT-SUFFIX`
2. **`imageOnlyPages[section]` = the last booklet page still needed by the leading untranscribed part(s)** — Vol 1 Listening 5, Vols 2/3 Listening 4 while only Part 1 is untranscribed; if Part 2 were untranscribed too it would be the last Part 2 page (`lc-p06` for `vol-1-test-01`). Recompute it whenever the run changes, and delete the key once the section is fully transcribed. — audit `CONTENT-IMGONLY`
3. **Pages beyond that number are never requested**, so they needn't be on Drive: `vol-2-test-07` deliberately holds just `lc-p01…p04` + `listening.mp3`. Uploading every page is harmless, only wasteful.

---

# Audit and repair

## Audit a test

Run this first — for a new test to see what exists, for an old one to see
what it lacks:

```bash
node .claude/skills/toeic-maker/scripts/audit-ybm.mjs                 # all 30 tests: one-line matrix, then ERROR/TODO/WARN findings
node .claude/skills/toeic-maker/scripts/audit-ybm.mjs vol-3           # one volume
node .claude/skills/toeic-maker/scripts/audit-ybm.mjs vol-1-test-01   # one test: every finding incl. INFO, and the asset files the exam will request
```

Read-only, Node builtins only, exit code 1 only when an `ERROR` exists. It
cross-checks the layers against each other: page counts ↔ Drive files,
content coverage and order per part, Part 6 blank tokens, printed "Questions
X-Y refer to…" lines, "Look at the graphic" questions ↔ `graphics` groups,
graphic crops ↔ Drive,
`imageOnlyPages` ↔ which parts are transcribed, transcript coverage /
grouping / line format, key format and source citations. Findings are `ERROR`
(present but wrong — breaks or misleads at runtime), `TODO` (a layer is
absent), `WARN`, and `INFO`; each has a code, and the playbook below is
indexed by it.

What it cannot see — check these with "Verify against the pages" below, or by
eye: whether a key is *right* (it validates the format and flags one known
wrong-source pattern, `KEY-SRC-EDITION`), whether question texts sit under the
*right numbers* (a whole set can be renumbered out of order and still pass
every structural check — it happened to `vol-1-test-04`'s Part 3), whether
transcribed text matches the page, and whether `imageOnlyPages` is the
*correct* page (only that it is set and plausible). Trust a clean audit for
structure, not for content.
`node .claude/skills/toeic-maker/scripts/audit-ybm.selftest.mjs` proves every
check still fires against a deliberately broken temp copy of `vol-1-test-01`
(it never touches the repo) — run it after editing the audit. When a new kind
of mistake turns up, add a check (or a row to `SUSPECT_KEY_SOURCES` for a bad
source citation) and a selftest case, rather than relying on memory.

## Verify against the pages

The audit proves the layers agree with *each other*; `scripts/verify-vs-pages.py`
proves they agree with the *book*, by OCR-ing the scans. It needs `tesseract`,
Pillow and numpy plus the gitignored page images (regenerate with
`render-pages.mjs` if they are missing).

```bash
python3 .claude/skills/toeic-maker/scripts/verify-vs-pages.py keys      vol-1            # or vol-1-test-04 — Vol 1 only
python3 .claude/skills/toeic-maker/scripts/verify-vs-pages.py numbering vol-1            # any volume with local lc-/rc- pages
```

- **`keys`** reads the correct choice the book prints in red on each script
  page, matches its text against the known choice texts (transcripts for
  Parts 1–2, content for Parts 3–4) and compares the letter with the committed
  listening key. `CONFLICT` means a wrong key **or** content/transcript
  numbering that is off. "No evidence" is just OCR misses. Result on Vol 1
  (Sept 2026): 901 of 1,000 answers confirmed, 0 conflicts.
- **`numbering`** OCRs the booklet pages and checks that each content
  question's text is printed next to the number the content file gives it. A
  misnumbered set shows up as a run of three or more consecutive questions
  shifted by the same offset, usually a multiple of 3 — reported `LIKELY`
  (exit 1). `possible` runs are usually OCR noise (4 read as 1, 8 as 3,
  near-duplicate stems): open the page before acting. The four `possible`
  runs on Vol 1 today were each checked on the page and are fine.
- Both were proven against the pre-fix `vol-1-test-04` content file: `keys`
  reports 7 conflicts and `numbering` the Q62–67 shift. `--content FILE` checks
  a draft content file instead of the committed one.

Run `keys` after reading any Vol 1 answer grid, and `numbering` after
finishing or editing Part 3/4 content.

## Repair playbook

Find the symptom or audit code, do the fix, re-run the audit.

| Symptom → audit code | Fix |
|---|---|
| Test or section "Not available" / "not ready yet" — `MAN-UNMAPPED`, `KEY-MISSING`, `KEY-SECTION-NULL` | Layer 3: find the booklet's page count (Part 1 → "Extracting page images"; Vol 1's volume default 14/30 may already cover it) and add it to `listeningPageOverrides` / `readingPageOverrides` if needed. Layer 4: transcribe the key (Part 1 → "Transcribing the answer key"). |
| Wrong scores; Part 2 answered D; transcript highlights the wrong choice — `KEY-BAD`, `KEY-P2-D`, `KEY-SRC-EDITION`, `KEY-NO-SOURCE` | Re-read the grid from the *same edition as the booklet*, confirm it with `verify-vs-pages.py keys` (Part 1 → "Vol 1 (2025 edition)"), fix the `*Source` citation, then `node --test src/utils/ybm.test.js`. |
| Images/audio 404 in production but fine locally — `DRIVE-NO-MANIFEST`, `DRIVE-MISSING-FILE` | Regenerate any missing local file (`ASSET-LOCAL-MISSING`), move `sc-p*.jpg` out of the folder, run the upload (Part 1 → "Uploading to Drive"), commit the manifest JSON. Locally, restart `api/` — it caches manifests per process. |
| A page image or crop is wrong or blurry (the audit can't see this) | Re-render / re-crop. The upload keeps an existing Drive file with the same name, so it will **not** replace it: `api/scripts/delete-ybm-assets.js <id>` wipes the test's whole Drive folder and manifest (destructive on shared storage — get the user's OK first), then upload again. |
| `DRIVE-UNSERVED-EXT`, `DRIVE-BAD-SHAPE` | The route serves only `.jpg`/`.jpeg`/`.mp3`: convert (`magick a.png a.jpg`), fix the content reference, re-run the upload script rather than hand-editing the manifest (its shape is `{ testId, files }`). |
| `DRIVE-DEAD-WEIGHT`, `UPLOAD-WOULD-INCLUDE-SC` | `sc-p*.jpg` are transcript working files and are never served. Move them out of `public/ybm/<id>/` before uploading. If already uploaded, tell the user — removing files from Drive needs their OK. |
| A part still shows scanned pages — `CONTENT-MISSING`, or a part absent from `parts` | Layer 5: Part 2 of this skill, transcribing from the end of the section backwards; add each part under `parts`, then recompute `imageOnlyPages`. |
| The viewer flips through pages already covered by text — `CONTENT-IMGONLY` | Set `imageOnlyPages.<section>` to the last booklet page the leading untranscribed part(s) still need; delete the key once the section is fully transcribed. |
| A part is skipped, or its pages are unreachable — `CONTENT-NOT-SUFFIX` | Transcribed parts must form a run ending at the section's last part. Transcribe the parts after the gap. |
| `CONTENT-COVERAGE`, `-STEM`, `-CHOICES`, `-SET`, `-P6-BLANK`, `-GRAPHICS` | Transcription slips: re-read that part's page image and fix the entry. |
| `CONTENT-ORDER`, `CONTENT-INSTRUCTION`, `CONTENT-GRAPHIC-Q` | Items or sets out of order, a set's printed "Questions X-Y refer to…" line disagreeing with its question list, or a "Look at the graphic" question sitting in no `graphics` group (its table/diagram is never shown): fix the entries from the booklet page. |
| Question texts attached to the wrong numbers (each set reads fine, but the answer sheet disagrees) — `verify-vs-pages.py numbering` `LIKELY`, or `keys` `CONFLICT` | Renumber from the *printed* numbers on the booklet page (`lc-pNN.jpg`): on a two-page spread the columns read left to right across both pages, and each set's range is printed on its first question. Renumber the items **and** `graphics[].questions`, reorder both arrays ascending (units render in array order), then re-run both verifiers. `vol-1-test-04` Part 3 (Q62–70) was fixed this way; the crop's filename did not need to change. |
| A "Look at the graphic" group has no table or crop — `CONTENT-GRAPHICS`, `CONTENT-GRAPHIC-ASSET`, `DRIVE-MISSING-FILE` on an `lc-graphic-*` | Part 2 → "Look at the graphic": a text table first, a `kind:"graphic"` crop only if the visual is spatial; then upload again. |
| `CONTENT-STALE-NOTE` | Edit the `note`. It is free text and goes stale — keep mutable status like "not yet uploaded" out of it. |
| No transcript after Submit — `TR-MISSING` (a TODO only where a script source exists) | Part 3. |
| `TR-COVERAGE`, `TR-GROUPING`, `TR-LINES` | Fix the entries — Part 3 → "Schema". |

## Building a test end to end

For a brand-new test, or an existing one that lacks nearly everything. Steps
1–4 make it playable (as a scanned booklet); 5–6 make it structured. Each
step is detailed in the Part named; skip any the audit says already exists.

| Step | Do | Where |
|---|---|---|
| 0 | Audit: `audit-ybm.mjs vol-N-test-MM` | above |
| 1 | Render booklet pages (Vol 1: `node scripts/ybm/render-pages.mjs --vol 1 --test M` also writes the `sc-` script pages) | Part 1 → "Extracting page images" |
| 2 | Audio → `listening.mp3`, 64 kbps mono | Part 1 → "Audio" |
| 3 | Keys → `keys/<id>.json`, then `node --test src/utils/ybm.test.js` | Part 1 → "Transcribing the answer key" |
| 4 | Page counts → `manifest.js`, *only if* they differ from the volume default | Part 1 → "Uploading to Drive and wiring it up" |
| 5 | Content: Parts 2–7 from the *end* of each section backwards → `content/<id>.json`; set `imageOnlyPages`; crop graphics | Part 2 |
| 6 | Transcripts (Vol 1 only) → `transcripts/<id>.json` | Part 3 |
| 7 | Move `sc-p*.jpg` out of `public/ybm/<id>/`, then `cd api && node scripts/upload-ybm-assets.js <id>` — after step 4 to make the test playable, and again after step 5 to pick up crops (re-runs skip files already on Drive) | Part 1 → "Uploading to Drive" |
| 8 | Verify: audit shows 0 ERROR · `npm run lint` · `node --test src/utils/ybm.test.js` · `npm run build` · curl the asset route · SSR-render a few units | Part 1 → "Verification", Part 2 → "Verifying without logging in" |
| 9 | Report what was built and the page boundaries used; commit only if asked | — |

---

# Part 1 — Digitizing a new test

## Why this exists

The source books are 300dpi scans (with or without a text layer, per the
table above), digitized-book structure is consistent within a book but
individual tests vary in page count, and the answer keys are large tables
(image grids for `ybm`, sometimes a standalone file for `hacker` — check
first) you often have to read by eye. None of that is a "just run a script"
problem — it needs a page-boundary hunt through the actual scans before any
script can run. This part of the skill is that hunt, written down so it
doesn't have to be re-derived from scratch each time.

## Before you start: check what already exists

For YBM, run the audit first (see "Audit a test") — it answers most of this
list in one command. Then:

1. Read `allinone/src/data/<collection>/manifest.js` —
   `VOLUMES[].listeningPageOverrides` / `readingPageOverrides` tell you which
   tests in which volumes are already mapped. Don't redo one that's already
   there.
2. Read `scripts/<collection>/render-pages.mjs`'s `VOLUME_SOURCES` — it may
   already know the source file paths for this volume, and may already have
   some tests' `pageRanges` filled in (useful as a sanity-check pattern for
   the new test you're adding).
3. Find the source material. It lives outside the repo, typically under
   `/Volumes/Samsung_T5/Download/<Collection>/Vol <N>/...`. Two source shapes
   exist — figure out which one you have before doing anything else, since it
   changes the whole approach:
   - **Per-test split PDFs** (e.g. `Vol 1/2025 edition/.../LC/TEST 1.pdf`,
     `RC/TEST 1.pdf`) — each test is already its own file. Skip straight to
     "Extracting page images" below; no boundary-hunting needed. This is the
     `perTest: true` shape in `render-pages.mjs`.
   - **One combined PDF per section covering all 10 tests** (e.g.
     `Vol 2/YBM TOEIC 2/lc 1000 - 2.pdf`, `rc 1000 - 2.pdf`) — this is the
     hard case and what the rest of this part is mostly about. This is the
     `pageRanges` shape.
   - Also check for a per-test audio folder (e.g. `file nghe/Test 05.mp3` or
     `Audio/Test 05.mp3`) and, separately, whether an **answer key** source
     exists as its own file (some volumes ship a standalone key
     PDF/DOCX/PNG-per-test folder — check the volume's folder for anything
     like `KEY LC.pdf`, `RC Key.pdf`, a `해설` folder, or a `KEY RC .../TEST N.png`
     folder — which is far easier than the grid-hunting described below and
     should be preferred when available).

If the volume has never been touched before, you'll also need to add a new
entry to `VOLUME_SOURCES` in `render-pages.mjs` (source file paths,
`audio: (n) => ...`) before anything else here applies — copy the shape of
an existing volume entry.

## Finding a test's page boundaries (combined-PDF case)

Do this once per test, even if you've already done it for other tests in the
same volume — **content length is not constant across tests in the same
book.** One TOEIC test's Reading section can genuinely run 2+ pages longer or
shorter than another's, purely because some passages are wordier. Never
assume "test N is the same length as test N-1" — verify each one directly
against the source scan, or you'll silently truncate or overshoot a test.

### Step 1 — render candidate pages, don't guess blind

Use `pdftoppm` (poppler, already available) to rasterize single pages at low
DPI for scanning, then read the images. This is much cheaper than rendering
the whole PDF:

```bash
pdftoppm -jpeg -r 80 -f <page> -l <page> "<source>.pdf" <out-prefix>
```

Put scratch renders in your scratchpad directory, not the repo.

### Step 2 — find the book's own Table of Contents first

Before hunting page-by-page, check the first ~20 pages of each combined PDF
(both the listening and reading source) for a "CONTENTS" page. These books
print one, listing each `TEST N` with its own printed (footer) page number —
e.g.:

```
TEST 01    4
TEST 02    18
TEST 03    32
...
```

If you find one, this is your fastest and most reliable anchor — it tells
you the exact printed-page-number where each test's *content* begins,
**before you've rendered a single content page**. Compare that to a `TEST N`
cover page you can find nearby (covers are large-font, sparse "TEST N" title
pages — cheap to spot even at low DPI) to work out two separate constant
offsets for this particular book: `cover_pdf_page = toc_footer + X` and
`content_start_pdf_page = toc_footer + X + 1` (the content page is always
exactly one past the cover). **Don't reuse a specific `X` value from this
skill or from another volume/edition** — front-matter length varies book to
book, so an `X` that was correct once is exactly the kind of number that
looks trustworthy and silently produces an off-by-one when reused. Derive it
fresh, from this book, every time — the cheapest way is to reuse the
already-mapped tests in `render-pages.mjs` for this same volume as anchors
(their known content-start pages minus their TOC footer numbers should all
agree on the same `X + 1`). Confirm against at least two tests before
trusting it, since front matter and mid-book section dividers can shift it.

If there's no TOC (or the offset doesn't hold), fall back to direct search:
render pages at ~50-100 page intervals looking for `TEST N` cover pages
(sparse, large centered text, often on a near-blank/washed-out scan — they
compress to a noticeably *smaller* JPEG than content pages, which is a useful
filter if you render a whole range and sort by file size), then binary-search
inward.

### Step 3 — confirm both ends of the range directly

Never trust the offset formula alone for where a test *ends* — content
length varies (see above). For each of the listening and reading sections:

- Confirm the **first content page** — usually a "LISTENING TEST" /
  "READING TEST" instructions box with a worked example, no numbered
  questions yet.
- Confirm the **last content page** — look for "This is the end of the
  Listening test." (LC) or "Stop! This is the end of the test." (RC), which
  print on the actual final content page.
- Check what's immediately after the last content page: often a plain "LC"
  or "RC" section-divider page (same washed-out style as covers) before the
  next test's cover, sometimes the next cover directly. Either way, your
  extraction range is `[first_content_page, last_content_page]` inclusive —
  **exclude** the cover and any divider, they aren't part of the exam.

Once confirmed, note the range as `[firstPage, lastPage]` (1-indexed,
inclusive, absolute PDF page numbers) for both listening and reading.

## Extracting page images

Add the confirmed ranges to `scripts/<collection>/render-pages.mjs`'s
`VOLUME_SOURCES[<vol>].pageRanges[<test>]`, e.g.:

```js
pageRanges: {
  3: { listening: [123, 137], reading: [201, 228] },
},
```

Then run it from the repo root:

```bash
node scripts/<collection>/render-pages.mjs --vol <N> --test <M>
```

This writes `allinone/public/<collection>/vol-<N>-test-<M>/lc-p01.jpg ...`
and `rc-p01.jpg ...`, renumbered relative to the range you gave it (page 1 of
the range becomes `lc-p01.jpg`, regardless of its absolute PDF page number).
It logs how many pages it found for each section and whether it found the
audio file — **check those counts match what you expect** (last page number
minus first, plus one) before moving on.

Spot-check at least the first and last rendered page of each section (Read
tool can view JPEGs directly) to confirm they're really the instructions
page and the end-of-test page, not off by one.

**`perTest` volumes (Vol 1) skip the boundary hunt but have their own
traps.** `render-pages.mjs` renders each per-test PDF whole — no
`pageRanges` entry — so check the PDFs themselves before trusting the counts:
`pdfinfo "<LC|RC|Script>/TEST N.pdf" | grep Pages`, then look at the first and
last rendered page of each. Known cases: the whole PDF includes its cover
(and RC a closing checklist page), so the booklet counts include them — `lc-p01` is the
cover, which is why Vol 1's `imageOnlyPages.listening` is 5, not 4; a PDF can
overshoot into the next book's appendix (`RC/TEST 10.pdf` is 34 pp → cap it
with `readingLastPage`); and a script PDF may open with a cover
(`scriptFirstPage`, test 1 only). The plain render also drops the `sc-pNN.jpg`
script pages into the served folder — see "Uploading to Drive" for why that
matters. `node scripts/ybm/render-pages.mjs --vol 1 --test M --script-only
--out <dir>` renders only the script pages, into `<dir>/vol-1-test-MM/`.
The script only *reports* the audio path; copying and re-encoding it is a
manual step ("Audio", below).

## Transcribing the answer key

This is the most expensive and highest-risk step in this whole pipeline — in
practice it's eaten roughly a quarter of the total effort of a digitization,
more than page-boundary hunting for both sections combined — because it's
the one step that's pure "read small text off a scanned image" with no
formula to shortcut it. Budget for it accordingly, and don't rush the
verification. **Check "Before you start" first** — some volumes (both
collections) ship a standalone key file per test (a PDF, a `TEST N.png`, a
transcript with an answer page) that sidesteps grid-hunting entirely; prefer
that whenever it exists.

**Vol 1 (2025 edition): both keys ship as files — don't grid-hunt.**

- **Listening key** = the answer grid at the top of the *first page* of
  `Script/TEST N.pdf` — after rendering, `sc-p01.jpg` (5 columns × 20 rows,
  row-major `N (LETTER)`). Test 1's PDF opens with a cover, which
  `scriptFirstPage` skips, so this holds for every test.
- **Reading key** = `RC Key.pdf`, four pages shared by all tests (as cited in
  the committed keys: page 2 = tests 1–4, page 3 = 5–8, page 4 = 9–10).
- **Same edition as the booklet — the trap.** Read every key from files that
  sit next to the booklet you rendered. The sibling folder `Vol 1/` (with a
  291-page `TRANSCRIPT.pdf`) is an *older edition*: different Part 1
  questions and different answers — on test 1 only 25 of 100 listening
  answers agree with the 2025 grid, which is chance. A key read from there
  passes every format check and silently mis-scores. (Audit:
  `KEY-SRC-EDITION`.)
- **A second, independent signal.** Every script page prints each question's
  correct choice in red. `python3 .claude/skills/toeic-maker/scripts/verify-vs-pages.py keys vol-1-test-NN`
  OCRs those red answers and compares them with the committed key (roughly 90%
  of questions get evidence; any `CONFLICT` needs a look — see "Verify against
  the pages"). Also confirm the key's source shows the same Part 1
  photo/question as the booklet's `lc-p03.jpg`. Do the read itself twice —
  by eye and with `tesseract` — and re-check, zoomed, every cell where two
  reads differ or none agree: `B`/`D` and `A`/`C` are the usual confusions.

**Try the reading-section tail appendix first, if this book has one** (some
volumes' combined reading PDF prints a compact key appendix, 5 columns × 20
rows, no explanations, in its own last ~10 pages, one page per test, in
descending order — i.e. the last page is Test 10, and
`page = last_page - (10 - testNumber)`). This has consistently been faster
and lower-risk than the explanations-section grid below: it renders clearly
even at low DPI, needs no cropping, and the descending-order rule predicts
the exact page on the first try if you know one other test's key page in the
same book as an anchor (check an already-committed
`allinone/src/data/<collection>/keys/*.json`'s `readingSource` citation).

Otherwise (and always for listening, which doesn't get this shortcut), find
the compact answer-key grid (100 questions, 5 or 10 columns, `N (LETTER)`
format) inside a "정답 및 해설" (answers & explanations) section that comes
after all 10 tests' content — look for a `TEST N` labeled grid page there,
distinct from the lengthy per-question explanation pages that follow it (the
grid is short; explanations run 20-30+ pages per test). It's typically the
first page of that test's explanation block. **Once you've located the
explanation block for one test, note its approximate page length** (e.g.
"~30 pages, cumulative from the 정답·해설 section cover") — the next test's
grid is at roughly `previous_test_grid_page + that_length`, turning a
multi-round search into a single confirmed guess.

**Read the grid at high resolution and in pieces** — render at `-r 300`,
then crop top/middle/bottom bands with PIL (or similar) and read each band
separately. A single full-page screenshot at normal resolution is genuinely
too small to reliably distinguish letters in a 100-cell grid; don't trust a
first read without zooming in, and re-crop if any cell looks ambiguous.
Because a misread letter here silently mis-scores every future attempt at
this test with no error thrown anywhere, **re-read at least one row or
column as an independent second pass** before writing it down — cheap
insurance against exactly the kind of transposition error that's easy to
make skimming a dense grid once.

Assemble the 100 letters in question-number order into one string, watching
carefully whether the grid is **row-major** (numbers run left-to-right, e.g.
"1 2 3 4 5 / 6 7 8 9 10 / ...") or **column-major** (numbers run top-to-bottom
per column, e.g. col 1 = 101-120, col 2 = 121-140, ...) — one book series
seen so far uses row-major for the LC explanations-section grid and
column-major for both the RC explanations-section grid and the RC tail
appendix, so don't assume a book's sections match each other, and don't
assume one book's convention matches another's. Verify by checking that
consecutive question numbers in your assembled string land where the image
shows them.

Write `allinone/src/data/<collection>/keys/vol-<N>-test-<M>.json`:

```json
{
  "testId": "vol-<N>-test-<M>",
  "listening": "<100 letters, questions 1-100>",
  "listeningSource": "Vol <N>/<path>/<file>.pdf, page <N> (TEST <M> answer grid)",
  "reading": "<100 letters, questions 101-200>",
  "readingSource": "Vol <N>/<path>/<file>.pdf, page <N> (TEST <M> answer grid)"
}
```

`listeningSource`/`readingSource` are load-bearing for future debugging if a
score looks wrong — always cite exactly where you read the grid.

Validate immediately, don't wait until the end:

```bash
cd allinone && node --test src/utils/<collection>.test.js
```

This checks (among other things) that every key is 100 letters of `A-D`,
that Part 2 questions (7-31) never answer `D` (TOEIC Part 2 only offers 3
choices — a `D` there means you misread the grid or the row/column mapping),
and that the key resolves to a real manifest entry. Treat a failure here as
a transcription error to go back and re-check, not a test bug.

## Audio

Copy the source MP3 to
`allinone/public/<collection>/vol-<N>-test-<M>/listening.mp3`, then re-encode
it — these come as ~44MB 128kbps stereo files, which is wasteful for what's
spoken-word exam audio:

```bash
cd allinone/public/<collection>/vol-<N>-test-<M>
ffmpeg -y -i listening.mp3 -ac 1 -b:a 64k -codec:a libmp3lame listening.opt.mp3
mv listening.opt.mp3 listening.mp3
```

64kbps mono is plenty clear for speech and roughly halves the file size.
Sanity check the duration didn't change (`afinfo listening.mp3` or
`ffprobe`) — should still be ~45-47 minutes for a full listening section.

## Uploading to Drive and wiring it up

Run the existing upload script, which pushes the whole
`allinone/public/<collection>/vol-<N>-test-<M>/` folder to this app's
configured Google Drive and writes the manifest the backend reads at request
time:

```bash
cd api && node scripts/upload-<collection>-assets.js vol-<N>-test-<M>
```

This needs a working `DriveConfig` in the database `api/.env`'s
`DATABASE_URL` points at (it reuses `services/googleDriveService.js`, the
same credentials the rest of the app already uses — nothing new to
configure). It creates a `<collection>/vol-<N>-test-<M>/` folder in Drive if
needed, uploads every file, and writes
`api/data/<collection>-assets/vol-<N>-test-<M>.json` — a small, git-friendly
`{ "testId": …, "files": { filename: driveFileId } }` manifest (not a flat
map), which is what makes it unnecessary to ever commit the actual
images/audio to the repo. **Don't** grant the uploaded files
public/"anyone with link" access — the API streams them with its own
credentials via `GET /<collection>/:testId/:filename`, so making them public
would just be unnecessary exposure. If you see upload script code doing
that, something regressed; it shouldn't.

What the script does and doesn't do — each of these has bitten a real test:

- **It uploads every file in the local folder** (no filter). The `sc-pNN.jpg`
  script pages are transcript working files, never served — move them out of
  `public/ybm/<id>/` before uploading (`--script-only --out <dir>`
  regenerates them elsewhere). No committed manifest contains them.
- **It is idempotent by filename and never replaces.** A name already in the
  Drive folder keeps its old file id. Re-running is the right way to add a
  new file (a fresh crop) — but a *changed* image with the same name is not
  re-uploaded. To replace bad assets, `api/scripts/delete-ybm-assets.js <id>`
  wipes the test's whole Drive folder and manifest (destructive on shared
  storage — needs the user's explicit OK), then upload again.
- **Only `.jpg`, `.jpeg` and `.mp3` are ever served** (`ybmAssetService.js`
  answers anything else with 400), so crops must be `.jpg`.
- **Only pages the exam can request need uploading** (see "What the exam does
  with missing or partial layers"): `vol-2-test-07` was deliberately trimmed
  to `lc-p01…p04` + `listening.mp3`. Uploading everything is also fine.
- **The API caches each manifest per process.** After regenerating one,
  restart `api/` (`npm start`) before curl-verifying; production picks it up
  on redeploy.
- **Always pass the test id** — with no argument the script defaults to
  `vol-2-test-05`.

Then update `allinone/src/data/<collection>/manifest.js` — add the page
counts you confirmed earlier to that volume's `listeningPageOverrides` /
`readingPageOverrides` (create these objects on the volume if they don't
exist yet; every volume with any digitized test should have them, since the
override mechanism is what keeps un-digitized tests correctly showing
"Not available" instead of claiming a booklet that doesn't exist):

```js
listeningPageOverrides: { 3: 15, /* ...other already-mapped tests */ },
readingPageOverrides: { 3: 27, /* ... */ },
```

## Verification (Part 1)

Run all of these — they're cheap and each catches a different failure mode:

```bash
node .claude/skills/toeic-maker/scripts/audit-ybm.mjs vol-<N>-test-<M>   # YBM: every layer vs. every other — expect 0 ERROR
cd allinone
npm run lint
node --test src/utils/<collection>.test.js   # key format + manifest consistency
npm run build                                 # confirms no syntax/import errors
```

`<collection>.test.js` covers keys and the manifest only — it never opens a
content or transcript file — so content, transcript and asset consistency is
the audit's job, not the test suite's.

Then confirm the asset route actually serves the new files correctly. If a
local API server is already running (`api/`, `npm start`, default port
3001), hit it directly — this exercises the exact same Drive-fetch path
production uses, just via localhost:

```bash
curl -sI "http://localhost:3001/<collection>/vol-<N>-test-<M>/lc-p01.jpg"   # expect 200, image/jpeg
curl -s "http://localhost:3001/<collection>/vol-<N>-test-<M>/lc-p01.jpg" -o /tmp/check.jpg
cmp /tmp/check.jpg "allinone/public/<collection>/vol-<N>-test-<M>/lc-p01.jpg"  # expect no output = byte-identical
curl -sI "http://localhost:3001/<collection>/vol-<N>-test-<M>/listening.mp3"  # expect 200, audio/mpeg
# and confirm the range boundary is exact, not off-by-one:
curl -s -o /dev/null -w "%{http_code}\n" ".../rc-p<lastPage+1>.jpg"  # expect 404
```

If no local API server is running, don't assume the Drive URL will render
in a browser tab you open yourself — Google's CDN sets a
`Cross-Origin-Resource-Policy: same-site` header that browsers silently
enforce (blocking the embed) even though `curl` doesn't care about that
header at all and will report success. `curl` against the app's own
`/<collection>/...` route (not a raw `drive.google.com` URL) is the correct
way to verify this, in a browser or out of one — see
`.claude/rules/architecture.md` if you want the full story.

## Wrapping up Part 1

Part 1's job ends once the test loads correctly locally against a running
API — it does **not** commit or push. This repo's `public/<collection>/` is
gitignored (only `api/data/<collection>-assets/<test-id>.json` and
`allinone/src/data/<collection>/keys/<test-id>.json` are meant to be
committed — check `git status` only shows small JSON/code diffs, no
binaries, before handing back to the user). Report what got mapped, the
exact page ranges used (so they're reviewable), and that a commit+push is
what actually makes it live in production — per this repo's standing rule,
only commit when the user asks.

---

# Part 2 — Content refactor: replacing scanned pages with real text

Applies to a test that Part 1 already made playable as a scanned booklet.
This upgrades some or all of its parts to render as real HTML — selectable,
searchable text, tables, forms, and chat threads instead of a photograph of
a printed page — while the scanned-page viewer stays as the fallback for any
part not (yet) transcribed. This was built and iterated on Hacker's
`vol-2-test-01` across one long session; the reference implementation is
`allinone/src/pages/HackerReadingContent.jsx` + its CSS +
`allinone/src/data/hacker/content/AGENTS.md` (schema) +
`allinone/src/data/hacker/content/vol-2-test-01.json` (a worked example
covering every passage `kind` this schema currently supports).

## Check whether this is even cheap to do

This is the single biggest cost driver, and it varies by collection and by
book, not just by test — check it before estimating effort:

```bash
pdftotext -f <page> -l <page> -layout "<source>.pdf" -
```

If this prints real, accurate text (not garbage), the source has an
embedded text layer and transcription is fast: extract a whole part's page
range with `-layout`, then transcribe from that extracted text — cross-
checking prose paragraphs against the rendered page image rather than
reading everything by eye from scratch (see the glyph-substitution note
below). **Every Hacker source PDF checked so far has a text layer.**

If this prints nothing usable — as every YBM source PDF does, confirmed no
OCR layer at all — there is no shortcut: every word has to be transcribed by
eye (or with a vision-capable read) directly from the image, at roughly the
same per-question cost as the original answer-key-grid reading, but spread
across ~200 questions instead of 100 grid cells. Flag this cost difference
to the user explicitly before starting a YBM content refactor — it is not
the same size of task as a Hacker one, even for the "same" test structure.
(The `Script/` PDFs used for Part 3's transcripts are photographed pages too:
`pdftotext` on `Script/TEST 1.pdf` returns nothing.)

## Glyph substitution risk (text-layer sources)

Even with a real text layer, the embedded font can occasionally mismap a
single glyph — seen so far as stray `t`→`d`/`f` substitutions in a handful of
words on one page of one test (e.g. "the"→"die", "their"→"fheir"), isolated
to a specific page/font rather than spread evenly through the document.
Don't trust the text layer blind for prose paragraphs: cross-check every
passage against the rendered page image
(`allinone/public/<collection>/<test-id>/rc-pNN.jpg` /
`lc-pNN.jpg`) before committing it to the content file. Short, isolated
strings (answer choices, question numbers) are lower-risk but still worth a
spot check — this genuinely cost transcription time in practice, budget for
it rather than assuming `pdftotext` output is ground truth.

## Decide what's worth transcribing

Not every part is. Work out, per part, which of these it is:

- **Nothing printed per-question at all beyond a photo** (TOEIC Part 1) —
  no text equivalent exists, and there's no per-question image-cropping
  pipeline built yet, so it stays on the scanned page.
- **The same literal filler line printed for every item** (TOEIC Part 2 —
  real books print nothing but "Mark your answer on your answer sheet." for
  every question) — still worth transcribing, as a `text-only` item with
  **no `choices` field at all** (there's genuinely nothing to select from in
  the booklet; the answer sheet UI is still where the user actually answers,
  same as the real paper test). This is cheap and lets the page render with
  zero image downloads even though there's no unique content per item.
- **Real per-question stems/choices/passages** (everything else, typically) —
  the normal case this schema is built for.

Find the exact page boundary between "nothing worth transcribing" and
"everything transcribed from here on" **by looking directly at the rendered
page images**, not text extraction — these boundary pages are usually
dominated by photos or filler, exactly where text extraction is least
reliable. This page number becomes the content file's `imageOnlyPages` value
(see schema below), which is what lets the scanned-page viewer stop
downloading and paging through pages that are now fully redundant with the
structured view. For YBM it is the last booklet page a leading untranscribed
part still needs (`vol-1-test-01`: 5; Vols 2/3: 4) — see "What the exam does
with missing or partial layers" for the rules when only some parts are done.

## The content JSON schema

The full schema — passage `kind`s, the `graphics` mechanism for "Look at the
graphic" question groups, `batchSize`, `imageOnlyPages`, and exactly which
optional field each passage `kind` reads — is documented in
`allinone/src/data/<collection>/content/AGENTS.md` (`ybm` and `hacker` each
have one; the YBM one adds why Part 2 has no `choices` and where the text
comes from). **That file is the schema's source of truth** — update it, not
this skill, when the schema itself changes or grows a new passage `kind`;
this skill covers the *process* of getting there, not the field-by-field
reference. (The transcript schema has no AGENTS.md yet — it lives in Part 3
of this skill.)

The shape in one line: one JSON file per test
(`allinone/src/data/<collection>/content/<test-id>.json`), keyed by part
number under `parts`, either `{ type: "text-only", items: [...] }` for a
part with no shared passage, or `{ type: "passage-set", sets: [...] }` for a
part where a group of questions shares one passage/table/chart.

`source` and `note` are free text. Use `note` to describe *what is
transcribed and where the boundaries are* (which parts, which sets are
graphics, the `imageOnlyPages` reasoning) — but keep mutable status out of
it. "Not yet uploaded to Drive" was written into the notes of sixteen YBM
tests and was false for every one of them by the Sept 2026 audit
(`CONTENT-STALE-NOTE`).

**Take question numbers from the page, not from reading order.** The
riskiest slip in Part 3/4 is attaching a set's questions to the wrong
numbers: a two-page spread prints several columns, and reading them in the
wrong order renumbers whole sets (`vol-1-test-04`'s Part 3 had Q62–70 rotated
by one set and still passed every structural check). Copy each set's printed
number range, and run `verify-vs-pages.py numbering <id>` when the part is
done.

Validate the moment you finish transcribing a part, don't wait until the
whole test is done — a duplicate or missing question number is much cheaper
to spot immediately than after transcribing three more parts on top of it.
For YBM, `audit-ybm.mjs <id>` does this and more (per-part question ranges,
choices, Part 6 blank tokens, graphics). The generic one-liner:

```bash
node -e '
const data = require("./allinone/src/data/<collection>/content/<test-id>.json");
const nums = new Set();
for (const p of Object.keys(data.parts)) {
  const part = data.parts[p];
  const items = part.items || part.sets.flatMap((s) => s.items);
  items.forEach((it) => nums.add(it.number));
}
const expected = [...nums].sort((a,b)=>a-b);
console.log("count:", nums.size, "range:", expected[0], "-", expected[expected.length-1]);
console.log("gaps:", expected.filter((n,i)=>i>0 && n !== expected[i-1]+1));
'
```

## "Look at the graphic" questions: text table vs. real image

TOEIC Part 3/4 sometimes prints a table, list, or chart alongside a group of
3 questions. Before assuming it needs an image:

- **Check whether it's actually just an unstyled table or list** first — a
  TV schedule, a promo flyer, a workshop agenda. Most "Look at the graphic"
  prompts in practice are exactly this (see the `schedule`/`notice` examples
  in `vol-2-test-01.json`'s Part 3/4 `graphics`) — these transcribe cleanly
  with a `table` or `bulletList`, no image needed, and render sharper and
  searchable besides.
- **Only crop a real image** when the data itself is encoded visually, not
  just its labels — a line chart's actual trend, a spatial map's paths —
  something no reasonable amount of text reproduces. Crop it out of the full
  rendered page with ImageMagick, iterating the crop box against the actual
  image (view the crop, adjust, repeat) until it's tight:
  ```bash
  magick lc-pNN.jpg -crop WxH+X+Y +repage lc-graphic-NNN.jpg
  ```
  Save it alongside the page images in the test's asset folder
  (`allinone/public/<collection>/<test-id>/`), reference it from a
  `kind: "graphic"` passage (`{ asset: "lc-graphic-093.jpg", alt: "..." }`
  — write a real, specific `alt` describing what the image actually shows,
  not just its filename). **This new file needs to go along in the next
  Drive upload for that test** — it lives under the same gitignored
  `public/<collection>/<test-id>/` folder as the page images, so it won't
  reach production on its own; re-run
  `api/scripts/upload-<collection>-assets.js <test-id>` after adding it.
  Naming: `lc-graphic-<NNN>.jpg`, where `NNN` is a zero-padded question
  number *in the group* — usually the "Look at the graphic" question
  (`vol-1-test-01`: Q96 → `lc-graphic-096.jpg`, Q100 → `lc-graphic-100.jpg`)
  but not always (`vol-1-test-04` names the store floor plan for Q62–64
  `lc-graphic-064.jpg`; its graphic question is Q63). The name is only an
  identifier: don't rename an existing crop, because the content `asset` and
  the Drive manifest must agree and a rename means a fresh upload plus an old
  Drive file only the user can delete. It must be a `.jpg` (the asset route
  serves nothing else); cut it from the `lc-pNN.jpg` it appears on. The group
  still needs its `graphics` entry
  (`{ questions: [95, 96, 97], passage: { kind: "graphic", asset, alt } }`).

## Building the renderer

The renderer is collection-specific: `allinone/src/pages/HackerReadingContent.jsx`
for Hacker and `allinone/src/pages/YbmReadingContent.jsx` for YBM. **Both
already exist and are wired into their exam pages, so adding or extending a
test needs no renderer work** — the rest of this section only matters when
you add a *new collection* (a bigger first-time lift than adding a test to an
already-built renderer, since it means designing the `Passage` component's
kind-switch from scratch) or change renderer behavior. Then don't start from
zero: `YbmReadingContent.jsx` (or its Hacker twin) + its CSS +
`content/AGENTS.md` together are a complete, working reference
implementation — copy the pattern (unit-building logic, `Passage` kind
switch, batching, the image/structured handoff) rather than reinventing it,
adjusting only the collection-specific pieces (the asset-URL helper, the
manifest import, CSS class prefix if you want one).

Design lessons worth carrying into any new instance of this renderer,
regardless of collection — each of these was a real bug found and fixed
during `vol-2-test-01`'s refactor, in the order they came up:

- **Express every navigation boundary generically — never as a hardcoded
  N-part split.** The image-mode ↔ structured-content handoff (Next/Prev
  crossing between a part with no transcribed content and one that has it)
  and the section-boundary handoff (Listening's last question handing off
  into Reading's first) were both written as "find the nearest part
  before/after the current one that does/doesn't have content" — never as
  "Part 1 is images, Part 2+ is content." That genericity is what let Part 2
  get transcribed *later*, after the Part 1↔3 handoff already worked, with
  **zero changes** to the handoff logic itself — it just started resolving
  differently. A hardcoded boundary would have needed a matching code change
  every time more content got transcribed.
- **Wire the reverse of every fix you make, immediately.** Every
  one-directional gap here (Next dead-ending at a part boundary, Next
  dead-ending at a section boundary, the scanned-page viewer downloading and
  paging through pages that structured content had already made redundant)
  had a mirror-image Prev bug that wasn't reported until a separate later
  message. Check both directions the first time a boundary bug is fixed, not
  just the one direction that got reported.
- **Batch standalone items instead of one-per-screen**, when a part has no
  shared passage — a lone question with 4 short choices leaves most of the
  screen empty otherwise. Default to a handful per screen (3 worked well),
  but make it overridable per part (`batchSize`) for a part where the
  *entire* printed page is one uniform, low-content list (Part 2's 25
  "Mark your answer" lines) — that should render as one screen matching the
  physical page, not several near-empty ones.
- **Use CSS Grid with `grid-auto-flow: column`, not CSS multicol
  (`column-count`), for a book-matching two-column layout.** Multicol didn't
  reliably render in this session's own preview/screenshot tooling even
  though the CSS itself was correct — Grid with an explicit `--rows` custom
  property (set from JS as `Math.ceil(items.length / 2)`) reproduces the
  same top-to-bottom-then-next-column fill the printed page uses, and
  rendered correctly everywhere it was tested. Worth remembering as a
  portability gotcha, not just a style preference.
- **Only render a `choices` block when the item actually has one.** A part
  transcribed purely for its filler text (Part 2) has items with no
  `choices` field at all — the renderer should skip that block entirely
  rather than crash on `undefined`, and shouldn't invent placeholder choices
  just to keep every item's shape uniform.

## Verifying without logging in

The real exam route needs a logged-in student account (`LearningRoute`
gate), which usually isn't available in this environment, and standing one
up needs a local API + database + seeded user — real setup cost for what
should be a quick check. Rather than skipping verification, render the
actual component against real content data using Vite's own SSR module
loader — no auth, no database, no running app needed, and it's genuinely the
same module graph and CSS the real app uses:

```js
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const server = await createServer({ root: process.cwd(), server: { middlewareMode: true }, appType: 'custom' });
const { default: HackerReadingContent } = await server.ssrLoadModule('/src/pages/HackerReadingContent.jsx');
const { getReadingContent, getAnswerKey, getAssetUrl } = await server.ssrLoadModule('/src/utils/hacker.js');

const content = getReadingContent('<test-id>');
const html = renderToStaticMarkup(createElement(HackerReadingContent, {
  content, section: 'reading', focus: 101, onFocusChange: () => {}, selections: {},
  onSelect: () => {}, disabled: false, correctAnswers: getAnswerKey('<test-id>').answers,
  assetUrl: (f) => getAssetUrl('<test-id>', f),
}));
await server.close();
```

Run this from a scratch `.mjs` file **inside `allinone/`** (not the
scratchpad, not the repo root) so `vite`/`react` resolve via the project's
own `node_modules` — Node resolves modules from the *script's own location*,
not the current working directory, so a script outside `allinone/` will
fail to find them even if you `cd` there first.

**YBM variant** — verified against `vol-1-test-01` (8 of 8 assertions passed).
Differences from the Hacker snippet: the component is `YbmReadingContent`,
content loads asynchronously via `loadReadingContent`, question ids are
`ybr-q-<n>`, and the component also takes the section-handoff props:

```js
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const server = await createServer({ root: process.cwd(), server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const { default: YbmReadingContent } = await server.ssrLoadModule('/src/pages/YbmReadingContent.jsx');
const { loadReadingContent, getAnswerKey, getAssetUrl } = await server.ssrLoadModule('/src/utils/ybm.js');

const id = '<test-id>';
const content = await loadReadingContent(id);
const render = (section, focus, over = {}) => renderToStaticMarkup(createElement(YbmReadingContent, {
  content, section, focus, onFocusChange() {}, selections: {}, onSelect() {}, disabled: false,
  correctAnswers: getAnswerKey(id).answers, assetUrl: (f) => getAssetUrl(id, f),
  nextSectionLabel: 'Reading', onGoToNextSection: () => {}, onGoToPreviousPart: () => {}, ...over,
}));
// render('listening', 7).includes('id="ybr-q-31"')               — Part 2's 25 items on one screen
// render('listening', 96).includes('lc-graphic-096.jpg')          — a kind:"graphic" crop
// render('listening', 100).includes('Continue → Reading')         — end-of-section handoff
// (render('reading', 131).match(/ybr-blank/g) || []).length       — Part 6 blank badges
// pass onGoToPreviousPart: null / onGoToNextSection: null to assert a disabled Prev / Next
await server.close();
```

This catches real bugs, not just "does it throw" — it caught a genuine one
this session (a 3-digit question number overflowing its fixed-width column,
invisible until actually rendered). Two complementary checks are worth
doing:

- **Fast automated assertions** on the output string — `html.includes('id="hkr-q-104"')`
  to confirm a specific question rendered, a boundary button's
  `disabled` attribute present/absent as expected, a specific passage
  heading present. Cheap enough to run for every boundary condition you can
  think of (first/last question of a part, first/last of a section, a
  graphic-group unit, a choice-less item) in one script.
- **One real visual check** — render a couple of representative units to a
  standalone HTML file (inline the actual CSS files read from disk, wrap the
  component's output in `.ybm-exam` with `data-theme="dark"` so the
  `--exam-*` theme custom properties resolve), then open it in the Browser
  pane and screenshot it. This is what actually shows a layout bug that a
  string assertion can't — the column-overflow bug above was caught this
  way, not by an assertion.

**Delete every scratch script and scratch HTML file afterward** — they're
not part of the deliverable, and shouldn't linger in the repo.

## Wrapping up a content refactor

Unlike Part 1's binary assets, everything this produces is real tracked
source: the content JSON, the renderer component/CSS, and any `AGENTS.md`
schema updates all get committed as normal code changes when the user asks —
this repo's standing "only commit when asked" rule still applies, there's
just no gitignored-binary distinction to worry about for these particular
files. A newly cropped `kind: "graphic"` image, though, *is* a gitignored
local asset like any page image — flag clearly that it still needs a Drive
upload (`api/scripts/upload-<collection>-assets.js <test-id>`) before it'll
actually appear in production.

If the refactor makes some already-uploaded scanned page images fully
redundant (every part on those pages is now transcribed), surface that to
the user, but don't act on it unprompted:

- **Deleting the local copies** is safe and fully reversible — regenerate
  them any time via `render-pages.mjs` from the source PDF — and is a
  reasonable thing to just do once confirmed redundant.
- **Removing them from Google Drive** is a real, hard-to-reverse action on
  shared production storage. It needs the user's explicit go-ahead in chat
  first, and may not even be *possible* from this session — the connected
  Drive account might not be the one that owns the app's uploaded assets.
  Try one `trash_file` call before assuming the rest will succeed, and if it
  comes back a permission error (or Claude Code's own auto-mode classifier
  blocks the action outright, which it may for a bulk-delete-shaped
  operation), stop and report that back rather than working around it —
  don't keep retrying through other tools to force the same action through.

---

# Part 3 — Listening transcripts

Applies to a test whose Listening booklet and key already work (Part 1). It
adds `allinone/src/data/ybm/transcripts/<test-id>.json`, which the exam shows
**after Submit**, in the Listening section, under the audio player: the entry
whose `from`–`to` range contains the focused question, with the `(A)…(D)`
line matching the answer key highlighted. Nothing else changes — no code, no
manifest, no Drive upload — and a test without one simply shows no panel.

**Sources.** `render-pages.mjs` lists a `script` PDF for Vol 1 only:
`Script/TEST N.pdf`, the Listening script with Korean translation (번역),
explanations (해설) and vocabulary (어휘), photographed (no text layer),
28–30 pages, ending at Q100.

**Vol 2 has one too, just not registered in `render-pages.mjs`:** the
answers-and-explanations section of `lc 1000 - 2.pdf` (the same file the
listening key comes from) prints each question's English script — Part 1
statements, Part 2 question + responses, Part 3/4 in speaker-tagged boxes —
with 번역/어휘/해설 beside it. Test 1 is pages 171–200 (its answer grid is
p. 171; Test 2's grid is p. 201, so a test is ~30 pages). Render them with
`pdftoppm -jpeg -r 140 -f <first> -l <last> "<pdf>" s` into the scratchpad and
read in order, same as Vol 1. Because `render-pages.mjs` has no `script:` entry
for Vol 2, the audit files a missing Vol 2 transcript as INFO, not TODO. YBM
Vol 3: not checked.

**Hacker transcripts (Vols 2 and 3, built).** Hacker's `… LISTENING
TRANSCRIPT.pdf` files have a text layer, so their transcripts are *generated*, not
read by eye: `python3 scripts/hacker/build-transcripts.py` (add `--vol 3 --pdf
<Vol 3 transcript PDF>` for Vol 3) writes
`allinone/src/data/hacker/transcripts/<id>.json` in the same shape as YBM's. Read
`allinone/src/data/hacker/transcripts/AGENTS.md` first — the one real difference
is speaker tags: Hacker prints accents only (no gender outside Part 3's `M:`/`W:`
labels), so Parts 2 and 4 use accent-only tags (`Br|…`), not YBM's `W-Br|`. The
same PDF opens every test with its printed answer key, a free second signal for
the listening key (all 2,000 listening letters in Hacker Vol 2-3 `keys/` match it;
Vol 3's reading answers are also printed in `RC/KEY _ HACKER 3 READING_.pdf`,
1,000/1,000 match). Vol 3's text layer is better than Vol 2's, so a content check
works as: numbering by `NNN.` line, plus two independent text readings (the PDF
layer and a tesseract pass) — anything in the JSON found in neither is a flag for
a human to look at the page; map/layout descriptions the transcriber wrote are
the main thing to verify by eye.

## Schema

Shape: `{ "testId": "<id>", "entries": [{ "from": N, "to": M, "lines": [...] }] }`
(examples under "Data shapes").

- **Entries tile Q1–100 exactly once**, grouped the way the exam is: Parts 1
  and 2 → one entry per question (6 + 25); Parts 3 and 4 → one entry per
  3-question set (13 + 10). That is 54 entries per test.
- **A line is `"Speaker|text"` for a spoken line, or plain `"(A) text"` for a
  choice or photo description.** Speaker tags are the ones printed on the
  page — `W-Am`, `M-Au`, `W-Br`, `M-Cn` (gender, then accent). The app parses
  them with `parseTranscriptLine` in `utils/ybm.js` (1–3 letters, optionally
  `-` plus 2–3 letters).
- **Per part:**
  - Part 1 — four untagged lines, `(A)…(D)`, the statements (the `W-Am` tag
    printed beside the photo is dropped).
  - Part 2 — four lines: the question `"W-Br|Why are you…?"`, the first
    response `"M-Cn|(A) …"`, then untagged `"(B) …"` and `"(C) …"`.
  - Part 3 — one tagged line per turn (3–8 lines, two or three speakers).
  - Part 4 — the whole talk as one tagged line.
- **The exam does the highlighting**, by matching a line that starts with
  `(X)` against the key's answer for the focused question — so keep the `(A)`
  prefix exactly, and don't mark the correct answer yourself. This only
  applies to Parts 1–2; Part 3/4 lines carry no choices.
- **English only.** Skip 번역, 해설 and 어휘. Transcribe as printed —
  punctuation, contractions, capitalization.
- Optional top-level `"kind": "summary"` relabels the panel "Summary" instead
  of "Transcript"; nothing uses it yet.

## Making one

1. **Get the script pages.** The normal render already left `sc-p01…` in
   `allinone/public/ybm/<id>/`; otherwise
   `node scripts/ybm/render-pages.mjs --vol 1 --test M --script-only --out <scratchpad>/ybm`
   writes them to `<scratchpad>/ybm/vol-1-test-MM/`. Move them out of the
   served folder before any Drive upload.
2. **Read them in book order.** `sc-p01` opens with the answer grid and
   Part 1; Parts 2, 3 and 4 follow to Q100. Zoom into a dense page
   (`magick sc-pNN.jpg -crop WxH+X+Y +repage -resize 200% crop.png`) rather
   than guessing a word.
3. **Write the entries part by part** into `transcripts/<id>.json`, and run
   `audit-ybm.mjs <id>` after each part — `TR-COVERAGE` catches gaps,
   `TR-GROUPING` wrong-sized entries, `TR-LINES` missing choices or speaker
   tags.
4. **Cross-check against the page.** Sample three or four entries per part
   against their script page. For Parts 1–2, compare the red choice on the
   page with the key: a mismatch means the *key* is wrong, not the transcript
   (Part 1 → "Vol 1 (2025 edition)").
5. Commit only the JSON, and only when asked.
