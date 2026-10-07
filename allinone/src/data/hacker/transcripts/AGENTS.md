# AGENTS.md — `src/data/hacker/transcripts/`

Listening scripts for Hacker tests, one `<test-id>.json` per test. The exam
(`pages/HackerExam.jsx`) shows the entry for the focused Listening question
**after Submit**, under the audio player; a test with no file here just shows
no panel. Same feature and shape as YBM's `data/ybm/transcripts/`.

## Source and how these were made

Both volumes come from a `… LISTENING TRANSCRIPT.pdf` in the source folder
(outside the repo): `Bộ đề 1 (HACKER 2)/HACKER 2 LISTENING TRANSCRIPT.pdf` and
`Bộ đề 2 (HACKER 3)/LC/HACKER 3 LISTENING TRANSCRIPT.pdf`. Unlike YBM's
photographed script books they have a **real text layer**, so the files are
*generated*, not read by eye:

```bash
python3 scripts/hacker/build-transcripts.py            # all of Vol 2 -> this folder
python3 scripts/hacker/build-transcripts.py --vol 3 --pdf "<…/HACKER 3 LISTENING TRANSCRIPT.pdf>"
python3 scripts/hacker/build-transcripts.py --out /tmp/x 3   # one test, dry run
```

The script needs only `pdftotext`. It prints a warning list (and exits 1) if a
test does not tile Q1-100 in 54 entries. Re-running overwrites these files, so
**edit the script or the generated output deliberately, never both by hand
without re-running**. The page template the script relies on (an answer-key page
opens each 6-page test block — headed "TEST NN Answer Keys" in Vol 2, just
"TEST NN" in Vol 3 — two columns, Korean accent icons) is verified on Vols 2 and
3; check any other volume's PDF before trusting it.

How the output was checked, per volume (all ten tests each): every word compared
with an independent OCR of the rendered pages (Vol 2: 34,705 words, one
difference, an OCR slip; Vol 3: 35,004 words, differences were a letter-spaced
phrase and OCR apostrophe handling); each of the 540 entries scored for in-order
text against that OCR (mean 98% in both); the listening keys re-read against the
answer key printed at the head of each test in the same PDF (2,000/2,000 match
across the two volumes); a handful of pages checked by eye.

## Schema

```jsonc
{ "testId": "vol-2-test-01",
  "entries": [
    { "from": 1,  "to": 1,  "lines": ["(A) He's facing a closed window.", "(B) …", "(C) …", "(D) …"] },
    { "from": 7,  "to": 7,  "lines": ["Br|Does the cleaning service send us monthly bills?", "Au|(A) Yes, on the 1st.", "(B) …", "(C) …"] },
    { "from": 32, "to": 34, "lines": ["W-Am|Hello. My name is Vanessa Johnson, …", "M-Cn|What mistake did you discover, Ms. Johnson?"] },
    { "from": 71, "to": 73, "lines": ["Br|Good afternoon, Mr. Jackson. This is Claudia Omar, …"] } ] }
```

- **54 entries tile Q1-100 exactly once**: Parts 1-2 one entry per question
  (6 + 25), Parts 3-4 one per set of three (13 + 10).
- A line is `"Speaker|text"` for a spoken line, or a plain `"(A) text"` choice /
  photo description. The exam parses the tag with `parseTranscriptLine` in
  `utils/hacker.js` (1-3 letters, optionally `-` plus 2-3 letters) and
  highlights the `(X)` line matching the answer key, so keep the `(A)` prefix.
- English only, as printed, with straight quotes, `...` for the book's spaced
  ". . .", and `A.M.`/`P.M.` (the book prints them in small capitals).

### Speaker tags differ from YBM's

The Hacker script prints only an **accent** for each speaker (a Korean icon
line such as `미국식 발음 → 호주식 발음`: American -> Australian), in speaker
order — no gender except where a conversation labels turns `M:` / `W:`.

| Part | Printed | Tag used |
|---|---|---|
| 1 | one accent (narrator) | none — four untagged `(A)…(D)` lines |
| 2 | two accents: question, then answer | `Br\|question`, `Au\|(A) …`, then untagged `(B)`, `(C)` |
| 3 | `M:` / `W1:` / `W2:` + one accent per speaker, in order of first appearance | `W-Am`, `M-Cn`, … (gender from the label, accent from the icon) |
| 4 | one accent, no gender | `Cn\|whole talk` |

`Am` American, `Br` British, `Au` Australian, `Cn` Canadian. Parts 2 and 4
carry the accent alone because the book does not say whether the voice is a man
or a woman — don't invent a gender to match YBM's `W-Br`.

## Known source quirks (already handled by the script)

- The first letter of a turn is sometimes split from its word in the text
  layer ("H ello", "A bsolutely"); the script rejoins it. "A"/"I" openings were
  decided by hand — see `SPLIT_A` in the script.
- Small-cap times arrive as `p . m .`, and one `TT Radio` arrives as `T T`.
- The text layer decomposes `é`; output is NFC.
- Vol 2 test 5 prints "Question 92-94" (singular) in a header.
- Vol 3 test 3 Q44-46 prints one phrase letter-spaced, so the text layer spaces
  every letter ("s h o u l d …"); fixed via `SPACED_FIXES` in the script, which
  also warns about any other such run. One italic title left "Herald ?" with a
  stray space before the question mark (cleaned generically).
- Vol 3 test 4's booklet is missing Listening Q65-82 (see `../content/`), but the
  script PDF is complete, so its transcript covers all 100 questions.
- Choices can run over a column or page break (test 5 Q22): the parser reads
  left column then right column across pages, so this is handled.
