# AGENTS.md — `src/data/hacker/content/`

Transcribed Part 2-7 content for Hacker tests, as real text instead of the
scanned booklet page images the rest of the pipeline serves (see the YBM
asset pipeline section of `.claude/rules/architecture.md` — this content
sits on top of that pipeline, it doesn't replace it: Part 1 and any
not-yet-transcribed part still render from the booklet image served at
`/hacker/:testId/:filename`).

## Why Part 1 stays images, and where the source text comes from

Part 1 (photos) prints nothing per-question but the photo itself — there's
no text to transcribe, and no per-question image-cropping pipeline exists
yet, so it stays on the scanned page. Part 2 (question-response) *is*
transcribed even though every one of its items is the same literal line,
"Mark your answer on your answer sheet." — that's genuinely everything the
book prints for it, so the item's `stem` is just that sentence with no
`choices` (there's nothing to select from in the booklet; the answer sheet
UI is still where the user actually answers, same as the real paper test —
see "Items with no `choices`" below). Only Part 1 has actual photographic
content this schema can't represent.

The Hacker source PDFs (`/Volumes/Samsung_T5/Download/Hacker/...`, outside
the repo) are 300dpi scans **with an embedded text layer** — unlike YBM's,
which have none. `pdftotext -layout` on a PDF's page range for a test
extracts accurate, correctly-ordered text, but the embedded font
occasionally mismaps a glyph (seen so far as stray `t`→`d`/`f` substitutions
in a few words on one Reading page, e.g. "the"→"die", "their"→"fheir"; every
Listening page checked so far had no such errors). Always cross-check the
extracted text against the rendered booklet image
(`allinone/public/hacker/<test-id>/rc-pNN.jpg` or `lc-pNN.jpg`) before
transcribing a passage — don't trust the text layer blind for prose
paragraphs. Question stems and answer choices (short, isolated strings) are
lower-risk but still worth a spot check.

## `imageOnlyPages`

`{ [section]: N }` at the file's top level — how many *leading* pages of that
section's scanned booklet still belong to a part with no transcribed content
(just Part 1, for Listening, once Part 2 is done). `allinone/src/pages/HackerExam.jsx` uses this to cap the scanned-page viewer's Prev/Next and
preloading at page N instead of the section's full physical page count, and
to hand off into the first transcribed part once page N is reached —
otherwise a user paging through images would keep downloading and flipping
through later parts' raw scans (now redundant with the structured view) all
the way to the booklet's last page before finding any way forward. Find N by
looking directly at the rendered page images around where the last
untranscribed part ends (text extraction is unreliable there — those pages
are mostly photos, not prose). Omit the section's key entirely once every
part in that section is transcribed (Reading, once Parts 5-7 are all done,
needs no entry).

The same handoff also works in reverse: from the first transcribed unit of a
section, Prev jumps back into the image viewer at page N. Both directions
are generic over how many image-only vs. transcribed parts a section has —
they were written for a 2-part split (Part 1 image, Part 2+ transcribed) and
needed no changes when Part 2 itself became transcribed, because they always
resolve "nearest part without/with content" rather than assuming a fixed
boundary.

## Schema

One file per test, keyed by part number under `parts`:

- `parts["2"]`, `parts["3"]`, `parts["4"]`, `parts["5"]` — `{ type: "text-only", items: [{ number, stem, choices?: {A,B,C,D} }], graphics?: [...], batchSize?: N }`. No shared passage; Part 5's `stem` has the blank as `_______`. Parts 3/4 add an optional `graphics` array — see below. `batchSize` overrides the default of 3 standalone items per screen (see "Standalone item batching" below); Part 2 sets it to 25 so its one real "page" of content renders as one screen instead of nine.
- `parts["6"]` — `{ type: "passage-set", sets: [{ id, questions: [n,n,n,n], instruction, passage: {...}, items: [{ number, type?, choices }] }] }`. Each set's `passage.paragraphs` embeds inline blank tokens `[[131]]` etc. — the renderer (`allinone/src/pages/HackerReadingContent.jsx`) swaps these for a numbered badge. `items` omit `stem` (the blank position in the passage *is* the stem); the sentence-insertion item in each set carries `"type": "sentence"` so its choices render as full lines instead of single words — that's presentational only, scoring doesn't care.
- `parts["7"]` — `{ type: "passage-set", sets: [{ id, questions: [...], instruction, passages: [{...}, ...], items: [{ number, stem, choices }] }] }`. `passages` is 1-3 entries for single/double/triple-passage sets.

### Items with no `choices`

`choices` is optional on a `text-only` item. Omit it — as Part 2's items do —
when the book genuinely prints nothing to choose from for that question;
`HackerReadingContent.jsx`'s `QuestionItem` just skips rendering the choices
row rather than crashing on `undefined`. Don't omit it as a shortcut when
choices exist but are merely rare to type out — always transcribe what's
printed if there's anything there.

### Standalone item batching

Items with no shared passage or graphic still batch a few to a screen
(`STANDALONE_BATCH_SIZE`, default 3, overridable per part via `batchSize`)
rather than showing one per screen, since a lone question leaves most of the
booklet panel empty. Graphic groups (below) are unaffected — they always
render as printed, regardless of `batchSize`.

### Part 3/4 `graphics`

A Part 3 or 4 conversation/talk sometimes prints a table, notice, or chart
next to its 3-question block (a TOEIC "Look at the graphic" question). Model
that as an entry in the part's `graphics` array: `{ questions: [n,n,n], passage: {...} }`. The renderer (`HackerReadingContent.jsx`'s `buildUnits`)
collapses those 3 items into one navigation unit around the shared passage,
the same way a Part 6/7 set does — even though only one of the three
questions actually says "Look at the graphic." Don't add a `graphics` entry
for a group whose table has no reason to render as one HTML block; leave
those items as ordinary standalone entries in `items`.

### Passage `kind`s

A `passage` object's shape varies by `kind` (`letter`, `email`, `notice`,
`article`, `report`, `invitation`, `ticket`, `chat`, `webpage`, `schedule`,
`invoice`, `newsletter`, `program`, `form`, `graphic`) — see the renderer's
`Passage` component for exactly which optional fields each kind reads
(`heading`, `meta`, `addressBlock`/`date`/`salutation` for letters,
`messages` for chat, `table`/`totalRow` for tabular docs, `fieldRows` for
forms, `days` for the class-schedule program, etc.). Add fields there before
using a new one in content data, and keep them optional — the renderer skips
whatever a given passage doesn't set.

`kind: "graphic"` is the escape hatch for a Part 3/4 visual that genuinely
isn't text-representable — a line chart, a spatial map — where the data
itself, not just its labels, is encoded visually. `{ kind: "graphic", asset: "lc-graphic-093.jpg", alt: "..." }` points at a cropped image cut from the
full booklet page with ImageMagick (`magick lc-pNN.jpg -crop WxH+X+Y +repage lc-graphic-NNN.jpg`, iterate the crop box against the source image
until it's tight), saved alongside the page images in the test's asset
folder, served through the same `getAssetUrl` helper `utils/hacker.js`
already exposes for page images. **Before reaching for `graphic`, check
whether the visual is actually just an unstyled table or list** (most "Look
at the graphic" prompts in these books are — see the `schedule`/`notice`
examples in `vol-2-test-01.json`'s Part 3/4 `graphics`) — text renders
sharper, is searchable, and needs no crop-tuning or Drive upload step.

Because these crops live under `allinone/public/hacker/`, which is
gitignored like the rest of that pipeline's local assets, **a new
`kind: "graphic"` crop needs to be included the next time
`api/scripts/upload-hacker-assets.js` runs for that test** or it will 404 in
production even though it works in local dev.

## Answers stay in `keys/`

This schema never carries the correct answer — `utils/hacker.js`'s
`scoreAttempt` still reads `keys/<test-id>.json` exactly as it does for a
test with no transcribed content. Content and scoring are independent; a
content file with a bug never changes what counts as correct.

## Adding a test

1. Confirm `keys/<test-id>.json` and the rendered booklet images already exist (this is transcription, not digitization — see the `toeic-maker` skill's Part 1 for producing those first).
2. `pdftotext -f <first> -l <last> -layout <source pdf>` for the test's reading and/or listening page range (see `scripts/hacker/render-pages.mjs`'s `pageRanges` for the range).
3. Transcribe part by part into the schema above, cross-checking prose paragraphs and any "Look at the graphic" pages against the rendered images as described.
4. Validate: every relevant question number appears exactly once across the transcribed parts' `items` (directly, or nested in a `sets[].items`/`graphics[]` group), and every item that has `choices` has all of them (4, or 3 for Part 2's own question-response range). A quick Node script with `require()` on the JSON and a duplicate/missing-number check (as used while building `vol-2-test-01.json`) catches most mistakes before they reach the app.
