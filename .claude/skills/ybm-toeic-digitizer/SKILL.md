---
name: ybm-toeic-digitizer
description: Digitizes one TOEIC full test (booklet page images, listening audio, answer key) from scanned source PDFs/MP3s into the YBM feature of this repo (allinone/ + api/), then uploads the result to Google Drive and wires it into the app so it's playable. Use this whenever the user asks to "digitize", "add", "process", "map", or "wire up" a specific YBM/TOEIC test — e.g. "do vol 2 test 3", "add the next test", "digitize Vol 1 Test 6" — or asks why a test shows "Not available" in the YBM screen. Also use it if the user reports a YBM test's booklet pages or answer key look wrong, since the same page-boundary/key-transcription steps apply to fixing an existing one.
---

# YBM TOEIC test digitizer

Turns one test's worth of scanned source material into a playable entry in
this app's YBM TOEIC feature. This is a **repo-specific pipeline** — it only
makes sense inside `/Volumes/Samsung_T5/My Work`, and depends on the scripts,
manifest, and Drive-backed asset route that already exist here. Read
`.claude/rules/architecture.md`'s "YBM asset pipeline" section first if you
haven't — it's the map this skill is a detailed instance of.

## Why this exists

The source books are 300dpi scans with no OCR/text layer, digitized book
appears to have consistent structure but individual tests vary in page count,
and the answer keys are large image tables you have to read by eye. None of
that is a "just run a script" problem — it needs a page-boundary hunt through
the actual scans before any script can run. This skill is that hunt, written
down so it doesn't have to be re-derived from scratch each time.

## Before you start: check what already exists

1. Read `allinone/src/data/ybm/manifest.js` — `VOLUMES[].listeningPageOverrides`
   / `readingPageOverrides` tell you which tests in which volumes are already
   mapped. Don't redo one that's already there.
2. Read `scripts/ybm/render-pages.mjs`'s `VOLUME_SOURCES` — it may already
   know the source file paths for this volume, and may already have some
   tests' `pageRanges` filled in (useful as a sanity-check pattern for the
   new test you're adding).
3. Find the source material. It lives outside the repo, typically under
   `/Volumes/Samsung_T5/Download/YBM/Vol <N>/...`. Two source shapes exist —
   figure out which one you have before doing anything else, since it changes
   the whole approach:
   - **Per-test split PDFs** (e.g. `Vol 1/2025 edition/.../LC/TEST 1.pdf`,
     `RC/TEST 1.pdf`) — each test is already its own file. Skip straight to
     "Extracting page images" below; no boundary-hunting needed. This is the
     `perTest: true` shape in `render-pages.mjs`.
   - **One combined PDF per section covering all 10 tests** (e.g.
     `Vol 2/YBM TOEIC 2/lc 1000 - 2.pdf`, `rc 1000 - 2.pdf`) — this is the
     hard case and what the rest of this skill is mostly about. This is the
     `pageRanges` shape.
   - Also check for a per-test audio folder (e.g. `file nghe/Test 05.mp3` or
     `Audio/Test 05.mp3`) and, separately, whether an **answer key** source
     exists as its own file (some volumes ship a standalone key PDF/DOCX —
     check the volume's folder for anything like `KEY LC.pdf`, `RC Key.pdf`,
     or a `해설` folder — which is far easier than the grid-hunting described
     below and should be preferred when available).

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

Add the confirmed ranges to `scripts/ybm/render-pages.mjs`'s
`VOLUME_SOURCES[<vol>].pageRanges[<test>]`, e.g.:

```js
pageRanges: {
  3: { listening: [123, 137], reading: [201, 228] },
},
```

Then run it from the repo root:

```bash
node scripts/ybm/render-pages.mjs --vol <N> --test <M>
```

This writes `allinone/public/ybm/vol-<N>-test-<M>/lc-p01.jpg ...` and
`rc-p01.jpg ...`, renumbered relative to the range you gave it (page 1 of the
range becomes `lc-p01.jpg`, regardless of its absolute PDF page number). It
logs how many pages it found for each section and whether it found the
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
verification.

**Try the reading-section tail appendix first, if this book has one** (check
"Before you start" — some volumes' combined reading PDF prints a compact key
appendix, 5 columns × 20 rows, no explanations, in its own last ~10 pages,
one page per test, in descending order — i.e. the last page is Test 10, and
`page = last_page - (10 - testNumber)`). This has consistently been faster
and lower-risk than the explanations-section grid below: it renders clearly
even at low DPI, needs no cropping, and the descending-order rule predicts
the exact page on the first try if you know one other test's key page in the
same book as an anchor (check an already-committed
`allinone/src/data/ybm/keys/*.json`'s `readingSource` citation).

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
multi-round search into a single confirmed guess. If a standalone key file
exists instead (see "Before you start" above), use that instead of either
scanned-grid approach — it's much less error-prone than reading a scan by
eye.

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
per column, e.g. col 1 = 101-120, col 2 = 121-140, ...) — this book series
uses row-major for the LC explanations-section grid and column-major for
both the RC explanations-section grid and the RC tail-appendix grid, so
don't assume they match. Verify by checking that consecutive question
numbers in your assembled string land where the image shows them.

Write `allinone/src/data/ybm/keys/vol-<N>-test-<M>.json`:

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
cd allinone && node --test src/utils/ybm.test.js
```

This checks (among other things) that every key is 100 letters of `A-D`,
that Part 2 questions (7-31) never answer `D` (TOEIC Part 2 only offers 3
choices — a `D` there means you misread the grid or the row/column mapping),
and that the key resolves to a real manifest entry. Treat a failure here as
a transcription error to go back and re-check, not a test bug.

## Audio

Copy the source MP3 to `allinone/public/ybm/vol-<N>-test-<M>/listening.mp3`,
then re-encode it — these come as ~44MB 128kbps stereo files, which is
wasteful for what's spoken-word exam audio:

```bash
cd allinone/public/ybm/vol-<N>-test-<M>
ffmpeg -y -i listening.mp3 -ac 1 -b:a 64k -codec:a libmp3lame listening.opt.mp3
mv listening.opt.mp3 listening.mp3
```

64kbps mono is plenty clear for speech and roughly halves the file size.
Sanity check the duration didn't change (`afinfo listening.mp3` or
`ffprobe`) — should still be ~45-47 minutes for a full listening section.

## Uploading to Drive and wiring it up

Run the existing upload script, which pushes the whole
`allinone/public/ybm/vol-<N>-test-<M>/` folder to this app's configured
Google Drive and writes the manifest the backend reads at request time:

```bash
cd api && node scripts/upload-ybm-assets.js vol-<N>-test-<M>
```

This needs a working `DriveConfig` in the database `api/.env`'s
`DATABASE_URL` points at (it reuses `services/googleDriveService.js`, the
same credentials the rest of the app already uses — nothing new to
configure). It creates an `ybm/vol-<N>-test-<M>/` folder in Drive if needed,
uploads every file, and writes
`api/data/ybm-assets/vol-<N>-test-<M>.json` (a small, git-friendly
`{ filename: driveFileId }` map — this is what makes it unnecessary to ever
commit the actual images/audio to the repo). **Don't** grant the uploaded
files public/"anyone with link" access — the API streams them with its own
credentials via `GET /ybm/:testId/:filename`, so making them public would
just be unnecessary exposure. If you see upload script code doing that,
something regressed; it shouldn't.

Then update `allinone/src/data/ybm/manifest.js` — add the page counts you
confirmed earlier to that volume's `listeningPageOverrides` /
`readingPageOverrides` (create these objects on the volume if they don't
exist yet; every volume with any digitized test should have them, since the
override mechanism is what keeps un-digitized tests correctly showing
"Not available" instead of claiming a booklet that doesn't exist):

```js
listeningPageOverrides: { 3: 15, /* ...other already-mapped tests */ },
readingPageOverrides: { 3: 27, /* ... */ },
```

## Verification

Run all of these — they're cheap and each catches a different failure mode:

```bash
cd allinone
npm run lint
node --test src/utils/ybm.test.js   # key format + manifest consistency
npm run build                        # confirms no syntax/import errors
```

Then confirm the asset route actually serves the new files correctly. If a
local API server is already running (`api/`, `npm start`, default port
3001), hit it directly — this exercises the exact same Drive-fetch path
production uses, just via localhost:

```bash
curl -sI "http://localhost:3001/ybm/vol-<N>-test-<M>/lc-p01.jpg"   # expect 200, image/jpeg
curl -s "http://localhost:3001/ybm/vol-<N>-test-<M>/lc-p01.jpg" -o /tmp/check.jpg
cmp /tmp/check.jpg "allinone/public/ybm/vol-<N>-test-<M>/lc-p01.jpg"  # expect no output = byte-identical
curl -sI "http://localhost:3001/ybm/vol-<N>-test-<M>/listening.mp3"  # expect 200, audio/mpeg
# and confirm the range boundary is exact, not off-by-one:
curl -s -o /dev/null -w "%{http_code}\n" ".../rc-p<lastPage+1>.jpg"  # expect 404
```

If no local API server is running, don't assume the Drive URL will render
in a browser tab you open yourself — Google's CDN sets a
`Cross-Origin-Resource-Policy: same-site` header that browsers silently
enforce (blocking the embed) even though `curl` doesn't care about that
header at all and will report success. `curl` against the app's own
`/ybm/...` route (not a raw `drive.google.com` URL) is the correct way to
verify this, in a browser or out of one — see `.claude/rules/architecture.md`
if you want the full story.

## Wrapping up

This skill's job ends once the test loads correctly locally against a
running API — it does **not** commit or push. This repo's `public/ybm/` is
gitignored (only `api/data/ybm-assets/<testId>.json` and
`allinone/src/data/ybm/keys/<testId>.json` are meant to be committed — check
`git status` only shows small JSON/code diffs, no binaries, before handing
back to the user). Report what got mapped, the exact page ranges used (so
they're reviewable), and that a commit+push is what actually makes it live
in production — per this repo's standing rule, only commit when the user
asks.
