---
name: toeic-maker
description: Turns scanned TOEIC book source material (PDFs/MP3s) into a playable test in this repo's YBM or Hacker collections (allinone/ + api/), and/or upgrades an already-digitized test's Reading/Listening parts from scanned page images into real structured HTML. Use this whenever the user asks to "digitize", "add", "process", "map", or "wire up" a specific test — e.g. "do vol 2 test 3", "add the next test", "digitize Vol 1 Test 6" — or asks why a test shows "Not available". Also use it if a test's booklet pages or answer key look wrong (same steps fix an existing one), or when the user asks to "refactor", "convert to text", "make it real HTML instead of images", or otherwise extend an already-digitized test's content the way vol-2-test-01 (Hacker) was done.
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

## Two things this skill covers

- **Part 1 — Digitizing a new test**: turn scanned source PDFs/MP3s into
  booklet page images + an answer key + audio, uploaded to Drive and wired
  into the manifest so the test is playable at all (as a scanned booklet).
- **Part 2 — Content refactor**: for a test that's *already* playable via
  Part 1, transcribe its question stems/choices/passages into structured
  JSON and render them as real HTML instead of the scanned page — this is
  what turned Hacker's `vol-2-test-01` from "flip through booklet photos"
  into the current text UI, across several rounds of fixes in the same
  session. A test needs Part 1 done before Part 2 applies to it.

A request to "do the next test" almost always means Part 1. A request to
"refactor", "convert", or reporting that a specific already-playable test's
UI should work like another one that already got the Part 2 treatment,
means Part 2.

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
`api/data/<collection>-assets/vol-<N>-test-<M>.json` (a small, git-friendly
`{ filename: driveFileId }` map — this is what makes it unnecessary to ever
commit the actual images/audio to the repo). **Don't** grant the uploaded
files public/"anyone with link" access — the API streams them with its own
credentials via `GET /<collection>/:testId/:filename`, so making them public
would just be unnecessary exposure. If you see upload script code doing
that, something regressed; it shouldn't.

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
cd allinone
npm run lint
node --test src/utils/<collection>.test.js   # key format + manifest consistency
npm run build                                 # confirms no syntax/import errors
```

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
structured view.

## The content JSON schema

The full schema — passage `kind`s, the `graphics` mechanism for "Look at the
graphic" question groups, `batchSize`, `imageOnlyPages`, and exactly which
optional field each passage `kind` reads — is documented in
`allinone/src/data/hacker/content/AGENTS.md`. **That file is the schema's
source of truth** — update it, not this skill, when the schema itself
changes or grows a new passage `kind`; this skill covers the *process* of
getting there, not the field-by-field reference.

The shape in one line: one JSON file per test
(`allinone/src/data/<collection>/content/<test-id>.json`), keyed by part
number under `parts`, either `{ type: "text-only", items: [...] }` for a
part with no shared passage, or `{ type: "passage-set", sets: [...] }` for a
part where a group of questions shares one passage/table/chart.

Validate the moment you finish transcribing a part, don't wait until the
whole test is done — a duplicate or missing question number is much cheaper
to spot immediately than after transcribing three more parts on top of it:

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

## Building the renderer

The renderer is currently collection-specific
(`allinone/src/pages/HackerReadingContent.jsx` for Hacker; nothing
equivalent exists yet for YBM — building one is a bigger first-time lift
than adding a test to an already-built renderer, since it means designing
the `Passage` component's kind-switch from scratch). If you're the first to
do this for a collection, don't start from zero: `HackerReadingContent.jsx`
+ its CSS + `content/AGENTS.md` together are a complete, working reference
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
