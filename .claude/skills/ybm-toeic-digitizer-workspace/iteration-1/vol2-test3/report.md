# Vol 2 Test 3 digitization report

## 1. Page ranges found

| Section | Range (1-indexed, inclusive, absolute PDF pages) | Page count |
|---|---|---|
| Listening (`lc 1000 - 2.pdf`) | `[47, 58]` | 12 |
| Reading (`rc 1000 - 2.pdf`) | `[81, 110]` | 30 |

Method: TOC-based formula, confirmed directly, exactly as the skill describes.

1. Found each combined PDF's own "CONTENTS" page (LC at PDF page 16, RC at PDF page 16 too) listing `TEST 03` at printed footer page **32** (LC) and **66** (RC).
2. Derived the offset empirically from the three already-mapped tests (1, 2, 5) rather than trusting the skill's own worked example of `+14` (that example was for a different volume/edition, and the skill explicitly warns not to reuse it). Using the existing `render-pages.mjs` ranges:
   - LC: content_start = footer + 15 (test1: 4→19 ✓, test2: 18→33 ✓, test5: 60→75 ✓)
   - RC: content_start = footer + 15 (test1: 4→19 ✓, test2: 36→51 ✓, test5: 128→143 ✓)
   - Test 3 predicted: LC content start = 32+15 = 47, RC content start = 66+15 = 81.
3. Rendered the predicted pages plus neighbors at `-r 100` and confirmed by eye: page before predicted start = "LC"/"RC" divider, page at predicted start-1 = "TEST 3" cover, predicted start = "LISTENING TEST"/"READING TEST" instructions box with the expected footer number (32 / 66) printed on it. Exact match both times, no fallback search needed.
4. For the end of each section, did **not** assume 12/30 pages just because that matched tests 1, 2, or 5 — rendered forward from the predicted next-test cover (found via the TOC footer for TEST 04: LC=46, RC=98, same +15 offset) and walked backward to find "This is the end of the Listening test." / "Stop! This is the end of the test." on the actual last content page, then confirmed the immediately following pages were divider + next cover, not more content. LC landed at 12 pages (matches 1/2/5), RC landed at 30 pages (matches 1/5, *not* test 2's 28 — confirms the skill's warning that length varies and must be checked per test, not inferred from a neighbor).
5. Rendered the actual output via `render-pages.mjs` and spot-checked `lc-p01.jpg`, `lc-p12.jpg`, `rc-p01.jpg`, `rc-p30.jpg` — all four are exactly the instructions page / end-of-test page, not off by one.

## 2. Skill feedback (gaps found while following it literally)

Overall the skill was followable end-to-end with no blocking gaps — but a few things were unclear or worth tightening:

- **The `+14` worked example is a trap if taken literally.** The skill explicitly says "re-derive this constant per book, don't reuse `+14` for a different volume/edition" — good — but the example page numbers used (`TEST 01 4, TEST 02 18, TEST 03 32`) are *exactly* the numbers in this actual Vol 2 LC book. Because the offset actually is `+15` (content start), not `+14` (cover), for this book, a reader who skims and reuses "+14" instead of re-deriving would land one page early (on the cover, not the content start) — a real off-by-one risk given the skill's own emphasis on precision.

- **No guidance on how to *locate* the answer-key grid page efficiently.** The skill says the grid is "typically the first page of that test's explanation block," but gives no way to jump to it other than implying you already know where the explanation section starts. In practice this took several rendering rounds (find the "정답·해설" cover manually, find Test 1's grid, find Test 2's grid to learn the per-test block length, extrapolate to Test 3, confirm). A future iteration should record the discovered explanation-block page-length once found so the next test doesn't rediscover it from scratch.

- **The RC tail-appendix key is genuinely much faster/safer, as promised** — worth calling out as a positive, and worth promoting to the *first* thing to try (not an equal alternative) when both sources exist for RC. It rendered clearly even at low res, needed no cropping, and its "descending order, one page per test" rule predicted the exact page on the first try.

- **No cross-check step is prescribed** for a value this load-bearing (an answer key silently scores every future attempt). Did this informally (re-cropped and re-read a column as a second pass, rendered at two resolutions) but the skill doesn't ask for it, so it would be easy to skip under time pressure.

- Everything else (render-pages.mjs pageRanges shape, the validation test command, the audio re-encode command, the upload script's behavior around Drive permissions, the curl verification sequence) matched reality exactly as documented. No corrections needed there.

## 3. Verification results

**Lint** — clean, no errors.

**Unit tests** (`node --test src/utils/ybm.test.js`), run twice — all 15 passed both times.

**Build** — succeeded in 6.59s. Only pre-existing warnings unrelated to this change.

**Upload** (`node scripts/upload-ybm-assets.js vol-2-test-03`) — succeeded, 43 files uploaded, `api/data/ybm-assets/vol-2-test-03.json` written. Confirmed no public/"anyone with link" permission granted (read the script source before running — it only calls `drive.files.create`, no `permissions.create`).

**Curl verification** — all boundaries exact:
```
GET /ybm/vol-2-test-03/lc-p01.jpg      → 200, image/jpeg, byte-identical to local file
GET /ybm/vol-2-test-03/listening.mp3   → 200, audio/mpeg
GET /ybm/vol-2-test-03/rc-p30.jpg      → 200, byte-identical
GET /ybm/vol-2-test-03/rc-p31.jpg      → 404
GET /ybm/vol-2-test-03/lc-p13.jpg      → 404
```

**Bonus browser check**: YBM screen shows "4 of 10 ready," Test 03 "Not started / LC 100 · RC 100," Tests 04/06-10 still correctly "Not available."

**Audio**: source 2810.4s (~46.8 min); re-encoded (64kbps mono) 2816.9s (~46.9 min, unchanged), 44.99MB → 22.66MB.

## 4. Final git status

```
Changes not staged for commit:
	modified:   allinone/src/data/ybm/manifest.js
	modified:   scripts/ybm/render-pages.mjs

Untracked files:
	.claude/skills/
	allinone/src/data/ybm/keys/vol-2-test-02.json
	allinone/src/data/ybm/keys/vol-2-test-03.json
	api/data/ybm-assets/vol-2-test-02.json
	api/data/ybm-assets/vol-2-test-03.json
```
Only small JSON/code diffs, no binaries. No commits made.

## 5. Time / effort estimate

~45-60 minutes of agent time, ~75 tool calls. Roughly **27% of all tool calls** were spent specifically on finding and transcribing the two answer-key grids — the LC grid (explanations-section search) took roughly as many calls alone as the entire RC key (tail appendix, found on the first guess). Confirms the answer-key step is the most expensive part of the pipeline and the most likely to benefit from better tooling (e.g. a helper that renders/crops a candidate grid page at high-res in one shot instead of the current render-then-crop-then-verify manual loop).
