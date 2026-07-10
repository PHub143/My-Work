# English Learning Section — Implementation Plan

Roadmap for growing `/learning/english` from the current starter scaffold into a
full TOEIC-style learning product with realistic practice tests, listening,
flashcards, and grammar drills. Follow the phases in order; each phase ships
independently and ends with the verification listed for it.

## Guiding rules (apply to every phase)

- **Realism first.** Test mode must mirror the real TOEIC Listening & Reading
  test (post-2016 format): part structure, question counts, option counts,
  timing, no instant feedback, single submit, review only after finishing.
  Study/drill modes may relax these rules; test mode may not.
- **Original content only.** Never copy questions from real ETS exams or paid
  prep books (copyright). All items are authored in-house in TOEIC *style*.
- **Reuse the engine.** Extend `allinone/src/utils/learning.js` with options
  (as done for `timeLimitMinutes` and `structuredControls`) instead of forking
  it. Keep changes backward-compatible with AI-103; run
  `node src/utils/learning.test.js` after every engine change.
- **Repo constraints.** JSX only (no TypeScript), plain CSS, ESM, HashRouter,
  lazy-loaded pages, student-gated routes under `LearningRoute`. Frontend
  content lives in `allinone/src/data/` until Phase 5 moves it to the DB.

## Real TOEIC reference format (target for test mode)

| Section | Part | Content | Questions | Options |
|---|---|---|---|---|
| Listening (~45 min) | 1 | Photographs | 6 | A–D (spoken) |
| | 2 | Question–Response | 25 | A–C (spoken, no text shown) |
| | 3 | Conversations (13 × 3) | 39 | A–D |
| | 4 | Short talks (10 × 3) | 30 | A–D |
| Reading (75 min) | 5 | Incomplete sentences | 30 | A–D |
| | 6 | Text completion (4 texts × 4) | 16 | A–D |
| | 7 | Reading comprehension (single 29, multi 25) | 54 | A–D |

Total: 200 questions, ~2 hours. Scoring: raw score per section converts to a
scaled 5–495 per section, 10–990 total.

---

## Phase 0 — Starter scaffold (DONE)

Shipped: routes `/learning/english` and `/learning/english/practice`, Navbar
entry, `englishContent.json` (30 starter questions: 12 grammar, 8 vocabulary,
10 reading), study page, practice page with Easy/Normal/Hard modes, engine
options `timeLimitMinutes` and `structuredControls`, tests.

Known gaps vs. real TOEIC (fixed in Phase 1): flat question list with no
part quotas; reading passages duplicated into every question's prompt; timer
values are arbitrary; no Part 6; no scaled scoring.

---

## Phase 1 — Realistic TOEIC Reading test (Parts 5–7) — DONE

Shipped: part-aware content model (1.1); engine additions with tests (1.2 —
`flattenReadingBank`, `getReadingBankSummary`, `getMaxReadingFormScale`,
`assembleReadingTest`, `getScaledReadingScore`, `getReadingTestResults`,
`getWeakestReadingTags`); practice UI with Full/Mini/Part modes, part
directions, passage panels, flag-for-review, scaled-score results (1.3); and
a complete 100-question bank at real quotas — 30 Part 5, 4×4 Part 6, 54
Part 7 with the authentic 29 single / 25 multi split (1.4). The full form
assembles 100 questions numbered 101–200 with a 75-minute limit. Further
Part 5/6/7 authoring now only adds variety between retakes.

**Goal:** test mode assembles and times a Reading section exactly like the
real exam: 30 × Part 5 + 16 × Part 6 + 54 × Part 7 = 100 questions in 75
minutes, with a scaled-score estimate at the end.

### 1.1 Content model upgrade (`englishContent.json`)

Restructure from a flat question list to part-aware banks:

```json
{
  "parts": {
    "part5": { "questions": [ { "id": "p5-001", "prompt": "...", "options": {...}, "answer": "B", "explanation": "...", "tags": ["verb-tense"] } ] },
    "part6": { "sets": [ { "id": "p6-001", "passage": "...text with [1]..[4] blanks...", "passageType": "e-mail", "questions": [ ...4 items, incl. one sentence-insertion item... ] } ] },
    "part7": {
      "singleSets": [ { "id": "p7-s01", "passages": [ { "type": "notice", "text": "..." } ], "questions": [ ...2-4 items... ] } ],
      "multiSets":  [ { "id": "p7-m01", "passages": [ {..}, {..} ], "questions": [ ...5 items... ] } ]
    }
  }
}
```

- Passages are stored **once per set** and rendered beside each question in
  the set (fixes the current duplication).
- Migrate the 30 existing questions: grammar + vocabulary → `part5`
  (they are already Part 5-style), reading → `part7.singleSets` (extract the
  shared passages).
- Question `tags` (grammar point / skill) are added now so Phases 3–4 can mine
  them.

### 1.2 Engine additions (`learning.js`, backward-compatible)

- `assembleReadingTest(content, { form })` — builds a 100-question form using
  real part quotas (30/16/54), sampling whole Part 6/7 *sets* (never splitting
  a passage's questions), shuffling within parts, numbering 101–200 like the
  real answer sheet.
- `getScaledReadingScore(rawCorrect)` — approximate raw→scaled (5–495)
  conversion table; label the output as an estimate.
- Support "partial forms": until the bank reaches full quotas, assemble
  proportionally (e.g. half-size mini test 50 Q / 37 min) and say so in the UI.
- Unit tests for both in `learning.test.js`.

### 1.3 Practice UI (`EnglishPractice.jsx`)

Replace Easy/Normal/Hard with real-world modes:

- **Full Reading test** — 100 Q / 75 min (or the largest partial form the bank
  supports), passage panel beside question, free navigation within the
  section, flag-for-review, single submit, auto-submit at 0:00.
- **Mini test** — half-size, 37 min.
- **Part practice** — one part only, untimed or timed per question budget
  (Part 5: 20 s/question is the common pacing advice; show pacing hints in
  results, not during the test).
- Results screen: raw score, scaled estimate, per-part accuracy, per-tag
  accuracy, review with explanations.

### 1.4 Content milestone

Author until one full form is possible: **30 Part 5 (have 20 equivalents),
4 Part 6 sets (16 Q), 54 Part 7 Q (~10 single sets + 5 multi sets; have 10 Q)**.
This is the bulk of the phase's effort; land it incrementally — the partial-form
assembler keeps the feature usable while the bank grows.

### Verification

`node src/utils/learning.test.js`, `npm run lint`, `npm run build`, then drive
a full test in the browser: timer counts down from 75:00, 100 questions,
passages render once per set, submit produces raw + scaled + per-part results.

---

## Phase 2 — Listening (Parts 1–4) — v1 DONE

Shipped: `englishListeningContent.json` (33 questions: 2 Part 1 + 10 Part 2 +
4×3 Part 3 + 3×3 Part 4) with per-segment transcripts and voice roles;
`scripts/generate-english-audio.mjs` (macOS `say` + `afconvert`, four accents,
82 clips ≈ 1.7 MB bundled in `src/assets/english/audio/`); listening engine
(`assembleListeningTest`, `getListeningBankSummary`, `getMaxListeningFormScale`,
`getScaledListeningScore`, `getListeningTestResults`, `getFullTestScore`) with
tests; `ListeningPlayer` (locked exam mode plays once / study mode replays);
`/learning/english/listening` page with audio-paced test flow (recording →
answer window → auto-advance → auto-submit), Part 1–4 practice modes with
transcripts in review; and the Full Test (Listening + Reading) chain with a
combined /990 estimate.

**Decision taken:** v1 bundles TTS audio as frontend assets instead of Drive
hosting — the content JSON references segment ids, so moving files to Drive
later only changes URL resolution, not content. Remaining for full realism:
grow the listening bank to 100 questions (see tracker), optionally re-record
with human voices, and host on Drive if the bundle grows too large.

### 2.1 Infrastructure (original notes)

- Store MP3 clips (and Part 1 photos) in a dedicated Drive folder; catalog them
  in Postgres via the existing `db:sync` flow, or reference Drive file IDs
  directly from the content JSON (decide when starting the phase; file IDs in
  JSON is the smaller first step).
- Reuse the existing authenticated file-streaming endpoint; confirm range
  requests work for `<audio>` seeking (seeking is allowed in study mode only).

### 2.2 Test-mode realism rules (the hard requirements)

- Audio plays **once**, no pause/seek/replay; the player is locked in test mode.
- Part 2 shows only "Mark your answer" with options A–C — the question and
  responses are audio-only.
- Fixed pacing: the recording drives the test — one master timeline per part,
  auto-advancing (~8 s gap between items like the real exam); the candidate
  answers while the audio moves on. Listening section ends when the audio ends
  (~45 min), then Reading unlocks.
- Study mode relaxes everything: replay, transcripts, per-question feedback.

### 2.3 Content model + engine

- `listening` banks mirroring 2.2: `part1` (photo + 4 statements), `part2`
  (25 Q, 3 options), `part3` (conversation sets × 3 Q, optional graphic),
  `part4` (talk sets × 3 Q). Each item references audio (and image) assets.
- `assembleListeningTest` with real quotas (6/25/39/30), numbering 1–100.
- `assembleFullTest` = Listening + Reading, 200 Q, combined 10–990 estimate.

### 2.4 Content milestone

Recording original audio is the bottleneck. Start with TTS-generated audio
(different voices per speaker) to unblock the feature, and treat human-recorded
audio as a quality upgrade later. Milestone: one partial listening form
(e.g. 2/10/12/9 = 33 Q) before building out the full 100.

### Verification

Browser-driven: play a listening section in test mode and confirm the player
cannot be paused/replayed, Part 2 hides text, auto-advance works, and audio
streams from Drive on both `npm run dev` (local API) and `npm run dev:prod`.

---

## Phase 3 — Vocabulary flashcards with spaced repetition — DONE

Shipped: `src/utils/vocab.js` (Leitner engine: 5 boxes at 0/1/3/7/14-day
intervals, due-card queue ordered hardest-first, daily streak, missed-word
mining, per-user localStorage persistence keyed `english.vocab.<userId>`) with
`vocab.test.js` (injected timestamps); `src/data/vocabDecks.json` (6 TOEIC
topic decks × 14 cards = 84 cards with definitions, examples, and Vietnamese
glosses — glosses decision: included, optional per card);
`/learning/english/vocabulary` page (deck grid, flip-card review sessions with
same-session reinsert of missed cards, streak counter); and the "Add N missed
words to Vocabulary" button on reading-test results, which mines wrong Part 5
answers into a personal "My Missed Words" deck. Remaining content work: grow
toward ~300 cards.

**Goal:** daily-use retention tool feeding off the test banks.

- **Decks** in `src/data/vocabDecks.json`, grouped by TOEIC topic (office,
  travel, finance, personnel...). Card: word, part of speech, definition,
  example sentence, optional Vietnamese gloss.
- **SRS:** Leitner boxes (5 boxes, intervals 0/1/3/7/14 days) — simpler than
  SM-2 and good enough. State in `localStorage` keyed by user id
  (`english.vocab.<userId>`), so multiple students on one browser don't
  collide.
- **Review flow:** front→flip→"Knew it / Didn't know it"; daily queue = due
  cards; streak counter.
- **Missed-words deck (integration):** after any Phase 1/2 test, offer "add
  words from questions you missed" — mines the `tags`/vocabulary of wrong
  answers into a personal deck.
- Route: `/learning/english/vocabulary`; entry from the English study page.

### Verification

Engine functions (`getDueCards`, `promoteCard`, `demoteCard`) unit-tested with
injected dates; browser check that state survives reload and per-user keys
isolate two accounts.

---

## Phase 4 — Grammar drills by topic — DONE

Shipped: drill engine in `learning.js` (`getDrillTopics`, `assembleDrill` —
Part 5 items filtered by tag, shuffled, up to 10 per drill) with tests;
`src/utils/progress.js` (per-user per-tag history keyed
`english.progress.<userId>`: `recordTagResults`, `getWeakestTopics`) with
tests; `/learning/english/drills` page (topic multi-select with bank counts
and personal accuracy, untimed drill with instant feedback + explanation
after each answer, per-topic summary); per-tag history recorded automatically
when reading/listening tests are submitted; "Weakest topics" report on the
English study page with a one-click "Drill weakest topics" shortcut (passes
`state.tags`, drill auto-starts); and 93 new Part 5 items (p5-031–p5-123)
bringing every drill topic to 10+ questions (13 topics, 123 Part 5 items).

**Goal:** targeted weakness training between full tests.

- Reuse Part 5 items via their `tags` (verb tense, prepositions, word forms,
  agreement, conjunctions, relative clauses, comparatives...). Authoring for
  this phase means broadening tag coverage (~10+ items per topic), not a new
  format.
- **Drill mode** (deliberately unlike test mode): pick topic(s) → untimed →
  instant feedback after each answer with explanation → summary with per-topic
  accuracy. Uses the existing single-question components.
- **Weakness report:** combine drill history + Phase 1/2 per-tag results into
  "your weakest topics" on the English study page; one click starts a drill on
  them. History in `localStorage` until Phase 5.
- Route: `/learning/english/drills`.

### Verification

Lint/build plus a browser pass: instant feedback shows, per-topic stats
accumulate, weakest-topic shortcut launches the right drill.

---

## Phase 5 — Persistence, progress, and content management

**Goal:** results survive devices; content stops requiring code deploys.

- **Backend:** `PracticeResult` model in `api/prisma/schema.prisma`
  (userId, kind: full/reading/listening/mini/drill, raw, scaled, per-part and
  per-tag JSON, duration, createdAt) + authenticated `POST/GET
  /learning/results` endpoints. Coordinate shapes across both subprojects per
  the root fullstack contract. Migrate localStorage history on first login.
- **Dashboard** on the English study page: score trend vs. a user-set target
  (e.g. 750), tests taken, per-part trend, vocab streak.
- **Content in DB (optional, last):** move question banks to Postgres with an
  admin CRUD screen (`AdminRoute`), so new questions/audio don't need a
  frontend deploy. JSON banks remain the seed/import format.
- **Prisma safety:** schema changes via `npx prisma generate` + reviewed
  migration; never `npm run build` in `api/` against real data
  (`--accept-data-loss`).

### Verification

Backend: endpoint exercised with a JWT via curl against a safe dev DB (state
clearly if no safe DB/env is available). Frontend: dashboard renders history;
results POST after a finished test; lint/build both subprojects.

---

## Phase order rationale & decision points

1 → 2 build the realistic test (reading first: no asset pipeline needed);
3 → 4 add the retention loop reusing the banks; 5 hardens everything. Each
phase is independently shippable.

Decisions to confirm when reaching them:
- **Phase 2:** Drive file IDs in JSON vs. DB-cataloged audio; TTS vs. recorded
  voices for v1.
- **Phase 3:** include Vietnamese glosses or English-only.
- **Phase 5:** whether content CRUD is worth it vs. staying JSON-based.

## Content authoring tracker

| Bank | Needed for full form | Have | Phase |
|---|---|---|---|
| Part 5 items | 30+ (60+ for variety) | 180 ✓ | 6 |
| Part 6 sets | 4+ (16 Q) | 8 (32 Q) ✓ | 6 |
| Part 7 single sets | ~10 (29 Q) | 20 (47 Q) ✓ | 6 |
| Part 7 multi sets | 5 (25 Q) | 10 (50 Q — 4 double + 6 triple) ✓ | 6 |
| Part 1 photo items | 6+ | 6 ✓ | 6 |
| Part 2 items | 25+ | 25 ✓ | 6 |
| Part 3 conversation sets | 13+ | 13 (39 Q) ✓ | 6 |
| Part 4 talk sets | 10+ | 10 (30 Q) ✓ | 6 |
| Vocab cards | ~300 across decks | 300 (10 decks × 30) ✓ | 6 |
| Tagged drill items | ~10 per topic × 10 topics | 13 topics × 10+ ✓ | 4 |

---

## Phase 5 execution plan — Progress persistence

Ship this phase in thin fullstack slices. Keep JSON content and localStorage
working while the backend comes online, then migrate state opportunistically
after login. Do **not** start with content CRUD; result persistence and
dashboard reliability are the useful product step.

### 5.1 Backend result storage

Add a `PracticeResult` model and minimal authenticated endpoints.

Suggested Prisma shape:

```prisma
model PracticeResult {
  id        String   @id @default(cuid())
  userId    String
  kind      String
  raw       Int?
  scaled    Int?
  total     Int?
  duration  Int?
  perPart   Json?
  perTag    Json?
  payload   Json?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId, createdAt])
  @@index([userId, kind])
}
```

Endpoint contract:

- `POST /learning/results` stores one completed activity result for the
  authenticated user.
- `GET /learning/results?kind=reading&limit=20` returns newest-first results
  for the authenticated user.
- Response shape should be stable and boring:

```json
{
  "results": [
    {
      "id": "result-id",
      "kind": "reading",
      "raw": 82,
      "scaled": 405,
      "total": 100,
      "duration": 4380,
      "perPart": { "part5": { "correct": 25, "total": 30 } },
      "perTag": { "word-forms": { "correct": 8, "total": 10 } },
      "createdAt": "2026-07-09T00:00:00.000Z"
    }
  ]
}
```

Keep `payload` for review metadata that should not become first-class columns
yet, such as form id, missed question ids, answer map, or local migration
source.

### 5.2 Frontend result client

Add a small API wrapper in the frontend instead of wiring `fetch` calls directly
inside pages.

Recommended helper surface:

- `saveLearningResult(result)` — best-effort POST; returns `{ ok, result?,
  error? }`.
- `getLearningResults({ kind, limit })` — authenticated GET; returns an empty
  array on unauthenticated or unavailable API states that the UI already knows
  how to describe.
- `normalizeLearningResult(localResult)` — converts existing reading,
  listening, drill, and vocab summary shapes into the backend contract.

Result saves should happen after:

- Reading full/mini/part tests submit.
- Listening tests submit.
- Full Listening + Reading test completes.
- Grammar drill summary completes.

Failed saves must not break the test-completion flow. Show the result screen
first; persistence is a progressive enhancement.

### 5.3 Local migration

On first authenticated visit to `/learning/english`, migrate useful local
history into the backend.

Migration rules:

- Track completion with a per-user localStorage key such as
  `english.progressMigration.<userId>`.
- Upload only compact summaries, not every review interaction.
- Preserve existing localStorage data after migration so offline/local use still
  works.
- Deduplicate by a stable local id when available; otherwise include
  `payload.migratedAt` and tolerate duplicates in v1.

Start with drill/tag history and finished-test summaries. Vocab card state can
stay local until Phase 6 unless the dashboard needs cross-device streaks.

### 5.4 Dashboard v1

Replace the English study page's static progress area with a real dashboard fed
by backend results when available and localStorage fallback otherwise.

Dashboard cards:

- Latest score: last reading/listening/full test result.
- Target progress: user-set target score stored locally first, backend later.
- Trend: last 5 scaled scores for reading/full tests.
- Weakest parts: lowest per-part accuracy from recent results.
- Weakest topics: reuse `getWeakestTopics` from local progress plus backend
  `perTag` summaries.
- Vocab streak: keep reading from the existing vocab engine.

Avoid creating a heavy charting dependency for v1. A compact sparkline or simple
table is enough and easier to keep readable on mobile.

### 5.5 Verification checklist

Backend:

- `npx prisma generate`
- Safe migration against a dev database only.
- Authenticated `POST /learning/results` with a reading result fixture.
- Authenticated `GET /learning/results` returns only the current user's rows.
- Unauthenticated calls fail consistently with the existing auth pattern.

Frontend:

- `node src/utils/learning.test.js`
- `node src/utils/progress.test.js`
- `node src/utils/vocab.test.js`
- `npm run lint`
- `npm run build`
- Browser pass: finish a mini reading test, confirm result renders immediately,
  result POST succeeds, dashboard updates after reload.

If backend env vars or a safe database are missing, complete the frontend with
mock/fallback behavior and document the blocked backend verification explicitly.

---

## Phase 6 — Content expansion and quality pass

**Goal:** move from "functional TOEIC-style product" to a more repeatable study
tool with enough variety that retakes feel fresh.

### 6.1 Listening bank to full form — DONE

Shipped in Phase 6 kickoff: `englishListeningContent.json` now supports one
full Listening form at real quotas — 6 Part 1 photo items, 25 Part 2 items, 13
Part 3 conversation sets (39 Q), and 10 Part 4 short-talk sets (30 Q). Added
six Part 1 image assets and generated all referenced TTS audio clips. The
original SVG placeholders were later supplemented with generated photo-style
JPG assets (`l1-001-photo.jpg` through `l1-006-photo.jpg`) for more realistic
TOEIC Photograph practice.
`listeningContent.test.js` verifies the quotas and asset references.

Original target:

- Part 1: 6 photo items.
- Part 2: 25 question-response items.
- Part 3: 13 conversation sets, 39 questions.
- Part 4: 10 short-talk sets, 30 questions.

Keep the current TTS pipeline until the full bank exists. After the bank is
complete, decide whether to re-record only the most-used clips with human voices
or replace all audio in one pass.

### 6.2 Reading form variety — DONE

The current reading bank supports one full form. Add enough alternate material
to prevent memorization:

- Part 5: target 180+ items across existing tags. **Current: 180 items.**
- Part 6: target 8–12 sets. **Current: 8 sets / 32 questions.**
- Part 7 single: target 20+ sets. **Current: 25 sets / 58 questions.**
- Part 7 multi: target 10+ sets. **Current: 10 sets / 50 questions.**

Assembler rule for variety: avoid reusing the same set/question from the user's
last completed form when enough alternatives exist.

Phase 6 reading expansion shipped so far: added four Part 6 workplace text
completion sets (`p6-005` through `p6-008`), nine Part 7 single-passage sets
(`p7-s12` through `p7-s20`), five Part 7 multi-passage sets (`p7-m06`
through `p7-m10`), and 57 Part 5 items across the existing grammar and
vocabulary tags. Added `readingContent.test.js` to verify reading bank counts,
unique ids, valid answer keys, tags, explanations, Part 6 blank references,
and cross-reference coverage in multi-passage sets.

### 6.3 Fixed Test 2 — DONE

Shipped a second complete, non-overlapping TOEIC-style form. The test chooser
now exposes Test 1 and Test 2 as separate Full, Listening, and Reading tests.
The fixed-form assembler preserves the real quotas and numbering for both:

- Listening Test 2: 6 new Part 1 photographs, 25 Part 2 items, 13 Part 3
  conversations (39 Q), and 10 Part 4 talks (30 Q).
- Reading Test 2: a disjoint selection of 30 Part 5 items, four Part 6 sets
  (16 Q), 29 single-passage Part 7 questions, and 25 multi-passage Part 7
  questions.
- Added five single-passage sets (`p7-s21` through `p7-s25`) to complete the
  second 29-question single-passage pool.
- Added six generated photo assets (`l1-101-photo.jpg` through
  `l1-106-photo.jpg`) and generated every referenced Test 2 TTS segment.
- Test results record `formNumber` in their payload so Test 1 and Test 2 can be
  distinguished in stored history.
- Automated tests verify both forms contain 100 questions per section, meet
  the 6/25/39/30 and 30/16/54 quotas, share no question ids, and reference
  existing audio/photo assets.

### 6.4 Vocabulary growth — DONE

Grew `vocabDecks.json` from 84 cards to 300 cards: 10 TOEIC workplace decks
with 30 cards each. Added `vocabContent.test.js` to verify deck/card counts,
unique ids, and complete card fields.

Priority decks:

- Hiring and personnel.
- Meetings and events.
- Travel and hospitality.
- Purchasing and invoices.
- Facilities and maintenance.
- Marketing and customer service.
- Manufacturing and logistics.

Each card should keep the existing shape: word, part of speech, definition,
example, Vietnamese gloss. Avoid rare words unless they appear naturally in
TOEIC workplace contexts.

### 6.5 Review quality

Do a content QA pass before adding more features:

- Explanations should teach the rule, not merely restate the correct answer.
- Distractors should be plausible but unambiguous.
- Passage questions should be answerable from the passage only.
- Listening transcripts should match audio exactly.
- Part 2 must never reveal the prompt/responses during test mode.

Automated QA now covers the main content risks: reading bank quotas and answer
keys, Part 6 blank references, Part 7 multi-passage cross-reference coverage,
listening quotas and asset references, and vocabulary deck/card shape.

### Verification

Run the full frontend test suite and manually complete:

- One full listening test.
- One full reading test.
- One full chained Listening + Reading test.
- One vocab review session.
- One weakest-topic drill launched from the dashboard.

---

## Phase 7 — Admin content workflow (optional)

**Goal:** reduce code-deploy friction for adding TOEIC content once the product
behavior is stable.

Do this only after Phase 5 persistence and Phase 6 content QA. Admin CRUD before
then risks turning unstable JSON shapes into database debt.

### 7.1 Import-first backend — IMPORT SNAPSHOT DONE

Start with import/export rather than hand-built CRUD screens:

- Keep JSON banks as the source-of-truth format. **Started:** added
  `allinone/scripts/validate-english-content.mjs` plus npm aliases
  `content:validate` and `content:export`.
- Add backend import scripts that validate and load reading, listening, vocab,
  and audio metadata into Postgres. **Shipped:** added `ContentSnapshot` in
  Prisma plus `api/scripts/import-english-content.js`, wired as
  `npm run content:import` and `npm run content:import:dry-run`. The script
  runs the frontend validation/export gate first, computes a stable checksum,
  and upserts a published `english` snapshot.
- Add export scripts so DB content can be reviewed in git-friendly JSON.
  **Started:** frontend export writes a normalized schema-versioned snapshot;
  DB export is the next slice if snapshots need git review after editing.
- Validate quotas, duplicate ids, answer keys, missing tags, and missing audio
  references before writing. **Started:** the frontend source-data validator
  now checks reading quotas/answer keys/tags, Part 6 blank references, Part 7
  multi-passage cross-reference coverage, listening quotas/audio/photo assets,
  and vocabulary deck/card shape.

Current imported snapshot checksum:
`40feb06b4071df8617f9a88f3137e0073c30d3bb749e439a09be00ef26e2a298`.

Latest published snapshot API shipped:

- `GET /learning/content/latest` returns the latest published English snapshot
  with payload by default.
- `GET /learning/content/latest?includePayload=false` returns metadata and
  summary only for lightweight checks.
- Added backend service/controller tests around response shape, query
  validation, payload omission, and latest published snapshot selection.

Frontend DB-content fallback shipped:

- Added `useEnglishContent()` / `fetchLatestEnglishContent()` in
  `allinone/src/utils/englishContent.js`.
- English dashboard, Reading practice, Listening practice, Grammar drills, and
  Vocabulary now read from the latest published DB snapshot when available.
- Bundled JSON remains the first render and offline/API-unavailable fallback.
- Practice sessions do not reset mid-attempt when a late API response arrives;
  retries use the latest loaded content.

Admin content preview/list shipped:

- Added `/content` behind `AdminRoute` with a compact inventory dashboard for
  the active English snapshot.
- The screen uses the same DB-backed `useEnglishContent()` loader as learners,
  so it previews the latest published snapshot and falls back to bundled JSON.
- Added content flattening/filter helpers plus tests for reading, listening,
  and vocabulary inventory counts.
- Filters cover bank, part/deck, tag, and search across prompts, answers,
  passages, transcripts, and vocabulary metadata.

Draft/edit/publish workflow shipped:

- Added admin-only backend endpoints for snapshot listing, snapshot fetch,
  export, draft creation, draft update, validation, and publish.
- Drafts are stored as `ContentSnapshot` rows with `status: "draft"`; learners
  still read only `status: "published"` through `/learning/content/latest`.
- Publishing recomputes the stable checksum and reuses an identical published
  snapshot when one already exists, archiving the duplicate draft instead of
  creating repeated published rows.
- Added a schema-level JSON editor on `/content` for draft payload edits, with
  save, validate, export, and publish actions plus live inventory/preview from
  the selected snapshot.
- Added field editors for Part 5 questions, Part 6 sets, Part 7 single/multi
  sets, listening items/sets, and vocabulary cards. These update the draft
  payload and reuse the same save, validate, and publish workflow.
- Added a Part 1 photo reference picker and audio-reference visibility for
  listening segments. Segment ids stay stable because they map directly to
  bundled audio files.
- Generated six realistic Part 1 practice photos with the built-in imagegen
  tool, optimized them as project JPG assets, updated listening content
  references, and expanded the listening page image loader to support raster
  formats.
- Added validation reports before publish and focused backend/frontend tests for
  the draft workflow.
- Added a backend workflow regression test that covers clone, edit, validate,
  publish, and latest-published selection.
- Strengthened source content QA for duplicate option text and thin
  explanations; fixed `p5-167` with a fuller relative-pronoun explanation.

Remaining polish: optional Drive-backed media browsing can replace the current
content-derived photo/reference picker if listening assets move out of the
frontend bundle.

### 7.2 Admin UI

Add an `AdminRoute` screen only after import/export is reliable.

Minimum useful screens:

- Content list with filters by type, part, tag, and publish status. **Shipped
  at `/content`.**
- Question/set editor with preview. **Shipped with field editors for reading,
  listening, and vocabulary plus JSON fallback.**
- Audio/photo reference picker. **Shipped for Part 1 photos, with stable audio
  references shown beside transcript segment edits.**
- Validation report before publish. **Shipped.**

Keep test assembly reading from a published content snapshot so students never
see half-edited content.

### Verification

Import seed JSON into a dev DB, export it back, and diff normalized output.
Create or clone one draft in the admin UI, validate it, publish it, and confirm
it appears in practice assembly without changing public response shapes.

Latest verification completed:

- `npm run content:validate`
- `npm run lint`
- `npm run build`
- Frontend content/admin `node:test` suite
- Backend learning content controller/service `node:test` suite
- Dev-server smoke check at `http://127.0.0.1:5173/My-Work/allinone/`
- Imported published DB snapshot
  `cmrefdngu0000cikoxo9s4vvc`

---

## Updated content targets

| Bank | Minimum full form | Variety target | Current | Next action |
|---|---:|---:|---:|---|
| Part 5 items | 30 | 180+ | 180 ✓ | Optional: add advanced mixed-tag items |
| Part 6 sets | 4 | 8–12 | 8 ✓ | Optional: add 4 more for deeper rotation |
| Part 7 single sets | ~10 | 20+ | 20 ✓ | Optional: add higher-difficulty inference sets |
| Part 7 multi sets | 5 | 10+ | 10 ✓ | Optional: add more triple-passage inference sets |
| Part 1 photo items | 6 | 12+ | 6 ✓ | Optional: add alternate photo prompts |
| Part 2 items | 25 | 50+ | 25 ✓ | Optional: add alternate Q-response items |
| Part 3 conversation sets | 13 | 20+ | 13 ✓ | Optional: add alternate conversation sets |
| Part 4 talk sets | 10 | 16+ | 10 ✓ | Optional: add alternate short talks |
| Vocab cards | 300 | 500+ | 300 ✓ | Optional: grow long-term deck depth |
