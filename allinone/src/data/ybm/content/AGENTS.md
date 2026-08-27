# AGENTS.md — `src/data/ybm/content/`

Transcribed Part 2-7 content for YBM tests, as real text instead of the
scanned booklet page images the rest of the pipeline serves (see the YBM
asset pipeline section of `.claude/rules/architecture.md` — this content
sits on top of that pipeline, it doesn't replace it: Part 1 and any
not-yet-transcribed part still render from the booklet image served at
`/ybm/:testId/:filename`). This mirrors `data/hacker/content/AGENTS.md`
file-for-file — same schema, same renderer pattern
(`allinone/src/pages/YbmReadingContent.jsx` mirrors
`HackerReadingContent.jsx`) — with one load-bearing difference in how the
source text is obtained, below.

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

**Unlike Hacker's source PDFs, YBM's have no embedded text layer at all** —
confirmed on every YBM source checked so far (300dpi scans, `pdftotext`
returns nothing usable). There is no shortcut: every question stem, choice,
and passage word has to be transcribed by eye directly from the rendered
page image (`allinone/public/ybm/<test-id>/rc-pNN.jpg` / `lc-pNN.jpg`), at
roughly the per-question cost the answer-key grid transcription in the
`toeic-maker` skill's Part 1 already budgets for — just spread across ~194
questions instead of 100 grid cells. Don't assume a YBM content file costs
the same effort as a Hacker one; there's no `pdftotext -layout` step to lean
on here, and no glyph-substitution risk to check for either (the risk that
exists instead is a plain misread of a scanned character — re-read anything
ambiguous rather than guessing).

## `imageOnlyPages`

`{ [section]: N }` at the file's top level — how many *leading* pages of that
section's scanned booklet still belong to a part with no transcribed content
(just Part 1, for Listening, once Part 2 is done). `allinone/src/pages/YbmExam.jsx` uses this to cap the scanned-page viewer's Prev/Next and
preloading at page N instead of the section's full physical page count, and
to hand off into the first transcribed part once page N is reached —
otherwise a user paging through images would keep downloading and flipping
through later parts' raw scans (now redundant with the structured view) all
the way to the booklet's last page before finding any way forward. Find N by
looking directly at the rendered page images around where the last
untranscribed part ends. Omit the section's key entirely once every part in
that section is transcribed (Reading, once Parts 5-7 are all done, needs no
entry).

The same handoff also works in reverse: from the first transcribed unit of a
section, Prev jumps back into the image viewer at page N. Both directions
are generic over how many image-only vs. transcribed parts a section has —
they resolve "nearest part without/with content" rather than assuming a
fixed boundary, so no code changes are needed as more parts get transcribed
over time.

## Schema

One file per test, keyed by part number under `parts` (see
`allinone/src/data/ybm/manifest.js`'s `PARTS` for this collection's exact
question ranges — Part 2 is 7-31, Part 3 is 32-70, Part 4 is 71-100, Part 5
is 101-130, Part 6 is 131-146, Part 7 is 147-200):

- `parts["2"]`, `parts["3"]`, `parts["4"]`, `parts["5"]` — `{ type: "text-only", items: [{ number, stem, choices?: {A,B,C,D} }], graphics?: [...], batchSize?: N }`. No shared passage; Part 5's `stem` has the blank as `_______`. Parts 3/4 add an optional `graphics` array — see below. `batchSize` overrides the default of 3 standalone items per screen (see "Standalone item batching" below); Part 2 sets it to 25 so its one real "page" of content renders as one screen instead of nine.
- `parts["6"]` — `{ type: "passage-set", sets: [{ id, questions: [n,n,n,n], instruction, passage: {...}, items: [{ number, type?, choices }] }] }`. Each set's `passage.paragraphs` embeds inline blank tokens `[[131]]` etc. — the renderer (`allinone/src/pages/YbmReadingContent.jsx`) swaps these for a numbered badge. `items` omit `stem` (the blank position in the passage *is* the stem); the sentence-insertion item in each set carries `"type": "sentence"` so its choices render as full lines instead of single words — that's presentational only, scoring doesn't care.
- `parts["7"]` — `{ type: "passage-set", sets: [{ id, questions: [...], instruction, passages: [{...}, ...], items: [{ number, stem, choices }] }] }`. `passages` is 1-3 entries for single/double/triple-passage sets.

### Items with no `choices`

`choices` is optional on a `text-only` item. Omit it — as Part 2's items do —
when the book genuinely prints nothing to choose from for that question;
`YbmReadingContent.jsx`'s `QuestionItem` just skips rendering the choices
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
that as an entry in the part's `graphics` array: `{ questions: [n,n,n], passage: {...} }`. The renderer (`YbmReadingContent.jsx`'s `buildUnits`)
collapses those 3 items into one navigation unit around the shared passage,
the same way a Part 6/7 set does — even though only one of the three
questions actually says "Look at the graphic." Don't add a `graphics` entry
for a group whose table has no reason to render as one HTML block; leave
those items as ordinary standalone entries in `items`.

### Passage `kind`s

A `passage` object's shape varies by `kind` (`letter`, `email`, `memo`, `notice`,
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
folder, served through the same `getAssetUrl` helper `utils/ybm.js` already
exposes for page images. **Before reaching for `graphic`, check whether the
visual is actually just an unstyled table or list** (most "Look at the
graphic" prompts in these books are) — text renders sharper, is searchable,
and needs no crop-tuning or Drive upload step.

Because these crops live under `allinone/public/ybm/`, which is gitignored
like the rest of that pipeline's local assets, **a new `kind: "graphic"`
crop needs to be included the next time
`api/scripts/upload-ybm-assets.js` runs for that test** or it will 404 in
production even though it works in local dev.

## Answers stay in `keys/`

This schema never carries the correct answer — `utils/ybm.js`'s
`scoreAttempt` still reads `keys/<test-id>.json` exactly as it does for a
test with no transcribed content. Content and scoring are independent; a
content file with a bug never changes what counts as correct.

## Adding a test

1. Confirm `keys/<test-id>.json` and the rendered booklet images already exist (this is transcription, not digitization — see the `toeic-maker` skill's Part 1 for producing those first).
2. Read the rendered page images directly (`allinone/public/ybm/<test-id>/lc-pNN.jpg`, `rc-pNN.jpg`) — there is no `pdftotext` shortcut for this collection.
3. Transcribe part by part into the schema above, re-reading anything visually ambiguous rather than guessing.
4. Validate: every relevant question number appears exactly once across the transcribed parts' `items` (directly, or nested in a `sets[].items`/`graphics[]` group), and every item that has `choices` has all of them (4, or 3 for Part 2's own question-response range). A quick Node script with `require()` on the JSON and a duplicate/missing-number check catches most mistakes before they reach the app.
